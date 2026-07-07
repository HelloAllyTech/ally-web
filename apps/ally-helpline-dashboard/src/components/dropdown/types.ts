export interface DropdownOption {
  label: string;
  value: string | number;
}

export interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  minWidth?: number;
  placeholder?: string;
  disableClearable?: boolean;
  readOnly?: boolean;
}
