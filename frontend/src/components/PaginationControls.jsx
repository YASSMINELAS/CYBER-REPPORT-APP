const buildPageWindow = (page, pages) => {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const windowPages = [1];

  if (page > 3) {
    windowPages.push('left-ellipsis');
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);

  for (let current = start; current <= end; current += 1) {
    windowPages.push(current);
  }

  if (page < pages - 2) {
    windowPages.push('right-ellipsis');
  }

  windowPages.push(pages);

  return windowPages;
};

const PaginationControls = ({
  page,
  pages,
  onPageChange,
  summary,
  compact = false,
}) => {
  if (pages <= 1) {
    return null;
  }

  return (
    <section className={`pagination-shell${compact ? ' compact' : ''}`}>
      {summary && (
        <span className="pagination-summary">
          {summary}
        </span>
      )}

      <div className="pagination-controls">
        <button
          type="button"
          className="secondary-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>

        <div className="pagination-pages" aria-label="Pagination">
          {buildPageWindow(page, pages).map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                className={`page-pill${item === page ? ' active' : ''}`}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="page-ellipsis">
                ...
              </span>
            )
          )}
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
};

export default PaginationControls;
