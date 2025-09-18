export interface ToggleButtonGroupProps {
  disabled?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  items: {
    value: string;
    label: string;
  }[];
  className?: string;
  successValue?: string;
}
