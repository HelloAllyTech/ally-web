import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder }: any) => (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      data-testid="textarea"
    />
  ),
  TextInput: ({ labelText, hideLabel, ...props }: any) => (
    <input aria-label={labelText} {...props} />
  ),
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <button onClick={onClose} data-testid="confirm-close">
          Confirm
        </button>
      </div>
    ) : null,
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={`button-${children?.toLowerCase()}`}>
      {children}
    </button>
  ),
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      data-testid="toggle-switch"
      onClick={() => onChange(!enabled)}
      data-enabled={enabled}
      title={label}
    >
      {enabled ? "ON" : "OFF"}
    </button>
  ),
}));

vi.mock("@constants", () => ({
  en: {
    simulation: {
      languageName: "Language Name",
      enterLanguageName: "Enter language name",
      languageCode: "Language Code",
      enterLanguageCode: "Enter language code",
      translationCode: "Translation Code",
      enterTranslationCode: "Enter translation code",
      llmProviderConfig: "LLM Provider Config",
      sttProviderConfig: "STT Provider Config",
      editLanguage: "Edit Language",
      createLanguage: "Create new language",
      save: "Save",
      cancel: "Cancel",
    },
  },
}));

import { LanguageManagementSidePanel } from "../LanguageSidePanel";

describe("LanguageManagementSidePanel", () => {
  const mockLanguage = {
    id: 1,
    label: "English",
    value: "en",
    translationCode: "en-US",
    active: true,
    llmProviderConfig: {},
    sttProviderConfig: {},
    createdAt: "2024-01-15T10:00:00Z",
  };

  const defaultProps = {
    selectedLanguage: null,
    isOpen: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <LanguageManagementSidePanel {...defaultProps} isOpen={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render when isOpen is true", () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);
      expect(screen.getByPlaceholderText("New Language")).toBeInTheDocument();
    });

    it("should show create mode title when no language is selected", () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);
      expect(screen.getByText("Create new language")).toBeInTheDocument();
    });

    it("should show edit mode title when language is selected", () => {
      render(<LanguageManagementSidePanel {...defaultProps} selectedLanguage={mockLanguage} />);
      expect(screen.getByText("Edit Language")).toBeInTheDocument();
    });
  });

  describe("Form Inputs", () => {
    it("should populate form fields when language is selected", () => {
      render(<LanguageManagementSidePanel {...defaultProps} selectedLanguage={mockLanguage} />);

      const labelInput = screen.getByPlaceholderText("New Language") as HTMLInputElement;
      expect(labelInput.value).toBe("English");
    });

    it("should allow editing language name", () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);

      const labelInput = screen.getByPlaceholderText("New Language") as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: "French" } });

      expect(labelInput.value).toBe("French");
    });
  });

  describe("Save Functionality", () => {
    it("should disable save button when required fields are empty", () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);

      const saveButton = screen.getByText("Save") as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it("should enable save button when all required fields are filled", async () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);

      const labelInputs = screen.getAllByPlaceholderText("New Language");
      const labelInput = labelInputs[0] as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: "French" } });

      const codeInputs = screen.getAllByPlaceholderText("Enter language code");
      const codeInput = codeInputs[0] as HTMLInputElement;
      fireEvent.change(codeInput, { target: { value: "fr" } });

      const translationCodeInputs = screen.getAllByPlaceholderText("Enter translation code");
      const translationCodeInput = translationCodeInputs[0] as HTMLInputElement;
      fireEvent.change(translationCodeInput, { target: { value: "fr-FR" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save") as HTMLButtonElement;
        expect(saveButton.disabled).toBe(false);
      });
    });

    it("should call onUpdate when save is clicked with valid data", async () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);

      const labelInputs = screen.getAllByPlaceholderText("New Language");
      const labelInput = labelInputs[0] as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: "French" } });

      const codeInputs = screen.getAllByPlaceholderText("Enter language code");
      const codeInput = codeInputs[0] as HTMLInputElement;
      fireEvent.change(codeInput, { target: { value: "fr" } });

      const translationCodeInputs = screen.getAllByPlaceholderText("Enter translation code");
      const translationCodeInput = translationCodeInputs[0] as HTMLInputElement;
      fireEvent.change(translationCodeInput, { target: { value: "fr-FR" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save");
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(defaultProps.onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when cancel button is clicked without changes", () => {
      render(<LanguageManagementSidePanel {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
