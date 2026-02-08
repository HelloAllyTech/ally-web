import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Hoist mocks
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    DoubleArrowRight: () => <svg data-testid="arrow-icon">Arrow</svg>,
    Trash: () => <svg data-testid="trash-icon">Trash</svg>,
  };
});

// Mock components
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    ToggleSwitch: ({ enabled, onChange }: any) => (
      <button
        data-testid="toggle-switch"
        data-enabled={enabled}
        onClick={() => onChange(!enabled)}
      >
        {enabled ? "On" : "Off"}
      </button>
    ),
    Button: ({ children, onClick, variant }: any) => (
      <button data-testid={`button-${variant}`} onClick={onClick}>
        {children}
      </button>
    ),
    AutoExpandableTextarea: ({ value, onChange, placeholder }: any) => (
      <textarea
        data-testid="expandable-textarea"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ),
  };
});

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    en: {
      ...(actual.en || {}),
      common: {
        cancel: "Cancel",
        saveChanges: "Save Changes",
      },
    },
  };
});

import { GuardrailSidePanel } from "../GuardrailSidePanel";

describe("GuardrailSidePanel", () => {
  const mockGuardrail = {
    id: "guardrail-1",
    helperDialogue: "rude",
    actorDialogue: "Please be respectful",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };

  const defaultProps = {
    selectedGuardrail: mockGuardrail,
    isOpen: true,
    onClose: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onCreate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<GuardrailSidePanel {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Edit Guardrail")).not.toBeInTheDocument();
    });

    it("renders edit side panel when editing existing guardrail", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.getByText("Edit Guardrail")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("renders create side panel when creating new guardrail", () => {
      render(<GuardrailSidePanel {...defaultProps} selectedGuardrail={{}} />);

      expect(screen.getByText("Create Guardrail")).toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });

    it("renders helper dialogue field", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.getByText(/Helper Dialogue/)).toBeInTheDocument();
    });

    it("renders actor dialogue field", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.getByText(/Actor Dialogue/)).toBeInTheDocument();
    });

    it("renders status toggle", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });

    it("renders save and cancel buttons", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("does not display metadata timestamps", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      expect(screen.queryByText(/Created:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Last Updated:/)).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onClose when close button is clicked", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const closeButton = screen.getByTestId("arrow-icon").parentElement;
      fireEvent.click(closeButton!);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("calls onDelete when delete button is clicked", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith("guardrail-1");
    });

    it("calls onUpdate when active status is toggled", async () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const toggleButton = screen.getByTestId("toggle-switch");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(defaultProps.onUpdate).toHaveBeenCalledWith(
          "guardrail-1",
          expect.objectContaining({
            active: false,
          }),
        );
      });
    });

    it("calls onClose when cancel button is clicked", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Form Submission and Validation", () => {
    it("shows error toast when mandatory fields are missing", async () => {
      render(
        <GuardrailSidePanel 
          {...defaultProps} 
          selectedGuardrail={{ id: "1", helperDialogue: "", actorDialogue: "" }} 
        />
      );

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("mandatory"));
      });
      expect(defaultProps.onUpdate).not.toHaveBeenCalled();
    });

    it("calls onUpdate when saving existing valid guardrail", async () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onUpdate).toHaveBeenCalledWith("guardrail-1", expect.any(Object));
        expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("updated"));
      });
    });

    it("calls onCreate when saving new valid guardrail", async () => {
      const newGuardrail = {
        helperDialogue: "new trigger",
        actorDialogue: "new response",
        active: true,
      };
      
      render(
        <GuardrailSidePanel 
          {...defaultProps} 
          selectedGuardrail={newGuardrail} 
        />
      );

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onCreate).toHaveBeenCalledWith(expect.objectContaining(newGuardrail));
      });
    });
  });

  describe("Form state", () => {
    it("updates form state when helper dialogue is changed", () => {
      render(<GuardrailSidePanel {...defaultProps} />);

      const textareas = screen.getAllByTestId("expandable-textarea");
      const helperTextarea = textareas[0];

      fireEvent.change(helperTextarea, { target: { value: "new helper text" } });

      expect(helperTextarea).toHaveValue("new helper text");
    });
  });
});
