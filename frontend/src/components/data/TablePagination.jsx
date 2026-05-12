import PaginationControls from '../PaginationControls';

const TablePagination = ({
  page,
  pages,
  total,
  count,
  limit,
  onPageChange,
}) => {
  const start = count > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);

  return (
    <PaginationControls
      page={page}
      pages={pages}
      onPageChange={onPageChange}
      summary={`Showing ${start} - ${end} of ${total}`}
      compact
    />
  );
};

export default TablePagination;
