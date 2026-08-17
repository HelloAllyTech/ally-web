import {
  ButtonHTMLAttributes,
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";

import { UseFormRegister, UseFormReturn, FieldErrors } from "react-hook-form";

export interface PopupButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariantType;
  /** For a confirm that isn't answerable yet — e.g. a required choice inside the popup's own children. */
  disabled?: boolean;
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
  /**
   * Multi-dimension mode: render one checkbox group per section (e.g. Status
   * + Category). Takes precedence over `options`; the selection still flows
   * through the single `selectedFilters` array, so option ids must be unique
   * across sections.
   */
  sections?: Array<{ title: string; options: { id: string; label: string }[] }>;
}

export interface FooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
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
  regenerateButton?: ReactNode;
  enhanceButton?: ReactNode;
  /** Data-driven tooltip `location`; shows a sticky_note hint next to the label
   *  when an active tooltip exists for it. */
  tooltipLocation?: string;
}

// DropdownField
export interface DropdownFieldProps {
  label: string;
  id: string;
  /**
   * Required for the default (react-hook-form) mode. Optional when the field
   * is driven in controlled mode via `value` + `onChange`.
   */
  formMethods?: UseFormReturn<any>;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  isMandatory?: boolean;
  isSearchable?: boolean;
  handleSearchTextChange?: (searchTerm: string) => void;
  defaultOption?: string;
  optionsRenderer?: (
    option: { value: string; label: string },
    onSelect: (value: string) => void,
  ) => ReactNode;
  onClose?: () => void;
  allowDeselect?: boolean;
  borderless?: boolean;
  /**
   * Controlled mode: when both `value` and `onChange` are provided the field
   * bypasses react-hook-form and is driven by these props directly (so the
   * same styled dropdown can be reused for plain local state). `formMethods`
   * is not needed in this mode.
   */
  value?: string;
  onChange?: (value: string) => void;
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
export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "defaultValue" | "size"
> {
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
  disabled?: boolean;
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
  filter?: React.ReactNode;
  filterChips?: FilterChipProps[];
  addFilterCta?: AddFilterCtaProps;
  action?: ActionProps;
  secondaryAction?: ActionProps;
  className?: string;
  addFilterButtonRef?: React.RefObject<HTMLButtonElement>;
}

export interface RequestFilterOption {
  label: string;
  value: string;
}

export interface FilterSectionConfig<T> {
  id: keyof T;
  label: string;
  options: RequestFilterOption[];
  renderOption?: (option: RequestFilterOption) => React.ReactNode;
}

export interface GenericFilterDropdownProps<T> {
  isOpen: boolean;
  onClose: () => void;
  sections: FilterSectionConfig<T>[];
  onApplyFilters: (filters: T) => void;
  anchorRect?: DOMRect | null;
  currentFilters: T;
}
