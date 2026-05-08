/**
 * Composant Pagination simple.
 *
 * Role architectural:
 * - Affiche navigation precedent/suivant pour les pages qui n'utilisent pas DataTable.
 * - Recoit page/pages/total depuis le backend.
 */
// Props: page courante, nombre total de pages, total records, callback de changement.
const Pagination = ({ page, pages, total, onPageChange }) => {
  // Si une seule page existe, la pagination n'ajoute aucune valeur.
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <span>
        Page {page} of {pages} - {total} records
      </span>
      <div>
        <button
          type="button"
          className="secondary-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
