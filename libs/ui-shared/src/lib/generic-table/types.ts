// Column definition type
type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface TableFilter {
  [key: string]: string;
}

export interface TableSort {
  key: string;
  direction: SortDirection;
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
  onRowClick?: (row: T) => void;
  className?: string;
  style?: React.CSSProperties;
  fallbackUI?: React.ReactNode;
  onSortChange?: (key: string, setSort: React.Dispatch<React.SetStateAction<TableSort>>) => void;
  onFilterChange?: (
    key: string,
    value: string,
    setFilter: React.Dispatch<React.SetStateAction<TableFilter>>,
    setPagination: React.Dispatch<React.SetStateAction<Pagination>>
  ) => void;
} 
