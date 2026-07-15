import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PromptSidePanel } from "../PromptSidePanel";
import { Prompt } from "@types";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock UI component
vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    maxLines,
    minHeight,
    ...props
  }: any) => (
    <textarea
      data-testid="auto-expandable-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

// Mock assets
vi.mock("@assets", () => ({
  DoubleArrowRight: () => <div data-testid="double-arrow-right" />,
}));

// Mock components
vi.mock("@components", () => ({
  ActionConfirmationPopup: ({ isOpen, title, onClose, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <h2>{title}</h2>
        <button data-testid="confirm-close-anyway" onClick={primaryButton.onClick}>
          {primaryButton.label}
        </button>
        <button data-testid="confirm-keep-editing" onClick={secondaryButton.onClick}>
          {secondaryButton.label}
        </button>
      </div>
    ) : null,
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  ToggleSwitch: () => null,
}));

// Mock API
const mockRevertPrompt = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) });
const mockDeletePrompt = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) });
vi.mock("@api", () => ({
  useRevertPromptMutation: () => [mockRevertPrompt, { isLoading: false }],
  useDeletePromptMutation: () => [mockDeletePrompt, { isLoading: false }],
  // Side panel queries an in-use count for duplicates to gate the
  // "Delete variant" button. Tests mount with no in-use scenarios.
  useGetPromptUsageQuery: () => ({ data: { count: 0, scenarios: [] }, isFetching: false }),
  // Model picker is driven by the backend registry. Provide a small OpenAI +
  // Gemini set including a no-temperature model (gpt-5) to exercise gating.
  useGetLlmModelsQuery: () => ({
    data: [
      {
        provider: "openai",
        model: "gpt-4o",
        label: "GPT-4o",
        supportsTemperature: true,
        runtimes: ["ai-learn", "ally-ai", "ally-be"],
      },
      {
        provider: "openai",
        model: "gpt-5",
        label: "GPT-5",
        supportsTemperature: false,
        runtimes: ["ai-learn", "ally-ai", "ally-be"],
      },
      {
        provider: "gemini",
        model: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        supportsTemperature: true,
        runtimes: ["ai-learn", "ally-ai", "ally-be"],
      },
    ],
    isFetching: false,
  }),
}));

// Stub @hooks so the component renders without a Redux provider. The
// allowlist gate has been removed (variant actions are GA now), so no
// hooks from this barrel are read by PromptSidePanel anymore — empty
// stub keeps the resolver from failing at import time.
vi.mock("@hooks", () => ({}));

// Mock constants
vi.mock("@constants", () => ({
  MAIN_AGENT_PROMPT_VARIABLE_CATALOG: [],
  PROMPT_LLM_MODEL_OPTIONS: [
    {
      provider: "openai",
      label: "OpenAI",
      models: [{ value: "gpt-4o", label: "gpt-4o" }],
    },
  ],
  PROMPT_TEMPERATURE_DEFAULT: 0.7,
  providerForModel: (model?: string) => (model === "gpt-4o" ? "openai" : undefined),
  en: {
    simulation: {
      editPrompt: "Edit Prompt",
      createPrompt: "Create new prompt",
      promptName: "Prompt Name",
      enterPromptName: "Enter prompt name",
      promptCode: "Prompt Code",
      enterPromptCode: "Enter prompt code",
      promptDescription: "Description",
      enterPromptDescription: "Enter description",
      promptText: "Prompt",
      enterPrompt: "Enter prompt text",
      promptRequired: "Prompt name, description, prompt code and prompt text are required",
      unsavedChangesWarning: "You have unsaved changes. Do you want to close anyway?",
      availableVariables: "Available variables",
      usedBlocks: "Used Blocks",
      blocksHelpTitle: "What are blocks?",
      blocksHelpText:
        "Blocks are reusable prompt fragments referenced by this prompt. They are mainly used for optional or shared sections so the main prompt stays easier to read and maintain.",
      revertToDefault: "Revert to default",
      revertToDefaultConfirm: "Revert this prompt to the codebase default?",
      revertPromptSuccess: "Prompt reverted to codebase default",
      revertPromptFailed: "Failed to revert prompt to codebase default.",
      useDashboardOverride: "Use dashboard version",
      useDashboardOverrideLabel: "Use dashboard version",
    },
  },
}));

