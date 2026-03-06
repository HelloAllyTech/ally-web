import { vi } from "vitest";

// Export cellTypes to be used in mocks
export const cellTypes = {
  editableText: "editableText",
  dropdown: "dropdown",
  dropdownSearchable: "dropdownSearchable",
  number: "number",
  select: "select",
  switch: "switch",
  emoji_select: "emoji_select",
  normalText: "normalText",
  wrapText: "wrapText",
};

// Common component mocks that can be reused
export const createMockComponents = () => ({
  cellTypes,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  CustomImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  TextField: ({ value, onChange, errorMessage, label, placeholder }: any) => (
    <div>
      <label>{label}</label>
      <input
        data-testid="text-field-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {errorMessage && <span data-testid="field-error">{errorMessage}</span>}
    </div>
  ),
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
  ActionConfirmationPopup: ({
    isOpen,
    onClose,
    primaryButton,
    secondaryButton,
    title,
    description,
  }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
        <button onClick={primaryButton?.onClick}>{primaryButton?.label}</button>
        <button onClick={secondaryButton?.onClick}>{secondaryButton?.label}</button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    ) : null,
});
