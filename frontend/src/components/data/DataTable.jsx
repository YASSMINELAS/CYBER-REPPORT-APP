import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';

import TablePagination from './TablePagination';

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
  const handleSort = (column) => {
    if (!column.sortable || !onSort) return;

    const nextOrder =
      sortBy === column.key && sortOrder === 'desc'
        ? 'asc'
        : 'desc';

    onSort(column.key, nextOrder);
  };

  const renderSortIcon = (column) => {
    if (!column.sortable) {
      return null;
    }

    if (sortBy !== column.key) {
      return <ArrowUpDown size={15} />;
    }

    return sortOrder === 'desc' ? (
      <ArrowDown size={15} />
    ) : (
      <ArrowUp size={15} />
    );
  };

  return (
    <section className="table-section">
      {filters.length > 0 && (
        <div className="table-toolbar panel">
          <div className="table-toolbar__header">
            <div>
              <span className="table-toolbar__eyebrow">
                Filter intelligence
              </span>
              <p className="table-toolbar__copy">
                Refine the live dataset by severity, asset, status, or time context.
              </p>
            </div>

            {meta && (
              <div className="table-toolbar__meta">
                <SlidersHorizontal size={16} />
                {meta.total || rows.length} records
              </div>
            )}
          </div>

          <div className="filters-bar">
            {filters.map((filter) => (
              <label className="filter-group" key={filter.key}>
                <span className="filter-label">
                  {filter.label || filter.key}
                </span>

                {filter.type === 'select' ? (
                  <select
                    value={filterValues[filter.key] || 'all'}
                    onChange={(event) =>
                      onFilterChange(filter.key, event.target.value)
                    }
                  >
                    {filter.options.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={filter.type || 'search'}
                    placeholder={filter.placeholder}
                    value={filterValues[filter.key] || ''}
                    onChange={(event) =>
                      onFilterChange(filter.key, event.target.value)
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`${column.sortable ? 'sortable' : ''}${
                    column.headerClassName
                      ? ` ${column.headerClassName}`
                      : ''
                  }`}
                >
                  <div className="th-content">
                    <span>{column.label}</span>
                    <span className="sort-icon">
                      {renderSortIcon(column)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr
                  key={
                    row._id ||
                    row.id ||
                    row.externalId ||
                    index
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.cellClassName || ''
                      }
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="empty-state"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && onPageChange && (
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
