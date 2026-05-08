/**
 * Composant Loader.
 *
 * Role architectural:
 * - Affiche un etat de chargement reutilisable pendant les appels API.
 * - Ameliore l'accessibilite avec role="status" et aria-live.
 */
// label est une prop optionnelle affichee dans le loader.
const Loader = ({ label = 'Loading...' }) => {
  return (
    <div className="loader-card" role="status" aria-live="polite">
      <div className="loader-header">
        <span className="loader-dot" />
        <span>{label}</span>
      </div>
      <div className="skeleton-line skeleton-wide" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-short" />
    </div>
  );
};

export default Loader;
