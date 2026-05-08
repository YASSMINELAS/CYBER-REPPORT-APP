/**
 * Utilitaires de severite cyber.
 *
 * Role architectural:
 * - Centralise la conversion entre niveaux numeriques Wazuh/Nessus et labels UI.
 * - Evite d'avoir des seuils differents dans plusieurs services.
 */
// Ordre metier des severites affichees dans l'application.
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'];

// Convertit un ruleLevel numerique en label de severite.
const mapSeverity = (level = 0) => {
  const numericLevel = Number(level);

  if (numericLevel >= 15) return 'critical';
  if (numericLevel >= 12) return 'high';
  if (numericLevel >= 7) return 'medium';
  return 'low';
};

// Nettoie un niveau numerique et applique un fallback si la valeur est invalide.
const normalizeRuleLevel = (level, fallback = 0) => {
  const numericLevel = Number(level);
  return Number.isFinite(numericLevel) && numericLevel >= 0 ? numericLevel : fallback;
};

// Convertit une severite textuelle en niveau numerique minimal.
const severityToRuleLevel = (severity = 'low') => {
  switch (String(severity).toLowerCase()) {
    case 'critical':
      return 15;
    case 'high':
      return 12;
    case 'medium':
      return 7;
    default:
      return 0;
  }
};

module.exports = {
  SEVERITY_LEVELS,
  mapSeverity,
  normalizeRuleLevel,
  severityToRuleLevel,
};
