/**
 * Service de synchronisation automatique Wazuh.
 *
 * Role architectural:
 * - Transforme les alertes Wazuh en incidents internes.
 * - Dedoublonne par externalId avant insertion MongoDB.
 */
// Model Mongoose des incidents.
const Incident = require('../models/Incident');
// Client Wazuh qui recupere les alertes brutes.
const { getWazuhAlerts } = require('./wazuhService');
// Convertit rule.level en severite applicative.
const { mapSeverity } = require('../utils/severity');

// Poller courant.
let poller = null;
// Verrou anti-concurrence.
let syncInProgress = false;

// Lit un entier d'environnement avec fallback.
const parseIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Extrait le niveau Wazuh d'une alerte.
const getAlertLevel = (alert) => Number(alert.rule?.level ?? alert.level ?? 0);

// Force une valeur simple en tableau pour MITRE tactic/technique.
const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Convertit une date Wazuh en Date JS valide.
const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
};

// Transforme une alerte Wazuh brute en document Incident interne.
const mapAlertToIncident = (alert) => {
  const level = getAlertLevel(alert);
  const title = alert.rule?.description || alert.description;
  const description = alert.full_log || alert.fullLog || alert.message || title;

  if (!title || !description) {
    // Sans titre/description, l'incident serait inutilisable pour l'analyste.
    return null;
  }

  return {
    title,
    description,
    ruleLevel: level,
    severity: mapSeverity(level),
    status: 'open',
    source: 'wazuh',
    externalId:
      alert.id || alert._id
        ? String(alert.id || alert._id)
        : `${alert.agent?.id || alert.agent?.name || 'agent'}-${alert.rule?.id || 'rule'}-${alert.timestamp || Date.now()}`,
    agentName: alert.agent?.name,
    agentIP: alert.agent?.ip,
    timestamp: parseDate(alert.timestamp || alert['@timestamp']),
    winSystemLevel: alert.data?.win?.system?.level,
    winSystemTime: parseDate(alert.data?.win?.system?.systemTime),
    ruleId: alert.rule?.id ? String(alert.rule.id) : undefined,
    mitreTactic: asArray(alert.rule?.mitre?.tactic),
    mitreTechnique: asArray(alert.rule?.mitre?.technique),
    raw: alert,
  };
};

// Synchronise une fois Wazuh vers MongoDB.
const syncWazuhAlerts = async () => {
  // Evite deux synchronisations simultanees.
  if (syncInProgress) {
    console.log('Wazuh sync skipped: previous sync still running');
    return { fetched: 0, inserted: 0, error: null, skipped: true };
  }

  syncInProgress = true;
  console.log('Wazuh sync started...');

  try {
    const minLevel = parseIntegerEnv('WAZUH_MIN_LEVEL', 0);
    console.log(`Fetching Wazuh alerts with min level: ${minLevel}`);
    
    const alerts = await getWazuhAlerts();
    console.log(`${alerts.length} alerts fetched from Wazuh`);

    const incidentsByKey = new Map();

    alerts.forEach((alert) => {
      // Filtre local par niveau minimum de criticite.
      if (getAlertLevel(alert) < minLevel) {
        return;
      }

      const incident = mapAlertToIncident(alert);
      if (!incident) {
        return;
      }

      const key = incident.externalId;
      // Deduplication en memoire avant requete MongoDB.
      if (!incidentsByKey.has(key)) {
        incidentsByKey.set(key, incident);
      }
    });

    const incidents = Array.from(incidentsByKey.values());
    console.log(`Unique incidents after deduplication: ${incidents.length}`);

    if (incidents.length === 0) {
      console.log('0 incidents inserted');
      return { fetched: alerts.length, inserted: 0, error: null };
    }

    const existingIncidents = await Incident.find({
      externalId: { $in: incidents.map((incident) => incident.externalId).filter(Boolean) },
      source: 'wazuh',
    }).select('externalId');

    const existingKeys = new Set(existingIncidents.map((incident) => incident.externalId));
    console.log(`Found ${existingKeys.size} existing incidents`);

    const newIncidents = incidents.filter(
      (incident) => incident.externalId && !existingKeys.has(incident.externalId)
    );
    console.log(`New incidents to insert: ${newIncidents.length}`);

    if (newIncidents.length > 0) {
      // Insertion MongoDB en lot des incidents vraiment nouveaux.
      await Incident.insertMany(newIncidents, { ordered: false });
    }

    console.log('Wazuh inserted documents:', newIncidents);
    console.log(`${newIncidents.length} incidents inserted`);
    return { fetched: alerts.length, inserted: newIncidents.length, error: null };
  } catch (error) {
    console.error('Wazuh sync failed:', error.message, error.stack);
    return { fetched: 0, inserted: 0, error: error.message };
  } finally {
    syncInProgress = false;
  }
};

// Demarre le polling periodique Wazuh.
const startWazuhPolling = () => {
  if (poller) {
    return poller;
  }

  const interval = parseIntegerEnv('WAZUH_POLL_INTERVAL', 60000);

  syncWazuhAlerts();
  poller = setInterval(syncWazuhAlerts, interval);

  return poller;
};

module.exports = {
  mapAlertToIncident,
  syncWazuhAlerts,
  startWazuhPolling,
};
