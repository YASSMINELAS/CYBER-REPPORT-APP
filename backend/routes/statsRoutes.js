/**
 * Route des statistiques dashboard.
 *
 * Role architectural:
 * - Agrege les donnees MongoDB pour alimenter le tableau de bord React.
 * - Combine vulnerabilites, incidents, donnees Wazuh et donnees Nessus.
 *
 * Flux:
 * Dashboard.jsx -> GET /api/stats -> aggregations MongoDB -> payload de graphiques/cartes.
 */
// Express Router regroupe les endpoints /api/stats.
const express = require('express');
// Model Mongoose des vulnerabilites pour compter et agreger les severites.
const Vulnerability = require('../models/Vulnerability');
// Model Mongoose des incidents pour compter les alertes et produire les tendances.
const Incident = require('../models/Incident');
// Middleware JWT: le dashboard est reserve aux utilisateurs connectes.
const authMiddleware = require('../middlewares/authMiddleware');

// Routeur monte dans server.js sur /api/stats.
const router = express.Router();

// Objet par defaut pour garantir que le frontend recoit toujours les memes cles.
const emptySeverityStats = () => ({
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
});

// Convertit les resultats d'aggregation MongoDB en structure stable pour les graphiques.
const formatSeverityStats = (total, stats) => {
  const result = emptySeverityStats();
  result.total = total;

  // Chaque item MongoDB est de forme { _id: severity, count }.
  stats.forEach((item) => {
    if (item._id && result[item._id] !== undefined) {
      result[item._id] = item.count;
    }
  });

  return result;
};

// Calcule une date dans le passe, utilisee pour les fenetres 24h/7j.
const sinceHours = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

// GET /api/stats
// Entree: JWT. Sortie: statistiques agregees pour cartes, camemberts, barres et tendances.
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    console.log('Stats route: Starting aggregation queries...');

    // Les requetes MongoDB sont independantes; Promise.all les execute en parallele.
    const [
      totalVulnerabilities,
      totalIncidents,
      vulnerabilitiesBySeverity,
      incidentsBySeverity,
      totalWazuhAlerts,
      wazuhBySeverity,
      totalNessusScans,
      runningNessusScans,
      completedNessusScans,
      alertsLast24h,
      incidentsOverTime,
    ] = await Promise.all([
      // Nombre total de vulnerabilites.
      Vulnerability.countDocuments(),
      // Nombre total d'incidents.
      Incident.countDocuments(),
      // Aggregation MongoDB: groupe les vulnerabilites par severite.
      Vulnerability.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]),
      // Aggregation MongoDB: groupe les incidents par severite.
      Incident.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]),
      // Nombre d'incidents provenant de Wazuh.
      Incident.countDocuments({ source: 'wazuh' }),
      // Repartition des alertes Wazuh par severite.
      Incident.aggregate([
        { $match: { source: 'wazuh' } },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]),
      // Nombre de donnees Nessus importees comme vulnerabilites.
      Vulnerability.countDocuments({ source: 'nessus' }),
      // Compteurs conserves pour compatibilite avec le dashboard existant.
      Vulnerability.countDocuments({ source: 'nessus', status: 'running' }),
      Vulnerability.countDocuments({ source: 'nessus', status: 'completed' }),
      // Alertes Wazuh recentes, basees sur timestamp ou createdAt.
      Incident.countDocuments({
        source: 'wazuh',
        $or: [
          { timestamp: { $gte: sinceHours(24) } },
          { createdAt: { $gte: sinceHours(24) } },
        ],
      }),
      // Tendance 7 jours: aggregation par date au format YYYY-MM-DD.
      Incident.aggregate([
        {
          $match: {
            source: 'wazuh',
            $or: [
              { timestamp: { $gte: sinceHours(24 * 7) } },
              { createdAt: { $gte: sinceHours(24 * 7) } },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                date: { $ifNull: ['$timestamp', '$createdAt'] },
                format: '%Y-%m-%d',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    console.log('Stats route: Query results:', {
      totalVulnerabilities,
      totalIncidents,
      vulnerabilitiesBySeverity,
      totalWazuhAlerts,
      totalNessusScans,
    });

    // Normalise les tableaux MongoDB en objets prets pour React.
    const vulnerabilityStats = formatSeverityStats(totalVulnerabilities, vulnerabilitiesBySeverity);
    const incidentStats = formatSeverityStats(totalIncidents, incidentsBySeverity);
    const wazuhStats = formatSeverityStats(totalWazuhAlerts, wazuhBySeverity);

    // Payload final consomme par Dashboard.jsx.
    const payload = {
      vulnerabilities: vulnerabilityStats,
      incidents: incidentStats,
      wazuh: {
        totalAlerts: wazuhStats.total,
        alertsLast24h,
        critical: wazuhStats.critical,
        high: wazuhStats.high,
        medium: wazuhStats.medium,
        low: wazuhStats.low,
      },
      nessus: {
        totalScans: totalNessusScans,
        running: runningNessusScans,
        completed: completedNessusScans,
      },
      incidentsOverTime: incidentsOverTime.map((item) => ({
        date: item._id,
        count: item.count,
      })),
    };

    console.log('Dashboard stats response:', payload);
    res.json(payload);
  } catch (error) {
    // En cas d'erreur MongoDB, on delegue au middleware global d'erreur.
    console.error('Stats route error:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;
