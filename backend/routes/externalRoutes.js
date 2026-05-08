/**
 * Routes d'integration externe Nessus/Wazuh.
 *
 * Role architectural:
 * - Sert de passerelle entre le frontend et les outils cyber externes.
 * - Permet de previsualiser des donnees avant import pour eviter d'enregistrer tout automatiquement.
 *
 * Points securite:
 * - Les previews sont reservees aux admins/analysts.
 * - Les anciennes routes d'import direct renvoient 410 pour forcer le flux controle preview -> selection -> save.
 */
// Express Router regroupe les endpoints /api/external.
const express = require('express');
// protect verifie le JWT; authorize controle les roles.
const { protect, authorize } = require('../middlewares/authMiddleware');
// Client/service qui appelle l'API Nessus.
const { getNessusScans } = require('../services/nessusService');
// Client/service qui appelle l'API Wazuh.
const { getWazuhAlerts } = require('../services/wazuhService');
// Mapper qui transforme une alerte Wazuh brute en incident comprehensible par l'application.
const { mapAlertToIncident } = require('../services/wazuhSync');

// Routeur monte dans server.js sur /api/external.
const router = express.Router();

// GET /api/external/nessus/preview
// Entree: aucune. Sortie: findings Nessus normalises pour affichage frontend.
router.get('/nessus/preview', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    // Appel externe Nessus: recupere les scans/findings depuis l'outil de vulnerabilite.
    const scans = await getNessusScans();
    res.json(scans);
  } catch (error) {
    // Erreur d'integration: credentials, reseau, certificat ou API Nessus indisponible.
    console.error('Nessus route error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to fetch Nessus scans' });
  }
});

// GET /api/external/wazuh/preview
// Entree: req.query peut filtrer les alertes. Sortie: alertes Wazuh transformees en incidents.
router.get('/wazuh/preview', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    // Appel externe Wazuh avec les filtres transmis par le frontend.
    const alerts = await getWazuhAlerts(req.query);
    // Transformation + suppression des alertes non exploitables.
    res.json(alerts.map(mapAlertToIncident).filter(Boolean));
  } catch (error) {
    console.error('Wazuh preview route error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to preview Wazuh alerts' });
  }
});

// GET /api/external/nessus
// Route de lecture brute protegee: utile pour debug ou usage interne authentifie.
router.get('/nessus', protect, async (req, res) => {
  try {
    const scans = await getNessusScans();
    res.json(scans);
  } catch (error) {
    console.error('Nessus route error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to fetch Nessus scans' });
  }
});

// GET /api/external/wazuh
// Route de lecture brute protegee: renvoie les alertes telles que Wazuh les expose.
router.get('/wazuh', protect, async (req, res) => {
  try {
    const alerts = await getWazuhAlerts(req.query);
    res.json(alerts);
  } catch (error) {
    console.error('Wazuh route error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to fetch Wazuh alerts' });
  }
});

// Ancien endpoint desactive: on evite l'import GET car il est destructif et non RESTful.
router.get('/import-wazuh', protect, authorize('admin', 'analyst'), async (req, res) => {
  res.status(410).json({ message: 'Use preview mode and save selected incidents instead.' });
});

// Ancien endpoint desactive: force le flux moderne de selection manuelle.
router.get('/import-nessus', protect, authorize('admin', 'analyst'), async (req, res) => {
  res.status(410).json({ message: 'Use preview mode and save selected vulnerabilities instead.' });
});

// Ancien endpoint generique desactive pour eviter les imports ambigus.
router.post('/import', protect, authorize('admin', 'analyst'), async (req, res) => {
  res.status(410).json({ message: 'Use preview mode and save selected records instead.' });
});

module.exports = router;
