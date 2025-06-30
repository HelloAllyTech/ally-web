// Column definition type
type SortDirection = "ASC" | "DESC" | null;

export interface Column<T> {
  key: keyof T | string;
  icon?: React.ReactNode;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "multiselect" | "singleSelect" | "date" | "number" | "text";
  filterOptions?: { label: string; value: string }[];
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface TableSort {
  key: string;
  value: SortDirection;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface GenericTableProps<T> {
  columns: Column<T>[];
  data: T[];
  initialSort?: TableSort;
  initialFilter?: TableFilter;
  isLoading?: boolean;
  showSelectedFilters?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
  style?: React.CSSProperties;
  fallbackUI?: React.ReactNode;
  handleLoadMore?: () => void;
  onFilterChange?: (data: any) => void;
}

// Replace the old TableFilter type
export type TableFilter = Array<{ key: string; value: string | string[] }>;
