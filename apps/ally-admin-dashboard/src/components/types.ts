import { ButtonHTMLAttributes, ChangeEvent, CSSProperties, ReactNode } from "react";

import { TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { UseFormRegister, UseFormReturn, FieldErrors } from "react-hook-form";

export interface PopupButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariantType;
}

export const ButtonVariant = {
  PRIMARY: "primary",
  DESTRUCTIVE: "destructive",
  SECONDARY: "secondary",
  ICON: "icon",
  TEXT: "text",
} as const;

export type ButtonVariantType = (typeof ButtonVariant)[keyof typeof ButtonVariant];

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariantType;
  className?: string;
  children?: ReactNode;
  fullWidth?: boolean;
}

export interface DeleteSimulationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  description?: string | ReactNode;
  cardData: {
    id: string | number;
    title?: string;
    description?: string;
    coverImageUrl?: string;
  };
  onConfirmDelete: () => void;
}

export interface FilterListProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedStatuses: Array<{ id: string; label: string }>) => void;
  selectedFilters: Array<{ id: string; label: string }>;
  options?: { id: string; label: string }[];
}

export interface FooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  isNextDisabled?: boolean;
  isLastStep?: boolean;
}

// InputField
export interface InputFieldProps {
  type?: string;
  label: string;
  id: string;
  formMethods: any;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
  infoIconContent?: string;
  isMandatory?: boolean;
  defaultValue?: string;
  disabled?: boolean;
}

// DropdownField
export interface DropdownFieldProps {
  label: string;
  id: string;
  formMethods: UseFormReturn<any>;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  isMandatory?: boolean;
  isSearchable?: boolean;
  handleSearchTextChange?: (searchTerm: string) => void;
  defaultOption?: string;
}

// NarrativeContext
export interface NarrativeContextProps {
  formMethods: any;
}

// OTP
export interface OTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  digitCount?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

// TextField
export interface TextFieldProps extends Omit<MuiTextFieldProps, "variant"> {
  className?: string;
  disabled?: boolean;
  hideError?: boolean;
  errorMessage?: string;
  errors?: FieldErrors<any>;
  fieldSize?: "small" | "medium" | "large";
  fullWidth?: boolean;
  inputStyles?: CSSProperties;
  label?: string;
  multiline?: boolean;
  name?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  register?: UseFormRegister<any>;
  rows?: number;
  showBorder?: boolean;
  value?: string;
}

// Vertical Stepper
export interface Step {
  id: string;
  title: string;
}

export interface VerticalStepperProps {
  steps: Step[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
}

// Sidebar
export interface SidebarProps {
  expanded: boolean;
}

// Demographics Section Types
export interface FormFieldConfig {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "select";
  options?: Array<{ value: string; label: string }>;
}

export interface FieldGroupType {
  title?: string;
  fields: FormFieldConfig[];
}

export interface DemographicsSectionProps {
  formMethods: UseFormReturn<any>;
}

export interface FieldGroupProps {
  group: FieldGroupType;
  formMethods: UseFormReturn<any>;
}

export interface FormFieldProps {
  config: FormFieldConfig;
  formMethods: UseFormReturn<any>;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface FilterValues {
  organizations: string[];
  roles: string[];
  statuses: string[];
}

export interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: string[];
  onApplyFilters: (filters: FilterValues) => void;
  anchorRect?: DOMRect | null;
  currentFilters: FilterValues;
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  showCount?: boolean;
}

export interface FilterChipProps {
  label: string;
  value: string;
  allValue: string[];
  onClear: () => void;
}

export interface ActionProps {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: ButtonVariantType;
}

export interface AddFilterCtaProps {
  label: string;
  onClick?: () => void;
}

export interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filterChips?: FilterChipProps[];
  addFilterCta?: AddFilterCtaProps;
  action?: ActionProps;
  className?: string;
  addFilterButtonRef?: React.RefObject<HTMLButtonElement>;
}
