/**
 * Badge de severite.
 *
 * Role architectural:
 * - Uniformise l'affichage des severites cyber dans les tables et dashboards.
 * - Traduit une valeur backend en label lisible et classe CSS.
 */
// Mapping entre valeur technique et texte affiche.
const severityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// value vient des incidents/vulnerabilites renvoyes par l'API.
const SeverityBadge = ({ value }) => {
  // Normalisation defensive pour eviter une erreur si value manque.
  const severity = (value || 'unknown').toLowerCase();
  const label = severityLabels[severity] || 'Unknown';

  return <span className={`badge severity-${severity}`}>{label}</span>;
};

export default SeverityBadge;
