/**
 * Utilitaires de graphiques.
 *
 * Role architectural:
 * - Transforme les statistiques backend en tableaux compatibles Recharts.
 * - Centralise l'ordre, les labels et les plages de severite.
 */
// Ordre standard SOC: du plus critique au moins critique.
const severityOrder = ['critical', 'high', 'medium', 'low'];

// Labels affiches dans les graphiques.
const severityLabel = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Explication pedagogique des rule levels utilises par Wazuh/Nessus.
const severityRange = {
  critical: 'Rule level 15 or higher',
  high: 'Rule level 12 to 14',
  medium: 'Rule level 7 to 11',
  low: 'Rule level 0 to 6',
};

// Couleurs officielles des severities SOC
const severityColors = {
  critical: '#ff3b3b', // rouge
  high: '#ff9800',     // orange
  medium: '#ffc107',   // jaune
  low: '#00c853',      // vert
};

// Convertit un objet { critical, high, ... } en tableau Recharts.
export const severityStatsToChartData = (stats = {}) =>
  severityOrder.map((severity) => ({
    name: severityLabel[severity],
    value: stats[severity] || 0,
    range: severityRange[severity],
    color: severityColors[severity],
  }));

// Calcule les compteurs a partir d'une liste de records.
export const recordsToSeverityChartData = (records = []) => {
  const counts = severityOrder.reduce((result, severity) => {
    result[severity] = 0;
    return result;
  }, {});

  records.forEach((record) => {
    const severity = record.severity?.toLowerCase();

    if (counts[severity] !== undefined) {
      counts[severity] += 1;
    }
  });

  return severityStatsToChartData(counts);
};

export {
  severityLabel,
  severityOrder,
  severityRange,
  severityColors,
};

