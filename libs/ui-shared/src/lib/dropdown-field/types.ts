export interface DropdownFieldProps {
    disabled?: boolean;
    label?: string;
    value: string;
    valueClassName?: string;
    onChange: (value: string) => void;
    options: string[];
}

export interface DropdownProps {
    options: string[];
    handleChange: (value: string) => void;
    className?: string;
}