/**
 * Controller des incidents.
 *
 * Role architectural:
 * - Adapte les routes Express aux fonctions du service incidentService.
 * - Garde les controllers simples pour faciliter les tests et la maintenance.
 */
// Service metier qui gere incidents manuels, imports Wazuh, emails et MongoDB.
const incidentService = require('../services/incidentService');

// Liste les incidents avec filtres/pagination/tri.
const getAllIncidents = async (req, res, next) => {
  try {
    res.json(await incidentService.getAll(req.query));
  } catch (error) {
    next(error);
  }
};

// Recupere un incident precis par identifiant MongoDB.
const getIncidentById = async (req, res, next) => {
  try {
    res.json(await incidentService.getById(req.params.id));
  } catch (error) {
    next(error);
  }
};

// Cree un incident manuel et declenche la logique d'alerte email dans le service.
const createIncident = async (req, res, next) => {
  try {
    res.status(201).json(await incidentService.create(req.body));
  } catch (error) {
    next(error);
  }
};

// Importe une selection d'alertes Wazuh deja previsualisees.
const importIncidents = async (req, res, next) => {
  try {
    res.status(201).json(await incidentService.importMany(req.body));
  } catch (error) {
    next(error);
  }
};

// Met a jour un incident existant.
const updateIncident = async (req, res, next) => {
  try {
    res.json(await incidentService.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

// Met a jour uniquement le statut d'un incident.
const updateIncidentStatus = async (req, res, next) => {
  try {
    res.json(await incidentService.updateStatus(req.params.id, req.body.status));
  } catch (error) {
    next(error);
  }
};

// Supprime un incident; la route limite cette action aux admins.
const deleteIncident = async (req, res, next) => {
  try {
    res.json(await incidentService.remove(req.params.id));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  deleteIncident,
  getAllIncidents,
  getIncidentById,
  importIncidents,
  updateIncident,
  updateIncidentStatus,
};
