/**
 * Validateur des incidents.
 *
 * Role architectural:
 * - Controle les payloads incidents avant incidentController.
 * - Normalise les champs venant de formulaires ou imports Wazuh.
 */
// Severites reconnues par l'application.
const allowedSeverities = ['low', 'medium', 'high', 'critical'];
// Statuts autorises pour le cycle de vie d'un incident.
const allowedStatuses = ['open', 'closed', 'resolved'];

// Normalise les champs liste comme CVE, MITRE tactic/technique.
const normalizeStringArray = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// Convertit un champ optionnel en nombre.
const normalizeOptionalNumber = (value, field) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${field} must be a number.`);
  }
  return numericValue;
};

// Nettoie une chaine optionnelle.
const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

// Parse une date en refusant les valeurs invalides.
const normalizeDate = (value, field) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date.`);
  }
  return date;
};

// Supprime undefined pour conserver seulement les champs fournis.
const compactObject = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

// Valide et normalise un incident complet ou partiel.
const validateIncidentPayload = (payload, { partial = false } = {}) => {
  const body = payload || {};
  const title = normalizeOptionalString(body.title);

  if (!partial && !title) {
    // Le titre rend l'incident comprehensible dans les tables et emails.
    throw new Error('title is required.');
  }

  const severity = normalizeOptionalString(body.severity)?.toLowerCase();
  if (severity && !allowedSeverities.includes(severity)) {
    throw new Error(`severity must be one of: ${allowedSeverities.join(', ')}.`);
  }

  const status = normalizeOptionalString(body.status)?.toLowerCase();
  if (status && !allowedStatuses.includes(status)) {
    throw new Error(`status must be one of: ${allowedStatuses.join(', ')}.`);
  }

  return compactObject({
    title,
    description: normalizeOptionalString(body.description),
    ruleLevel: normalizeOptionalNumber(body.ruleLevel, 'ruleLevel'),
    severity,
    status,
    source: normalizeOptionalString(body.source),
    externalId: normalizeOptionalString(body.externalId),
    agentName: normalizeOptionalString(body.agentName),
    agentIP: normalizeOptionalString(body.agentIP),
    host: normalizeOptionalString(body.host),
    port: normalizeOptionalNumber(body.port, 'port'),
    cve: normalizeStringArray(body.cve),
    solution: normalizeOptionalString(body.solution),
    timestamp: normalizeDate(body.timestamp, 'timestamp'),
    winSystemLevel: normalizeOptionalString(body.winSystemLevel),
    winSystemTime: normalizeDate(body.winSystemTime, 'winSystemTime'),
    ruleId: normalizeOptionalString(body.ruleId),
    mitreTactic: normalizeStringArray(body.mitreTactic),
    mitreTechnique: normalizeStringArray(body.mitreTechnique),
    raw: body.raw,
    vulnerability: body.vulnerability,
  });
};

// Schema pour creation manuelle.
const createIncidentSchema = {
  validate(payload) {
    try {
      return { value: validateIncidentPayload(payload) };
    } catch (error) {
      return { error };
    }
  },
};

// Schema pour mise a jour partielle/complete.
const updateIncidentSchema = {
  validate(payload) {
    try {
      return { value: validateIncidentPayload(payload, { partial: true }) };
    } catch (error) {
      return { error };
    }
  },
};

// Schema pour changement de statut uniquement.
const updateIncidentStatusSchema = {
  validate(payload) {
    try {
      const status = normalizeOptionalString(payload?.status || 'closed')?.toLowerCase();
      if (!allowedStatuses.includes(status)) {
        throw new Error(`status must be one of: ${allowedStatuses.join(', ')}.`);
      }
      return { value: { status } };
    } catch (error) {
      return { error };
    }
  },
};

module.exports = {
  createIncidentSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
};
