// Column definition type
/**
 * Sort direction type.
 */
export type SortDirection = "ASC" | "DESC" | null;

export enum FilterType {
  MULTISELECT = "multiselect",
  SINGLESELECT = "singleSelect",
  DATE = "date",
  NUMBER = "number",
  TEXT = "text",
}

/**
 * Column definition for the generic table.
 * @template T - The type of data for each row.
 */
export interface Column<T> {
  /** Unique key for the column (can be string or keyof T) */
  key: keyof T | string;
  /** Optional icon to display in the header */
  icon?: React.ReactNode;
  /** Header label for the column */
  header: string;
  /** Replaces the entire header cell content with custom JSX (e.g. a + button) */
  headerNode?: React.ReactNode;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Whether the column is filterable */
  filterable?: boolean;
  /**
   * Filter-only column: excluded from the rendered header/body but still
   * offered in the filter list and resolvable by SelectedFiltersView. Use for
   * fields that are filterable without being shown as a visible column.
   */
  hidden?: boolean;
  /** Type of filter (multiselect, singleSelect, date, number, text) */
  filterType?: FilterType;
  /** Options for filtering (for select types) */
  filterOptions?: { label: string; value: string }[];
  /** Custom render function for cell value */
  render?: (value: any, row: T) => React.ReactNode;
  /** Optional className for the column */
  className?: string;
  /** Optional style for the column */
  style?: React.CSSProperties;
}

/**
 * Sort state for the table.
 */
export interface TableSort {
  key: string;
  value: SortDirection;
}

/**
 * Pagination state (not currently used in GenericTable, but available for extension).
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Props for the GenericTable component.
 * @template T - The type of data for each row.
 */
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
  loadMoreLabel?: string;
  onFilterChange?: (data: { filter: TableFilter; sort: TableSort }) => void;
}

/**
 * Table filter state: array of { key, value } pairs.
 */
export type TableFilter = Array<{ key: string; value: string | string[] }>;

/**
 * FilterPopover displays filter options for a column (single, multi, or date).
 *
 * @param {FilterPopoverProps} props - The props for the filter popover.
 */
export interface FilterPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  column: (Column<any> & { filterOptions: { label: string; value: string }[] }) | null;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  selectedValues: string[];
  onToggleOption: (value: string) => void;
  onSaveMultiSelect: () => void;
  onSelectSingle: (colKey: string, value: string) => void;
  singleSelectedValue?: string;
  onDateSelect?: (key: string, value: string[]) => void;
  /** Applies a numeric range filter as a [min, max] string tuple. */
  onNumberSelect?: (key: string, value: string[]) => void;
  anchorOrigin?: { vertical: "top" | "bottom"; horizontal: "left" | "right" };
}

/**
 * Props for the SelectedFiltersView component.
 * @template T - The type of data for each row.
 */
export interface SelectedFiltersViewProps<T> {
  columns: Column<T>[];
  sort: TableSort;
  filter: TableFilter;
  openFilterList: (col: Column<T> | undefined, event: React.MouseEvent<HTMLElement>) => void;
  onAddFilter: (event: React.MouseEvent<HTMLElement>) => void;
  onRemoveSort: () => void;
  onRemoveFilter: (key: string) => void;
}
