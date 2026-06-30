export interface DropdownFieldProps {
  disabled?: boolean;
  label?: string;
  value: string;
  valueClassName?: string;
  onChange: (value: string) => void;
  onHandleSearch?: (query: string) => void | undefined;
  options: string[];
  searchPlaceholder?: string;
  hideSearch?: boolean;
}

export interface DropdownProps {
  options: string[];
  handleChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  optionsMaxHeight?: number;
  onHandleSearch?: (query: string) => void;
  searchPlaceholder?: string;
  onClose?: () => void;
  hideSearch?: boolean;
}
