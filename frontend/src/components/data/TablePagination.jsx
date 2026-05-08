/**
 * Pagination dediee aux tables.
 *
 * Role architectural:
 * - Affiche l'intervalle visible: Showing start-end of total.
 * - Delegue le changement de page a la page parente via onPageChange.
 */
// Props issues de la reponse backend et de DataTable.
const TablePagination = ({ page, pages, total, count, limit, onPageChange }) => {
  // Calcule le premier index humain visible.
  const start = count > 0 ? (page - 1) * limit + 1 : 0;
  // Calcule le dernier index visible sans depasser total.
  const end = Math.min(page * limit, total);

  return (
    <section className="table-pagination">
      <span>
        Showing {start} - {end} of {total}
      </span>
      <div className="pagination-buttons">
        <button type="button" className="secondary-button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span className="page-indicator">Page {page} of {pages}</span>
        <button type="button" className="secondary-button" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
          Next
        </button>
      </div>
    </section>
  );
};

export default TablePagination;
