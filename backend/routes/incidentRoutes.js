/**
 * Routes des incidents.
 *
 * Role architectural:
 * - Expose l'API REST pour les incidents Wazuh ou manuels.
 * - Protege les actions sensibles par JWT et RBAC.
 *
 * Flux:
 * Route -> validation -> controller -> incidentService -> model Incident -> MongoDB.
 */
// Express Router regroupe les endpoints /api/incidents.
const express = require('express');
// Controllers incidents: interface entre HTTP et logique metier.
const {
  getAllIncidents,
  getIncidentById,
  createIncident,
  importIncidents,
  updateIncident,
  updateIncidentStatus,
  deleteIncident,
} = require('../controllers/incidentController');
// Middlewares d'authentification et d'autorisation par role.
const { protect, authorize } = require('../middlewares/authMiddleware');
// Validation generique des requetes.
const validateRequest = require('../validators/validateRequest');
// Schemas propres aux incidents.
const {
  createIncidentSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
} = require('../validators/incidentValidator');

// Routeur monte dans server.js sur /api/incidents.
const router = express.Router();

// GET /api/incidents: liste paginee et filtree.
router.get('/', protect, getAllIncidents);
// POST /api/incidents: creation manuelle, reservee admin/analyst.
router.post('/', protect, authorize('admin', 'analyst'), validateRequest({ body: createIncidentSchema }), createIncident);
// POST /api/incidents/import: sauvegarde d'alertes Wazuh selectionnees.
router.post('/import', protect, authorize('admin', 'analyst'), importIncidents);
// GET /api/incidents/:id: detail d'un incident.
router.get('/:id', protect, getIncidentById);
// PUT /api/incidents/:id: mise a jour complete des champs autorises.
router.put('/:id', protect, authorize('admin', 'analyst'), validateRequest({ body: updateIncidentSchema }), updateIncident);
// PATCH /api/incidents/:id/status: fermeture/resolution.
router.patch('/:id/status', protect, authorize('admin', 'analyst'), validateRequest({ body: updateIncidentStatusSchema }), updateIncidentStatus);
// DELETE /api/incidents/:id: suppression destructive reservee admin.
router.delete('/:id', protect, authorize('admin'), deleteIncident);

module.exports = router;
