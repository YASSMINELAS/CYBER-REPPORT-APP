/**
 * Carte statistique.
 *
 * Role architectural:
 * - Affiche un indicateur numerique du dashboard.
 * - Peut etre cliquable si une action onClick est fournie.
 */
// Props: label texte, value nombre, helper descriptif, onClick optionnel.
const StatCard = ({ label, value, helper, onClick }) => {
  // Si clickable, on rend un button accessible; sinon un article statique.
  const Component = onClick ? 'button' : 'article';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={`stat-card${onClick ? ' clickable-card' : ''}`}
      onClick={onClick}
      aria-label={onClick ? `Open ${label}` : undefined}
    >
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {helper && <span className="stat-helper">{helper}</span>}
    </Component>
  );
};

export default StatCard;
