export interface DropdownFieldProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}