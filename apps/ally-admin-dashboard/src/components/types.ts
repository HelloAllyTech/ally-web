import { ButtonHTMLAttributes, ChangeEvent, CSSProperties, ReactNode } from "react";

import { TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { UseFormRegister, UseFormReturn, FieldErrors } from "react-hook-form";

export interface Simulation {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  createdBy: string;
  lastModified: string;
  status: "Published" | "Draft" | "Archived";
  usage: number;
}

export interface PopupButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariantType;
}

export interface ActionConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleItalic?: string;
  description: string;
  primaryButton: PopupButtonProps;
  secondaryButton: PopupButtonProps;
}

export interface HeaderProps {
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onMoreOptions: () => void;
  moreOptionsRef: React.RefObject<HTMLButtonElement>;
}

export const ButtonVariant = {
  PRIMARY: "primary",
  DESTRUCTIVE: "destructive",
  SECONDARY: "secondary",
  ICON: "icon",
  TEXT: "text",
} as const;

export interface BasicInfoProps {
  formMethods: any;
}

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
  simulation: Simulation | null;
  onConfirmDelete: () => void;
}

export interface FilterListProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange?: (selectedStatuses: string[]) => void;
  options?: { id: string; label: string }[];
}

export interface FooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  isNextDisabled?: boolean;
}

// InputField
export interface InputFieldProps {
  label: string;
  id: string;
  aiAssist?: boolean;
  formMethods: any;
  multiline?: boolean;
  placeholder?: string;
  wordCount?: boolean;
  minHeight?: string;
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
  hasInfoIcon?: boolean;
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

export interface MoreOptionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscardSimulation: () => void;
  position: { top: number; right: number };
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

export enum FilterDropdownType {
  ORGANIZATION = "organization",
  ROLE = "role",
  STATUS = "status",
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
}

interface FilterChipProps {
  label: string;
  value: string;
  onClear: () => void;
}

export interface ActionProps {
  label: string;
  onClick?: () => void;
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
