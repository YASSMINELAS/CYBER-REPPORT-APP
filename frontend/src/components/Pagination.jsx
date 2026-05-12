import PaginationControls from './PaginationControls';

const Pagination = ({ page, pages, total, onPageChange }) => {
  if (pages <= 1) {
    return null;
  }

  return (
    <PaginationControls
      page={page}
      pages={pages}
      onPageChange={onPageChange}
      summary={`Page ${page} of ${pages} - ${total} records`}
    />
  );
};

export default Pagination;
