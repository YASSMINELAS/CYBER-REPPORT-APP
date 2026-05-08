/**
 * Service de synchronisation automatique Nessus.
 *
 * Role architectural:
 * - Peut lancer un polling periodique pour recuperer les scans Nessus.
 * - Reutilise vulnerabilityService.processScanResults pour deduplication et lifecycle.
 */
// Recupere les findings depuis Nessus.
const { getNessusScans } = require('./nessusService');
// Traite les resultats Nessus dans MongoDB.
const { processScanResults } = require('./vulnerabilityService');

// Reference du setInterval courant.
let poller = null;
// Verrou simple pour eviter deux synchronisations simultanees.
let syncInProgress = false;

// Lit un intervalle en millisecondes depuis l'environnement.
const parseIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Synchronise une fois Nessus vers MongoDB.
const syncNessusScans = async () => {
  // Condition importante: evite les imports concurrents qui pourraient creer des doublons.
  if (syncInProgress) {
    console.log('Nessus sync skipped: previous sync still running');
    return { fetched: 0, inserted: 0, error: null, skipped: true };
  }

  syncInProgress = true;
  console.log('Nessus sync started...');

  try {
    const vulnerabilities = await getNessusScans();
    console.log(`${vulnerabilities.length} vulnerabilities fetched from Nessus`);

    if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      console.log('0 vulnerabilities fetched');
      return { fetched: 0, inserted: 0, updated: 0, resolved: 0, error: null };
    }

    const result = await processScanResults(vulnerabilities, {
      source: 'nessus',
      markResolved: true,
    });

    console.log('Nessus lifecycle sync result:', result);

    return {
      fetched: vulnerabilities.length,
      inserted: result.imported,
      updated: result.updated,
      resolved: result.resolved,
      error: null,
    };
  } catch (error) {
    console.error('Nessus sync failed:', error.message, error.stack);
    return { fetched: 0, inserted: 0, error: error.message };
  } finally {
    syncInProgress = false;
  }
};

// Demarre le polling periodique et renvoie le poller existant si deja lance.
const startNessusPolling = () => {
  if (poller) return poller;

  const fallbackInterval = parseIntegerEnv('WAZUH_POLL_INTERVAL', 300000);
  const interval = parseIntegerEnv('NESSUS_POLL_INTERVAL', fallbackInterval);

  syncNessusScans();
  poller = setInterval(syncNessusScans, interval);

  return poller;
};

module.exports = {
  syncNessusScans,
  startNessusPolling,
};
