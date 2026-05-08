/**
 * Service metier des incidents.
 *
 * Role architectural:
 * - Gere les incidents manuels et les alertes Wazuh importees.
 * - Centralise filtres, pagination, normalisation, deduplication et emails.
 *
 * Flux Wazuh:
 * preview Wazuh -> mapAlertToIncident -> importMany -> verification externalId -> insertMany.
 */
// Model Mongoose des incidents.
const Incident = require('../models/Incident');
// Service email appele lors de la creation d'un incident critique/eleve.
const { sendIncidentAlert } = require('./emailService');
// Utilitaires de severite.
const { mapSeverity, normalizeRuleLevel, severityToRuleLevel } = require('../utils/severity');
// Utilitaires de requetes MongoDB.
const { addTextSearch, compactObject, createSearchRegex, parsePagination, parseSort } = require('../utils/query');

// Liste blanche des champs de tri acceptes depuis le frontend.
const allowedSortFields = ['title', 'severity', 'status', 'agentName', 'agentIP', 'host', 'port', 'timestamp', 'createdAt'];

// Normalise les champs tableau comme CVE ou MITRE.
const normalizeStringArray = (value) => {
  if (value === undefined) return undefined;
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// Convertit un port facultatif en nombre utilisable par MongoDB.
const normalizePort = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const port = Number(value);
  return Number.isFinite(port) ? port : undefined;
};

// Construit les filtres MongoDB a partir des query params.
const buildIncidentFilters = (query) => {
  let filters = {};

  if (query.severity && query.severity !== 'all') filters.severity = query.severity;
  if (query.status && query.status !== 'all') filters.status = query.status;
  if (query.source) filters.source = query.source;
  if (query.host) filters.host = createSearchRegex(query.host);

  if (query.agent) {
    const agent = createSearchRegex(query.agent);
    filters.$or = [{ agentName: agent }, { agentIP: agent }];
  }

  if (query.from || query.to) {
    filters.timestamp = {};
    if (query.from) filters.timestamp.$gte = new Date(query.from);
    if (query.to) filters.timestamp.$lte = new Date(query.to);
  }

  filters = addTextSearch(filters, ['title', 'description', 'agentName', 'agentIP', 'host', 'ruleId', 'cve', 'mitreTactic'], query.search);

  return filters;
};

// Normalise un incident manuel ou Wazuh avant insertion/mise a jour.
const normalizeIncidentPayload = (item, source = 'manual') => {
  const fallbackRuleLevel = severityToRuleLevel(item.severity);
  const normalizedRuleLevel = normalizeRuleLevel(item.ruleLevel, fallbackRuleLevel);

  return compactObject({
    title: item.title,
    description: item.description,
    ruleLevel: normalizedRuleLevel,
    severity: mapSeverity(normalizedRuleLevel),
    status: item.status || 'open',
    source: item.source || source,
    externalId: item.externalId,
    agentName: item.agentName,
    agentIP: item.agentIP,
    host: item.host,
    port: normalizePort(item.port),
    cve: normalizeStringArray(item.cve),
    solution: item.solution,
    timestamp: item.timestamp,
    winSystemLevel: item.winSystemLevel,
    winSystemTime: item.winSystemTime,
    ruleId: item.ruleId,
    mitreTactic: normalizeStringArray(item.mitreTactic) || [],
    mitreTechnique: normalizeStringArray(item.mitreTechnique) || [],
    raw: item.raw,
    vulnerability: item.vulnerability,
  });
};

// Liste paginee des incidents pour le frontend.
const getAll = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const { sort } = parseSort(query, allowedSortFields, 'timestamp');
  const filters = buildIncidentFilters(query);

  const [incidents, total] = await Promise.all([
    // Requete MongoDB de liste: exclut raw et allege la vulnerability peuplee.
    Incident.find(filters)
      .select('-raw')
      .populate({ path: 'vulnerability', select: '-raw' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Incident.countDocuments(filters),
  ]);

  return { data: incidents, total, page, pages: Math.ceil(total / limit) || 1 };
};

// Recupere le detail complet d'un incident et sa vulnerabilite liee.
const getById = async (id) => {
  const incident = await Incident.findById(id).populate('vulnerability');
  if (!incident) {
    const error = new Error('Incident not found');
    error.statusCode = 404;
    throw error;
  }
  return incident;
};

// Cree un incident manuel puis declenche une alerte email si necessaire.
const create = async (payload) => {
  const incident = await Incident.create(normalizeIncidentPayload(payload, 'manual'));
  await sendIncidentAlert(incident);
  return incident;
};

// Importe un lot d'alertes Wazuh selectionnees et evite les doublons par externalId.
const importMany = async (payload) => {
  const items = Array.isArray(payload.items) ? payload.items : payload;

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Provide an array of incidents to import.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedItems = items.map((item) => normalizeIncidentPayload(item, 'wazuh'));
  const externalIds = normalizedItems.map((item) => item.externalId).filter(Boolean);
  const existing = await Incident.find({ source: 'wazuh', externalId: { $in: externalIds } }).select('externalId');
  const existingIds = new Set(existing.map((item) => item.externalId));
  const newItems = normalizedItems.filter((item) => item.externalId && !existingIds.has(item.externalId));

  if (newItems.length > 0) {
    await Incident.insertMany(newItems, { ordered: false });
  }

  return {
    received: normalizedItems.length,
    imported: newItems.length,
    duplicates: normalizedItems.length - newItems.length,
  };
};

// Met a jour un incident existant apres normalisation.
const update = async (id, payload) => {
  const existing = await getById(id);
  const merged = { ...existing.toObject(), ...payload };
  const incident = await Incident.findByIdAndUpdate(id, normalizeIncidentPayload(merged, merged.source || 'manual'), {
    new: true,
    runValidators: true,
  }).populate('vulnerability');

  return incident;
};

// Change uniquement le statut d'un incident.
const updateStatus = async (id, status = 'closed') => {
  const incident = await Incident.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!incident) {
    const error = new Error('Incident not found');
    error.statusCode = 404;
    throw error;
  }
  return incident;
};

// Supprime un incident par id MongoDB.
const remove = async (id) => {
  const incident = await Incident.findByIdAndDelete(id);
  if (!incident) {
    const error = new Error('Incident not found');
    error.statusCode = 404;
    throw error;
  }
  return { message: 'Incident deleted' };
};

module.exports = {
  create,
  getAll,
  getById,
  importMany,
  remove,
  update,
  updateStatus,
};
