import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
}

const pageSizes = [10, 20, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Pages autour de la page courante
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Toujours afficher la dernière page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && !showPageSize) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
      {/* Info */}
      <div className="text-sm text-gray-600">
        Affichage de <span className="font-medium">{startItem}</span> à{' '}
        <span className="font-medium">{endItem}</span> sur{' '}
        <span className="font-medium">{totalItems}</span> éléments
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Par page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {pageSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              onClick={() => onPageChange(1)}
              disabled={!canGoPrevious}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoPrevious
                  ? 'hover:bg-gray-200 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous page */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoPrevious
                  ? 'hover:bg-gray-200 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    {page}
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={clsx(
                      'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors',
                      page === currentPage
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            {/* Next page */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoNext
                  ? 'hover:bg-gray-200 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last page */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={!canGoNext}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoNext
                  ? 'hover:bg-gray-200 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook pour la pagination locale
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to page 1 when items change significantly
  const paginatedItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  };
}

