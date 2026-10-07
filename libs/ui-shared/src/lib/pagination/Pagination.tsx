import React from "react";

const MAX_VISIBLE_PAGES = 7;
// Touch sizing: below `sm` every control is 40px tall (page numbers 32px wide
// so seven of them plus prev/next still fit a 375px phone), and the
// first/last jumps hide — prev/next and the numbered ends already cover them.
const PAGINATION_BUTTON_CLASSES =
  "inline-flex h-10 w-10 items-center justify-center text-xl text-gray-400 hover:text-black disabled:text-gray-200 sm:h-auto sm:w-auto sm:px-1";
const PAGINATION_EDGE_BUTTON_CLASSES = `${PAGINATION_BUTTON_CLASSES} max-sm:hidden`;
const PAGE_NUMBER_CLASSES =
  "min-w-8 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base font-medium transition-colors";
const PAGE_NUMBER_ACTIVE_CLASSES = "bg-gray-200 text-black";
const PAGE_NUMBER_INACTIVE_CLASSES = "text-gray-700 hover:bg-gray-100";

/**
 * Props for Pagination component.
 */
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component displays page navigation controls with ellipsis for large page sets.
 * @component
 * @param {PaginationProps} props - Props for Pagination
 */
const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  /**
   * Helper to generate page numbers with ellipsis for large page sets.
   * @returns {(number|string)[]} Array of page numbers and ellipsis
   */
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= MAX_VISIBLE_PAGES) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 py-4 select-none">
      {/* First Page */}
      <button
        className={PAGINATION_EDGE_BUTTON_CLASSES}
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        aria-label="First page"
      >
        {"|<"}
      </button>
      {/* Previous Page */}
      <button
        className={PAGINATION_BUTTON_CLASSES}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        {"<"}
      </button>
      {/* Page Numbers */}
      {pageNumbers.map((num, idx) =>
        num === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={num as number}
            className={
              PAGE_NUMBER_CLASSES +
              " " +
              (page === num ? PAGE_NUMBER_ACTIVE_CLASSES : PAGE_NUMBER_INACTIVE_CLASSES)
            }
            onClick={() => onPageChange(Number(num))}
            aria-current={page === num ? "page" : undefined}
          >
            {num}
          </button>
        ),
      )}
      {/* Next Page */}
      <button
        className={PAGINATION_BUTTON_CLASSES}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages || totalPages === 0}
        aria-label="Next page"
      >
        {">"}
      </button>
      {/* Last Page */}
      <button
        className={PAGINATION_EDGE_BUTTON_CLASSES}
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages || totalPages === 0}
        aria-label="Last page"
      >
        {">|"}{" "}
      </button>
    </div>
  );
};

export default Pagination;
