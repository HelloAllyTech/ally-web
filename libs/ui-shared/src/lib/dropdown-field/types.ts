export interface DropdownFieldProps {
  disabled?: boolean;
  label?: string;
  value: string;
  valueClassName?: string;
  onChange: (value: string) => void;
  onHandleSearch?: (query: string) => void | undefined;
  options: string[];
  searchPlaceholder?: string;
  hideSearch?: boolean;
  /**
   * Render the option list in a portal on `document.body`, fixed to the
   * trigger. Use it when the field sits inside a scroll container or a clipping
   * ancestor (the scribe summary panel), where an inline list is cut off. Off
   * by default: a portaled list escapes a Carbon modal's focus trap, so the
   * search box would lose focus inside a modal.
   */
  portal?: boolean;
}

export interface DropdownProps {
  options: string[];
  handleChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  optionsMaxHeight?: number;
  onHandleSearch?: (query: string) => void;
  searchPlaceholder?: string;
  onClose?: () => void;
  hideSearch?: boolean;
}
