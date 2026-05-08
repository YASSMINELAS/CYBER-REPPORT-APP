/**
 * Model Mongoose Incident.
 *
 * Role architectural:
 * - Stocke les incidents manuels ou alertes importees depuis Wazuh.
 * - Peut etre relie a une vulnerabilite pour faire le lien detection -> exposition.
 *
 * Concepts cyber:
 * - ruleId/ruleLevel viennent souvent d'un SIEM/EDR comme Wazuh.
 * - MITRE tactic/technique aide a presenter l'attaque dans un cadre standard.
 */
// Mongoose definit le schema et les index MongoDB.
const mongoose = require('mongoose');

// Convertit CVE/MITRE fournis en chaine ou tableau vers un tableau propre.
const normalizeStringArray = (value) => {
  if (!value) return [];
  // Cas deja normalise: tableau.
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// Schema principal de la collection incidents.
const incidentSchema = new mongoose.Schema({
  // Titre lisible de l'incident ou de l'alerte.
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
  },
  ruleLevel: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'resolved'],
    default: 'open',
  },
  source: {
    type: String,
  },
  externalId: {
    type: String,
  },
  agentName: {
    type: String,
  },
  agentIP: {
    type: String,
  },
  host: {
    type: String,
  },
  port: {
    type: Number,
  },
  cve: {
    type: [String],
    default: [],
    set: normalizeStringArray,
  },
  solution: {
    type: String,
  },
  timestamp: {
    type: Date,
  },
  winSystemLevel: {
    type: String,
  },
  winSystemTime: {
    type: Date,
  },
  ruleId: {
    type: String,
  },
  mitreTactic: {
    type: [String],
    default: [],
    set: normalizeStringArray,
  },
  mitreTechnique: {
    type: [String],
    default: [],
    set: normalizeStringArray,
  },
  raw: {
    // Donnees brutes Wazuh conservees pour audit/debug.
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  vulnerability: {
    // Reference MongoDB vers une vulnerabilite liee.
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vulnerability',
  },
});

// Index unique compose: evite les doublons lors des imports Wazuh.
incidentSchema.index({ externalId: 1, source: 1 }, { unique: true, sparse: true });
// Index utile pour filtrer les incidents par severite/agent/date.
incidentSchema.index({ severity: 1, agentName: 1, timestamp: -1 });

// Exporte le model pour les services incidents et les statistiques.
module.exports = mongoose.model('Incident', incidentSchema);
