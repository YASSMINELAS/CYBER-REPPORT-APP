/**
 * Service d'integration Nessus.
 *
 * Role architectural:
 * - Appelle l'API Nessus avec les cles configurees.
 * - Transforme les scans/findings Nessus en vulnerabilites internes.
 *
 * Point cyber:
 * - Nessus detecte les vulnerabilites techniques; ce service les rend compatibles avec MongoDB et le frontend.
 */
// Axios execute les appels HTTP vers Nessus.
const axios = require('axios');
// https.Agent permet de configurer la verification TLS pour les appliances internes.
const https = require('https');
// Convertit un ruleLevel en severite applicative.
const { mapSeverity } = require('../utils/severity');

// Agent HTTPS utilise pour les environnements internes avec certificats auto-signes.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Verifie que les variables Nessus obligatoires existent avant tout appel API.
const ensureNessusConfig = () => {
  if (!process.env.NESSUS_URL || !process.env.NESSUS_ACCESS_KEY || !process.env.NESSUS_SECRET_KEY) {
    throw new Error('Missing Nessus API configuration');
  }
};

// Cree un client Axios preconfigure pour l'API Nessus.
const getNessusClient = () => {
  ensureNessusConfig();
  const baseURL = process.env.NESSUS_URL.replace(/\/$/, '');

  return axios.create({
    baseURL,
    httpsAgent,
    timeout: 20000,
    headers: {
      'X-ApiKeys': `accessKey=${process.env.NESSUS_ACCESS_KEY}; secretKey=${process.env.NESSUS_SECRET_KEY}`,
    },
  });
};

// Resume la reponse Nessus dans les logs sans afficher de donnees sensibles.
const summarizeNessusResponse = (data) => ({
  scans: Array.isArray(data?.scans) ? data.scans.length : 0,
  folders: Array.isArray(data?.folders) ? data.folders.length : 0,
});

// Convertit la severite numerique Nessus vers un ruleLevel compatible avec le projet.
const mapNessusSeverityToRuleLevel = (severity = 0) => {
  const numericSeverity = Number(severity);

  if (numericSeverity >= 4) return 15;
  if (numericSeverity >= 3) return 12;
  if (numericSeverity >= 2) return 7;
  return 0;
};

// Normalise les champs Nessus qui peuvent etre tableaux ou chaines.
const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// Construit une table host_id -> adresse/nom pour enrichir les findings.
const buildHostMap = (hosts = []) =>
  hosts.reduce((map, host) => {
    const id = String(host.host_id || host.id || host.hostname || host.name || '');
    const address = host.hostname || host.host_ip || host.ip || host.name || id || 'unknown-host';

    if (id) {
      map.set(id, address);
    }

    map.set(address, address);
    return map;
  }, new Map());

// Determine les hotes touches par une vulnerabilite Nessus.
const extractHostsForVulnerability = (vulnerability, hostMap) => {
  const rawHosts =
    vulnerability.hosts ||
    vulnerability.affected_hosts ||
    vulnerability.host ||
    vulnerability.hostname ||
    vulnerability.host_id;
  const hosts = normalizeArray(rawHosts).map((host) => hostMap.get(String(host)) || String(host));

  if (hosts.length > 0) {
    return hosts;
  }

  return hostMap.size > 0 ? Array.from(new Set(hostMap.values())) : ['unknown-host'];
};

// Convertit une vulnerabilite Nessus brute en payload interne de Vulnerability.
const normalizeNessusVulnerability = ({ scan, vulnerability, host }) => {
  const severityValue = vulnerability.severity ?? vulnerability.severity_index ?? 0;
  const ruleLevel = mapNessusSeverityToRuleLevel(severityValue);
  const pluginId = String(vulnerability.plugin_id || vulnerability.pluginId || vulnerability.id || '');
  const title = vulnerability.plugin_name || vulnerability.pluginName || vulnerability.name;

  if (!pluginId || !title) {
    // Sans pluginId ou titre, l'element ne peut pas etre deduplique proprement.
    return null;
  }

  return {
    title,
    description: vulnerability.description || vulnerability.synopsis || vulnerability.plugin_output,
    solution: vulnerability.solution,
    ruleLevel,
    severity: mapSeverity(ruleLevel),
    cve: normalizeArray(vulnerability.cve || vulnerability.cves),
    host,
    port: vulnerability.port ? String(vulnerability.port) : '',
    protocol: vulnerability.protocol || '',
    pluginId,
    scanId: String(scan.id),
    scanName: scan.name,
    source: 'nessus',
    status: 'open',
    externalId: `${pluginId}-${host}-${vulnerability.port ? String(vulnerability.port) : 'default'}-${vulnerability.protocol || 'default'}-${String(scan.id)}`,
    raw: vulnerability,
  };
};

// Recupere les scans Nessus puis leurs details, et renvoie une liste plate de findings normalises.
const getNessusScans = async () => {
  const client = getNessusClient();

  try {
    console.log('Nessus request:', {
      url: `${client.defaults.baseURL}/scans`,
      auth: process.env.NESSUS_ACCESS_KEY ? 'api-keys:present' : 'missing',
    });

    const response = await client.get('/scans');
    console.log('Nessus API response:', summarizeNessusResponse(response.data));

    const scans = Array.isArray(response.data?.scans) ? response.data.scans : [];
    const scanResults = await Promise.all(
      scans.map(async (scan) => {
        try {
          const scanDetailResponse = await client.get(`/scans/${scan.id}`);
          const detail = scanDetailResponse.data || {};
          const vulnerabilities = detail.vulnerabilities || [];
          const hostMap = buildHostMap(detail.hosts || []);

          console.log(`Scan ${scan.id}: ${vulnerabilities.length} vulnerability summaries`);

          return vulnerabilities.flatMap((vulnerability) =>
            extractHostsForVulnerability(vulnerability, hostMap)
              .map((host) => normalizeNessusVulnerability({ scan, vulnerability, host }))
              .filter(Boolean)
          );
        } catch (scanError) {
          console.error(`Error fetching details for scan ${scan.id}:`, scanError.message);
          return [];
        }
      })
    );

    return scanResults.flat();
  } catch (error) {
    // Les erreurs reseau/API sont remontees a la route pour informer le frontend.
    console.error('Nessus API error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

module.exports = {
  getNessusScans,
};
