/**
 * Composant DataTable generique.
 *
 * Role architectural:
 * - Factorise l'affichage des listes incidents/vulnerabilites.
 * - Recoit les colonnes, lignes, filtres, tri et pagination sous forme de props.
 *
 * Flux:
 * Page -> props columns/rows/handlers -> DataTable -> callbacks vers la page.
 */
// Pagination de table reutilisable.
import TablePagination from './TablePagination';

// Composant generique: aucune connaissance metier directe.
const DataTable = ({
  columns,
  rows,
  emptyMessage = 'No records found.',
  filters = [],
  filterValues = {},
  meta,
  sortBy,
  sortOrder,
  onFilterChange,
  onSort,
  onPageChange,
}) => {
  // Gere le clic sur un header triable.
  const handleSort = (column) => {
    // Condition importante: les colonnes non triables ne declenchent rien.
    if (!column.sortable || !onSort) return;
    const nextOrder = sortBy === column.key && sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(column.key, nextOrder);
  };

  return (
    <section className="data-panel">
      {filters.length > 0 && (
        // Les filtres sont generes dynamiquement depuis la configuration de la page.
        <div className="data-filters">
          {filters.map((filter) => (
            <label key={filter.key}>
              <span>{filter.label}</span>
              {filter.type === 'select' ? (
                <select value={filterValues[filter.key] || 'all'} onChange={(event) => onFilterChange(filter.key, event.target.value)}>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={filter.type || 'search'}
                  value={filterValues[filter.key] || ''}
                  placeholder={filter.placeholder}
                  onChange={(event) => onFilterChange(filter.key, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <div className="table-wrap fade-in">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.sortable ? 'sortable' : ''}${column.headerClassName ? ` ${column.headerClassName}` : ''}`}
                  onClick={() => handleSort(column)}
                  scope="col"
                >
                  <div className="header-content">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="sort-indicator">
                        {sortBy === column.key ? (sortOrder === 'desc' ? 'v' : '^') : '-'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              // Cle defensive: Mongo _id, id, externalId, puis fallback stable.
              <tr key={row._id || row.id || row.externalId || `${row.title}-${index}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={typeof column.cellClassName === 'function' ? column.cellClassName(row) : (column.cellClassName || '')}
                  >
                    {column.render ? column.render(row) : row[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              // Etat vide pedagogique: informe l'utilisateur qu'aucune donnee ne correspond.
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && onPageChange && (
        // Pagination affichee seulement si la page fournit meta + callback.
        <TablePagination
          page={meta.page}
          pages={meta.pages}
          total={meta.total}
          count={rows.length}
          limit={meta.limit}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
};

export default DataTable;