const mockPrompt: Prompt = {
  id: "1",
  name: "Test Prompt",
  description: "Test Description",
  promptCode: "test_prompt_code",
  prompt: "This is the prompt text",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("PromptSidePanel Component", () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={false}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render when selectedPrompt is null", () => {
      const { container } = render(
        <PromptSidePanel
          selectedPrompt={null}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should display edit header when selectedPrompt has id", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("Edit Prompt")).toBeInTheDocument();
    });

    it("should render all form fields", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("test_prompt_code")).toBeInTheDocument(); // Prompt code (read-only)
      expect(screen.getByPlaceholderText("Enter prompt name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter description")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter prompt text")).toBeInTheDocument();
    });

    it("should render Save and Cancel buttons", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Form Population", () => {
    it("should populate form with selectedPrompt data", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("test_prompt_code")).toBeInTheDocument(); // Prompt code (read-only)
      expect(screen.getByDisplayValue("Test Prompt")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Description")).toBeInTheDocument();
      expect(screen.getByDisplayValue("This is the prompt text")).toBeInTheDocument();
    });

    it("should update form when selectedPrompt changes", () => {
      const otherPrompt: Prompt = {
        ...mockPrompt,
        id: "2",
        name: "Other Prompt",
        promptCode: "other_code",
      };
      const { rerender } = render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByDisplayValue("Test Prompt")).toBeInTheDocument();

      rerender(
        <PromptSidePanel
          selectedPrompt={otherPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByDisplayValue("Other Prompt")).toBeInTheDocument();
      expect(screen.getByText("other_code")).toBeInTheDocument(); // Prompt code (read-only span)
    });
  });

  describe("Field Changes", () => {
    it("should display prompt code as read-only", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("test_prompt_code")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Enter prompt code")).not.toBeInTheDocument();
    });

    it("should update name field", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter prompt name") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "New Prompt" } });

      expect(nameInput.value).toBe("New Prompt");
    });

    it("should update description field", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const descriptionInput = screen.getByPlaceholderText("Enter description") as HTMLInputElement;
      fireEvent.change(descriptionInput, { target: { value: "New Description" } });

      expect(descriptionInput.value).toBe("New Description");
    });

    it("should update prompt text field", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const promptInput = screen.getByPlaceholderText("Enter prompt text") as HTMLTextAreaElement;
      fireEvent.change(promptInput, { target: { value: "New prompt text" } });

      expect(promptInput.value).toBe("New prompt text");
    });
  });

  describe("Prompt Code Display", () => {
    it("should show prompt code as read-only when editing", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("test_prompt_code")).toBeInTheDocument();
    });

    it("should show prompt code when creating new prompt", () => {
      const newPrompt = { ...mockPrompt, id: undefined, promptCode: "new_prompt_code" };
      render(
        <PromptSidePanel
          selectedPrompt={newPrompt as Prompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByText("new_prompt_code")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should disable Save button when form is invalid (empty fields)", () => {
      const invalidPrompt = { ...mockPrompt, name: "" };
      render(
        <PromptSidePanel
          selectedPrompt={invalidPrompt as Prompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const saveButton = screen.getByText("Save") as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it("should enable Save button when all required fields are filled", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // mockPrompt has all required fields (name, description, promptCode, prompt)
      const saveButton = screen.getByText("Save") as HTMLButtonElement;
      expect(saveButton.disabled).toBe(false);
    });

    it("should show error toast when saving with empty required fields", async () => {
      const invalidPrompt = { ...mockPrompt, name: "", prompt: "" };
      render(
        <PromptSidePanel
          selectedPrompt={invalidPrompt as Prompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const saveButton = screen.getByText("Save");
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute(
        "title",
        "Prompt name, description, prompt code and prompt text are required",
      );
    });
  });

  describe("Save Functionality", () => {
    it("should call onUpdate with correct data when saving", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter prompt name");
      const descriptionInput = screen.getByPlaceholderText("Enter description");
      const promptInput = screen.getByPlaceholderText("Enter prompt text");

      fireEvent.change(nameInput, { target: { value: "New Name" } });
      fireEvent.change(descriptionInput, { target: { value: "New Desc" } });
      fireEvent.change(promptInput, { target: { value: "New Prompt" } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      // promptCode comes from selectedPrompt (read-only), not from form input
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
          description: "New Desc",
          promptCode: "test_prompt_code",
          prompt: "New Prompt",
        }),
      );
    });

    it("should call onUpdate with id when saving existing prompt", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          name: "Updated Name",
        }),
      );
    });

    it("should not call onUpdate when Save button is disabled", () => {
      const invalidPrompt = { ...mockPrompt, name: "" };
      render(
        <PromptSidePanel
          selectedPrompt={invalidPrompt as Prompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const saveButton = screen.getByText("Save") as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);

      fireEvent.click(saveButton);

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when Cancel button is clicked without changes", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should show confirmation popup when closing with unsaved changes", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt");
      fireEvent.change(nameInput, { target: { value: "Modified Name" } });

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
    });

    it("should not show confirmation popup when closing without changes", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });

    it("should close panel when confirming close anyway", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt");
      fireEvent.change(nameInput, { target: { value: "Modified Name" } });

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      const confirmButton = screen.getByTestId("confirm-close-anyway");
      fireEvent.click(confirmButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should keep panel open when choosing to keep editing", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt");
      fireEvent.change(nameInput, { target: { value: "Modified Name" } });

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      const keepEditingButton = screen.getByTestId("confirm-keep-editing");
      fireEvent.click(keepEditingButton);

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });

    it("should close side panel overlay when clicking on backdrop", () => {
      const { container } = render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const backdrop = container.querySelector(".bg-black");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should save on Ctrl+Enter when form is valid", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.keyDown(promptInput, { key: "Enter", ctrlKey: true });

      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it("should save on Cmd+Enter (Mac) when form is valid", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.keyDown(promptInput, { key: "Enter", metaKey: true });

      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it("should not save on Ctrl+Enter when form is invalid", () => {
      const invalidPrompt = { ...mockPrompt, name: "" };
      render(
        <PromptSidePanel
          selectedPrompt={invalidPrompt as Prompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.keyDown(promptInput, { key: "Enter", ctrlKey: true });

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Panel Header", () => {
    it("should display DoubleArrowRight icon", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      expect(screen.getByTestId("double-arrow-right")).toBeInTheDocument();
    });

    it("should have clickable header to close panel", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const headerButton = screen.getByText("Edit Prompt").closest("button");
      if (headerButton) {
        fireEvent.click(headerButton);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid field changes", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter prompt name");

      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(nameInput, { target: { value: "AB" } });
      fireEvent.change(nameInput, { target: { value: "ABC" } });

      expect((nameInput as HTMLInputElement).value).toBe("ABC");
    });

    it("should handle special characters in input fields", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter prompt name");
      const specialChars = "@#$%^&*()_+-=[]{}|;:,.<>?";

      fireEvent.change(nameInput, { target: { value: specialChars } });

      expect((nameInput as HTMLInputElement).value).toBe(specialChars);
    });

    it("should handle long text input", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      const longText = "A".repeat(5000);

      fireEvent.change(promptInput, { target: { value: longText } });

      expect((promptInput as HTMLTextAreaElement).value).toBe(longText);
    });

    it("should preserve form data when toggling confirmation modal", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt") as HTMLInputElement;
      const originalValue = nameInput.value;

      fireEvent.change(nameInput, { target: { value: "Modified" } });
      expect(nameInput.value).toBe("Modified");

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      const keepEditingButton = screen.getByTestId("confirm-keep-editing");
      fireEvent.click(keepEditingButton);

      // Form data should be preserved
      const updatedNameInput = screen.getByDisplayValue("Modified") as HTMLInputElement;
      expect(updatedNameInput.value).toBe("Modified");
    });
  });

  describe("LLM model picker (registry-driven)", () => {
    const renderPanel = () =>
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

    it("offers models from the registry (OpenAI + Gemini)", () => {
      renderPanel();
      expect(screen.getByRole("option", { name: "GPT-4o" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "GPT-5" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Gemini 2.5 Flash" })).toBeInTheDocument();
    });

    it("sends the explicit provider with the model on save", () => {
      renderPanel();
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "gemini-2.5-flash" } });
      fireEvent.click(screen.getByText("Save"));
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.5-flash",
          provider: "gemini",
        }),
      );
    });

    it("disables the temperature override for a no-temperature model and clears it on save", () => {
      renderPanel();

      // Enable a temperature override on a temp-capable model first.
      const tempCheckbox = screen.getByRole("checkbox", {
        name: /Override temperature/i,
      }) as HTMLInputElement;
      fireEvent.click(tempCheckbox);
      expect(tempCheckbox.checked).toBe(true);

      // Switch to gpt-5 (supportsTemperature=false): control disables + note shows.
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "gpt-5" } });
      expect(screen.getByRole("checkbox", { name: /Override temperature/i })).toBeDisabled();
      expect(screen.getByText(/doesn’t support a custom temperature/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText("Save"));
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5",
          provider: "openai",
          temperature: null,
        }),
      );
    });
  });
});
