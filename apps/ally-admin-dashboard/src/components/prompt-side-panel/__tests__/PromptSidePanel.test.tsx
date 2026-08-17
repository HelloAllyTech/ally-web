import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  // Carbon's Tooltip needs no real behaviour here — the help copy is asserted
  // via its `label`, not by hovering.
  Tooltip: ({ children, label }: any) => (
    <span data-testid="tooltip" aria-label={label}>
      {children}
    </span>
  ),
}));

// Mock assets
vi.mock("@assets", () => ({
  DoubleArrowRight: () => <div data-testid="double-arrow-right" />,
  Refresh: () => <div data-testid="icon-refresh" />,
  Copy: () => <div data-testid="icon-copy" />,
  Delete: () => <div data-testid="icon-delete" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  ArrowDown: () => <div data-testid="icon-arrow-down" />,
  TooltipIcon: () => <div data-testid="icon-tooltip" />,
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
/** How many scenarios the mocked usage query reports; reset in beforeEach. */
let mockUsageCount = 0;
vi.mock("@api", () => ({
  useRevertPromptMutation: () => [mockRevertPrompt, { isLoading: false }],
  useDeletePromptMutation: () => [mockDeletePrompt, { isLoading: false }],
  // Side panel queries an in-use count to gate the "Delete variant" button and
  // to warn under the studio-visibility switch. Defaults to no in-use
  // scenarios; tests that care set `mockUsageCount` first.
  useGetPromptUsageQuery: () => ({
    data: { count: mockUsageCount, scenarios: [] },
    isFetching: false,
  }),
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
vi.mock("@hooks", () => ({
  // The LLM model dropdown portals its menu via useCreatePortal; a fixed
  // position is enough for jsdom.
  useCreatePortal: () => ({ top: 0, left: 0, width: 200 }),
}));

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

// Matches AUTO_SAVE_DEBOUNCE_MS in the component (700ms) with headroom.
const DEBOUNCE_MS = 750;

describe("PromptSidePanel Component", () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnAutoSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAutoSave.mockResolvedValue(undefined);
    mockUsageCount = 0;
  });

  /** Panel with auto-save wired up (the shape PromptManagement renders). */
  const renderAutoSavePanel = (prompt: Prompt = mockPrompt) =>
    render(
      <PromptSidePanel
        selectedPrompt={prompt}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onAutoSave={mockOnAutoSave}
      />,
    );

  const advancePastDebounce = async () => {
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
  };

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

    it("shows the auto-save status pill instead of Save/Cancel buttons", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      // Everything persists automatically — no explicit Save/Cancel anymore.
      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
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

  describe("Auto-save", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("persists an edit after the debounce with the full payload", async () => {
      renderAutoSavePanel();

      fireEvent.change(screen.getByPlaceholderText("Enter prompt name"), {
        target: { value: "New Name" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter description"), {
        target: { value: "New Desc" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter prompt text"), {
        target: { value: "New Prompt" },
      });

      // Inside the debounce window nothing has been sent yet.
      expect(screen.getByText("Unsaved changes…")).toBeInTheDocument();
      expect(mockOnAutoSave).not.toHaveBeenCalled();

      await advancePastDebounce();

      // promptCode comes from selectedPrompt (read-only), not from form input.
      expect(mockOnAutoSave).toHaveBeenCalledTimes(1);
      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          name: "New Name",
          description: "New Desc",
          promptCode: "test_prompt_code",
          prompt: "New Prompt",
        }),
      );
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });

    it("collapses rapid edits into a single save", async () => {
      renderAutoSavePanel();

      const nameInput = screen.getByPlaceholderText("Enter prompt name");
      fireEvent.change(nameInput, { target: { value: "A" } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.change(nameInput, { target: { value: "AB" } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.change(nameInput, { target: { value: "ABC" } });

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledTimes(1);
      expect(mockOnAutoSave).toHaveBeenCalledWith(expect.objectContaining({ name: "ABC" }));
    });

    it("blocks persisting while required fields are empty and says why", async () => {
      renderAutoSavePanel();

      fireEvent.change(screen.getByPlaceholderText("Enter prompt name"), {
        target: { value: "" },
      });

      await advancePastDebounce();

      expect(mockOnAutoSave).not.toHaveBeenCalled();
      expect(screen.getByText(/Name, description & prompt required/)).toBeInTheDocument();
    });

    it("offers a retry when the save fails", async () => {
      mockOnAutoSave.mockRejectedValueOnce(new Error("boom"));
      renderAutoSavePanel();

      fireEvent.change(screen.getByPlaceholderText("Enter prompt name"), {
        target: { value: "New Name" },
      });
      await advancePastDebounce();

      expect(screen.getByText(/Couldn’t save — retry/)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Couldn’t save — retry/));
      await act(async () => {});
      expect(mockOnAutoSave).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("closes immediately on backdrop click — auto-save means no discard prompt", () => {
      const { container } = render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      fireEvent.change(screen.getByDisplayValue("Test Prompt"), {
        target: { value: "Modified Name" },
      });

      const backdrop = container.querySelector(".bg-black");
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("flushes a pending edit before closing", () => {
      renderAutoSavePanel();

      fireEvent.change(screen.getByDisplayValue("Test Prompt"), {
        target: { value: "Modified Name" },
      });

      // Close during the debounce window — the edit must not be lost.
      const headerButton = screen.getByText("Edit Prompt").closest("button");
      fireEvent.click(headerButton!);

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Modified Name" }),
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("saves immediately on Ctrl+Enter when there is a valid pending edit", () => {
      renderAutoSavePanel();

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.change(promptInput, { target: { value: "New prompt text" } });
      fireEvent.keyDown(promptInput, { key: "Enter", ctrlKey: true });

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "New prompt text" }),
      );
    });

    it("saves immediately on Cmd+Enter (Mac) when there is a valid pending edit", () => {
      renderAutoSavePanel();

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.change(promptInput, { target: { value: "New prompt text" } });
      fireEvent.keyDown(promptInput, { key: "Enter", metaKey: true });

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "New prompt text" }),
      );
    });

    it("does not save on Ctrl+Enter when the form is invalid", () => {
      renderAutoSavePanel({ ...mockPrompt, name: "" } as Prompt);

      const promptInput = screen.getByPlaceholderText("Enter prompt text");
      fireEvent.change(promptInput, { target: { value: "Edited" } });
      fireEvent.keyDown(promptInput, { key: "Enter", ctrlKey: true });

      expect(mockOnAutoSave).not.toHaveBeenCalled();
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

    it("does not mark a no-op edit as unsaved", () => {
      render(
        <PromptSidePanel
          selectedPrompt={mockPrompt}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />,
      );

      const nameInput = screen.getByDisplayValue("Test Prompt") as HTMLInputElement;
      // Retype the identical value — serialized state matches the baseline.
      fireEvent.change(nameInput, { target: { value: "Test Prompt" } });

      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.queryByText("Unsaved changes…")).not.toBeInTheDocument();
    });
  });

  describe("LLM model picker (registry-driven)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // The picker is a custom dropdown; its listbox is portalled and only
    // rendered while open, so every interaction starts from the trigger.
    const openPicker = () => {
      fireEvent.click(screen.getByRole("button", { name: /Default \(inherit\)/ }));
    };

    it("offers models from the registry (OpenAI + Gemini)", () => {
      renderAutoSavePanel();
      openPicker();
      expect(screen.getByRole("option", { name: "GPT-4o" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "GPT-5" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Gemini 2.5 Flash" })).toBeInTheDocument();
    });

    it("sends the explicit provider with the model on save", async () => {
      renderAutoSavePanel();
      openPicker();
      fireEvent.click(screen.getByRole("option", { name: "Gemini 2.5 Flash" }));

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.5-flash",
          provider: "gemini",
        }),
      );
    });

    it("disables the temperature override for a no-temperature model and clears it on save", async () => {
      renderAutoSavePanel();

      // Enable a temperature override on a temp-capable model first.
      const tempCheckbox = screen.getByRole("checkbox", {
        name: /Override temperature/i,
      }) as HTMLInputElement;
      fireEvent.click(tempCheckbox);
      expect(tempCheckbox.checked).toBe(true);

      // Switch to gpt-5 (supportsTemperature=false): control disables + note shows.
      openPicker();
      fireEvent.click(screen.getByRole("option", { name: "GPT-5" }));
      expect(screen.getByRole("checkbox", { name: /Override temperature/i })).toBeDisabled();
      expect(screen.getByText(/doesn’t support a custom temperature/i)).toBeInTheDocument();

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5",
          provider: "openai",
          temperature: null,
        }),
      );
    });
  });

  describe("Studio availability switch", () => {
    /**
     * A prompt that appears in a studio picker, so it can be hidden from one.
     * `transcript_evaluator` rather than `main_agent` deliberately: the switch
     * behaves identically for both, but a main_agent prompt also mounts
     * PromptTranslationsSection, which pulls in translation queries this file's
     * `@api` mock doesn't provide.
     */
    const variantPrompt: Prompt = {
      ...mockPrompt,
      promptType: "transcript_evaluator",
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const getSwitch = () =>
      screen.getByRole("checkbox", { name: /Offer this version in the studio picker/i });

    it("is not rendered for a prompt that no picker offers", () => {
      renderAutoSavePanel(mockPrompt); // no promptType
      expect(
        screen.queryByRole("checkbox", { name: /Offer this version in the studio picker/i }),
      ).not.toBeInTheDocument();
    });

    it("reads a row that predates the flag as visible", () => {
      renderAutoSavePanel(variantPrompt); // visibleInStudio undefined
      expect(getSwitch()).toBeChecked();
      expect(screen.getByText("Authors can pick this version.")).toBeInTheDocument();
    });

    it("persists visibleInStudio=false when switched off", async () => {
      renderAutoSavePanel(variantPrompt);
      fireEvent.click(getSwitch());

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({ visibleInStudio: false }),
      );
    });

    it("sends visibleInStudio=true rather than undefined for a pre-flag row edited elsewhere", async () => {
      renderAutoSavePanel(variantPrompt);
      fireEvent.change(screen.getByPlaceholderText("Enter prompt name"), {
        target: { value: "Renamed" },
      });

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Renamed", visibleInStudio: true }),
      );
    });

    it("does not auto-save on open when the row is already visible", async () => {
      renderAutoSavePanel({ ...variantPrompt, visibleInStudio: true });
      await advancePastDebounce();
      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("states that simulations already on a hidden version keep running on it", () => {
      mockUsageCount = 3;
      renderAutoSavePanel({ ...variantPrompt, visibleInStudio: false });

      expect(getSwitch()).not.toBeChecked();
      expect(
        screen.getByText(/The 3 simulations already using it keep running on it, unchanged\./),
      ).toBeInTheDocument();
    });

    it("singularises the in-use warning for one simulation", () => {
      mockUsageCount = 1;
      renderAutoSavePanel({ ...variantPrompt, visibleInStudio: false });

      expect(
        screen.getByText(/The 1 simulation already using it keeps running on it, unchanged\./),
      ).toBeInTheDocument();
    });

    it("omits the body on a visibility-only save, so no duplicate version is minted", async () => {
      // The backend versions the prompt whenever the payload carries `prompt`
      // and useDashboardOverride is true, without comparing the text — so
      // resending an unchanged body on a metadata edit churns version history.
      renderAutoSavePanel({ ...variantPrompt, useDashboardOverride: false });
      fireEvent.click(getSwitch());

      await advancePastDebounce();

      const [payload] = mockOnAutoSave.mock.calls[0];
      expect(payload).not.toHaveProperty("prompt");
      // And the override flag is left as-is rather than asserted true, which
      // would move a file-backed prompt onto its DB copy as a side effect.
      expect(payload.useDashboardOverride).toBe(false);
      expect(payload.visibleInStudio).toBe(false);
    });

    it("still sends the body (and enables override) when the text itself changed", async () => {
      renderAutoSavePanel({ ...variantPrompt, useDashboardOverride: false });
      fireEvent.change(screen.getByTestId("auto-expandable-textarea"), {
        target: { value: "Rewritten body" },
      });

      await advancePastDebounce();

      expect(mockOnAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Rewritten body",
          useDashboardOverride: true,
        }),
      );
    });

    it("says only that nothing new can use it when a hidden version is unused", () => {
      renderAutoSavePanel({ ...variantPrompt, visibleInStudio: false });

      expect(
        screen.getByText("Hidden from the picker — no new simulation can be pointed at it."),
      ).toBeInTheDocument();
    });
  });
});
