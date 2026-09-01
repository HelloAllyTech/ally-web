export interface EditableTextPopupProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  width?: number;
  minWidth?: number;
  maxLength?: number;
}

export interface EditableTextPopupState {
  isOpen: boolean;
  editValue: string;
}

export interface EmojiPickerState {
  isOpen: boolean;
  selectedEmoji: string;
}

export interface NumberInputProps {
  value?: number | string;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  spinnerClassName?: string;
  size?: "sm" | "md" | "lg";
}

export interface NumberInputState {
  inputValue: string;
  isFocused: boolean;
}

export type NumberInputSize = "sm" | "md" | "lg";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export interface SelectComponentProps {
  value: string;
  options: Array<{ label: string; value: string; backgroundColor?: string }>;
  onChange: (value: string) => void;
  onAddOption?: (option: string, backgroundColor: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface HeaderProps {
  column: {
    headerIndex: number;
    label: string;
    getResizerProps: () => {
      [key: string]: any;
    };
    hasResizer?: boolean;
    getHeaderProps: () => {
      key: string;
      [key: string]: any;
    };
  };
}

export interface InfiniteScrollConfig {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export interface NotionTableProps {
  tableData: { data: any[]; columns: any[] } | undefined;
  tableStyle?: React.CSSProperties;
  tableFooter?: React.ReactNode;
  onRowChange?: (action: any) => void;
  onRowClick?: (rowIndex: number) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
  infiniteScroll?: InfiniteScrollConfig;
  autoHeight?: boolean;
  editIndex?: number;
  /**
   * How a row reaches `onRowClick`. "hover" (default) keeps the existing
   * dock-to-right icon that only appears on hover over `editIndex`. "row"
   * makes the whole row a click target instead — pick this only for a table
   * whose cells are read-only (`disabled: true`), since a click anywhere
   * would otherwise fight with inline cell editing.
   */
  rowClickTrigger?: "hover" | "row";
  hasResizer?: boolean;
  hideSelectionColumn?: boolean;
  fillWidth?: boolean;
}
export enum Status {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  PUBLISHED = "PUBLISHED",
}
