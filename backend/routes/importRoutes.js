/**
 * Route d'import generique.
 *
 * Role architectural:
 * - Fournit un endpoint dedie aux imports de scan via importController.
 * - Reste protege car un import modifie la base MongoDB.
 */
// Express Router regroupe /api/import.
const express = require('express');
// Controller qui orchestre l'import.
const { importScan } = require('../controllers/importController');
// Auth JWT et roles.
const { protect, authorize } = require('../middlewares/authMiddleware');

// Routeur monte dans server.js sur /api/import.
const router = express.Router();

// POST /api/import
// Entree: payload de scan. Sortie: resultat d'import.
// Reserve aux admins/analysts car cela cree des donnees en base.
router.post('/', protect, authorize('admin', 'analyst'), importScan);

module.exports = router;
