export interface DropdownFieldProps {
    disabled?: boolean;
    label?: string;
    value: string;
    valueClassName?: string;
    onChange: (value: string) => void;
    options: string[];
}