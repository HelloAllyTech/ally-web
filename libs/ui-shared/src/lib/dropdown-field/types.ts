export interface DropdownFieldProps {
  disabled?: boolean;
  label?: string;
  value: string;
  valueClassName?: string;
  onChange: (value: string) => void;
  onHandleSearch?: (query: string) => void | undefined;
  options: string[];
  searchPlaceholder?: string;
}

export interface DropdownProps {
  options: string[];
  handleChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  onHandleSearch?: (query: string) => void;
  searchPlaceholder?: string;
}
