import { useState, useMemo, useCallback } from 'react';

import { GenericTableProps, TableSort, TableFilter } from './types';
import TableHeader from './TableHeader';
import TableBody from './TableBody';

/**
 * Utility function to get a value from a row by key.
 */
function getValue<T extends Record<string, any>>(row: T, key: keyof T | string) {
  if (typeof key === 'string' && key in row) return (row as any)[key];
  return row[key as keyof T];
}

/**
 * GenericTable is a reusable, type-safe, and highly customizable table component.
 * Supports sorting, filtering, and row click handling.
 * Allows external control of sort and filter logic for server-side data fetching.
 */
export function GenericTable<T extends Record<string, any>>({
  columns,
  data,
  initialSort,
  initialFilter,
  onRowClick,
  className = '',
  style = {},
  fallbackUI,
  onSortChange,
  onFilterChange,
}: GenericTableProps<T>) {
  // Internal state for sort and filter (used if not controlled externally)
  const [sort, setSort] = useState<TableSort>(initialSort || { key: '', direction: null });
  const [filter, setFilter] = useState<TableFilter>(initialFilter || {});

  // Filtering logic (client-side)
  const filteredData = useMemo(() => {
    return data.filter(row =>
      columns.every(col => {
        if (!col.filterable || !filter[col.key as string]) return true;
        const value = getValue(row, col.key);
        return String(value).toLowerCase().includes(filter[col.key as string].toLowerCase());
      })
    );
  }, [data, columns, filter]);

  // Sorting logic (client-side)
  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, col.key);
      const bValue = getValue(b, col.key);
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (aValue === bValue) return 0;
      if (sort.direction === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredData, sort, columns]);

  /**
   * Handles sort changes. Uses external handler if provided, otherwise updates internal state.
   */
  const handleSort = useCallback((key: string) => {
    if (onSortChange) {
      onSortChange(key, setSort);
    } else {
      setSort(prev => {
        if (prev.key === key) {
          if (prev.direction === 'asc') return { key, direction: 'desc' };
          if (prev.direction === 'desc') return { key: '', direction: null };
        }
        return { key, direction: 'asc' };
      });
    }
  }, [onSortChange]);

  /**
   * Handles filter changes. Uses external handler if provided, otherwise updates internal state.
   */
  const handleFilterChange = useCallback((key: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(key, value, setFilter, () => {});
    } else {
      setFilter(prev => ({ ...prev, [key]: value }));
    }
  }, [onFilterChange]);

  return (
    <div className={`overflow-x-auto rounded min-w-full divide-gray-200 border shadow ${className}`} style={{scrollbarWidth: 'none', msOverflowStyle: 'none' , ...style}}>
      <table className="w-full min-w-full text-xs sm:text-sm">
        <TableHeader
          columns={columns}
          sort={sort}
          filter={filter}
          onSort={handleSort}
          onFilterChange={handleFilterChange}
        />
        {fallbackUI ||<TableBody
          columns={columns}
          data={sortedData}
          onRowClick={onRowClick}
        />}
      </table>
    </div>
  );
}

export default GenericTable; 