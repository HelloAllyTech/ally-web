import { SxProps } from "@mui/material";

export interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  minWidth?: number;
  sx?: SxProps;
}
