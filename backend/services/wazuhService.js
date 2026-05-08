/**
 * Service d'integration Wazuh Indexer.
 *
 * Role architectural:
 * - Construit une requete Elasticsearch/OpenSearch vers les index wazuh-alerts-*.
 * - Recupere les alertes brutes qui seront ensuite transformees en incidents.
 */
// Axios execute les requetes HTTP vers le Wazuh Indexer.
const axios = require('axios');
// Agent HTTPS pour les certificats internes.
const https = require('https');

// Agent tolerant aux certificats auto-signes souvent presents en lab SOC.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Lit un entier depuis l'environnement avec fallback.
const parseIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) ? value : fallback;
};

// Supporte plusieurs noms de variables pour credentials Wazuh.
const getWazuhCredentials = () => ({
  username:
    process.env.WAZUH_INDEXER_USER ||
    process.env.WAZUH_API_USER ||
    process.env.WAZUH_USERNAME,
  password:
    process.env.WAZUH_INDEXER_PASSWORD ||
    process.env.WAZUH_API_PASSWORD ||
    process.env.WAZUH_PASSWORD,
});

// Resume la reponse indexer sans afficher les alertes completes.
const summarizeIndexerResponse = (data) => ({
  took: data?.took,
  timed_out: data?.timed_out,
  total: data?.hits?.total,
  returned: Array.isArray(data?.hits?.hits) ? data.hits.hits.length : 0,
});

// Verifie que l'URL et les credentials Wazuh existent.
const ensureWazuhIndexerConfig = () => {
  const { username, password } = getWazuhCredentials();

  if (!process.env.WAZUH_INDEXER_URL || !username || !password) {
    throw new Error('Missing Wazuh Indexer configuration');
  }

  return { username, password };
};

// Construit la query envoyee au Wazuh Indexer selon les filtres UI.
const buildWazuhQuery = ({ severity, agent, from, to, size } = {}) => {
  const minLevel = parseIntegerEnv('WAZUH_MIN_LEVEL', 0);
  const filters = [
    {
      range: {
        'rule.level': {
          gte: minLevel,
        },
      },
    },
  ];

  if (agent) {
    // Filtre par nom ou IP d'agent Wazuh.
    filters.push({
      bool: {
        should: [
          { match_phrase: { 'agent.name': agent } },
          { match_phrase: { 'agent.ip': agent } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (from || to) {
    // Filtre temporel pour limiter les alertes par periode.
    filters.push({
      range: {
        timestamp: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
    });
  }

  if (severity && severity !== 'all') {
    // Convertit la severite UI en plage rule.level Wazuh.
    const ranges = {
      critical: { gte: 15 },
      high: { gte: 12, lt: 15 },
      medium: { gte: 7, lt: 12 },
      low: { gte: 0, lt: 7 },
    };

    if (ranges[severity]) {
      filters.push({ range: { 'rule.level': ranges[severity] } });
    }
  }

  return {
    size: Number(size) || 100,
    sort: [{ timestamp: { order: 'desc' } }],
    query: {
      bool: {
        filter: filters,
      },
    },
  };
};

// Appel principal: interroge Wazuh et renvoie les documents _source.
const getWazuhAlerts = async (filters = {}) => {
  const { username, password } = ensureWazuhIndexerConfig();
  const indexerUrl = process.env.WAZUH_INDEXER_URL.replace(/\/$/, '');
  const minLevel = parseIntegerEnv('WAZUH_MIN_LEVEL', 0);
  const url = `${indexerUrl}/wazuh-alerts-*/_search`;
  const body = buildWazuhQuery(filters);

  try {
    console.log('Wazuh Indexer request:', {
      url,
      auth: username ? `basic:${username}` : 'missing',
      minLevel,
    });

    const response = await axios({
      method: 'get',
      url,
      httpsAgent,
      auth: {
        username,
        password,
      },
      data: body,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Wazuh alerts response:', summarizeIndexerResponse(response.data));

    return response.data?.hits?.hits?.map((hit) => hit._source) || [];
  } catch (error) {
    // Les details techniques sont logges cote serveur, la route renverra un message au frontend.
    console.error('Wazuh Indexer error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        auth: error.config?.auth ? 'present' : 'missing',
      },
    });
    throw error;
  }
};

module.exports = {
  getWazuhAlerts,
};
