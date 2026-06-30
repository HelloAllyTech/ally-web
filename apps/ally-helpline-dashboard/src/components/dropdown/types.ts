import { SxProps } from "@mui/material";

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
  sx?: SxProps;
  disableClearable?: boolean;
  readOnly?: boolean;
}
