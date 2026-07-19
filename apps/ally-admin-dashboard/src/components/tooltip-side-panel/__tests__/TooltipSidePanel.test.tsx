import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    DoubleArrowRight: () => <svg data-testid="arrow-icon" />,
  };
});

vi.mock("@components", () => ({
  cellTypes: {},
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ToggleSwitch: ({ enabled, onChange }: any) => (
    <input
      type="checkbox"
      data-testid="toggle-input"
      checked={enabled}
      onChange={e => onChange(e.target.checked)}
    />
  ),
  EmojiPickerComponent: ({ buttonText, onEmojiClick }: any) => (
    <button data-testid="emoji-picker" onClick={() => onEmojiClick("🎯")}>
      {buttonText}
    </button>
  ),
  ActionConfirmationPopup: ({ isOpen, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <button data-testid="confirm-close" onClick={primaryButton.onClick}>
          {primaryButton.label}
        </button>
        <button data-testid="keep-editing" onClick={secondaryButton.onClick}>
          {secondaryButton.label}
        </button>
      </div>
    ) : null,
}));

vi.mock("@constants", () => ({
  TAG_TYPES: {},
  en: {
    tooltip: {
      createTooltip: "Create Tooltip",
      editTooltip: "Edit Tooltip",
      tipText: "Tip Text",
      icon: "Icon",
      status: "Status",
      locationRequired: "Location is required",
      unsavedChangesWarning: "You have unsaved changes. Are you sure you want to close?",
    },
  },
}));

import { TooltipSidePanel } from "../TooltipSidePanel";

describe("TooltipSidePanel", () => {
  const mockTooltip = {
    id: "tooltip-1",
    location: "login_button",
    tipText: "Click here to log in",
    icon: "😀",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
  };

  const defaultProps = {
    selectedTooltip: null,
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<TooltipSidePanel {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Create Tooltip")).not.toBeInTheDocument();
    });

    it("renders Create Tooltip header when no tooltip selected", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByText("Create Tooltip")).toBeInTheDocument();
    });

    it("renders Edit Tooltip header when editing existing tooltip", () => {
      render(<TooltipSidePanel {...defaultProps} selectedTooltip={mockTooltip} />);
      expect(screen.getByText("Edit Tooltip")).toBeInTheDocument();
    });

    it("renders location placeholder input", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByPlaceholderText("Tooltip Location")).toBeInTheDocument();
    });

    it("renders Tip Text field with required asterisk", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      // "Tip Text" now appears twice: the visible <Field> label and the Carbon
      // TextArea's (visually hidden) accessible label.
      expect(screen.getAllByText("Tip Text").length).toBeGreaterThan(0);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("renders Icon and Status fields", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders Save and Cancel buttons", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders character counter at 0/200 for empty tip text", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByText("0/200")).toBeInTheDocument();
    });

    it("pre-fills form converting slug to display format when editing", () => {
      render(<TooltipSidePanel {...defaultProps} selectedTooltip={mockTooltip} />);
      expect(screen.getByDisplayValue("Login Button")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Click here to log in")).toBeInTheDocument();
    });
  });

  describe("Form validation", () => {
    it("Save button is disabled when location is empty", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      expect(screen.getByText("Save")).toBeDisabled();
    });

    it("Save button is disabled when tip text is empty", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "Login Button" },
      });
      expect(screen.getByText("Save")).toBeDisabled();
    });

    it("Save button is enabled when both location and tip text are filled", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "Login Button" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter tip text..."), {
        target: { value: "Click here to log in" },
      });
      expect(screen.getByText("Save")).not.toBeDisabled();
    });

    it("does not call onSave when Save is clicked with invalid form", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.click(screen.getByText("Save"));
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe("Form state", () => {
    it("updates character counter as tip text is typed", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter tip text..."), {
        target: { value: "Hello" },
      });
      expect(screen.getByText("5/200")).toBeInTheDocument();
    });

    it("updates emoji when emoji is selected", () => {
      render(<TooltipSidePanel {...defaultProps} selectedTooltip={mockTooltip} />);
      fireEvent.click(screen.getByTestId("emoji-picker"));
      expect(screen.getByTestId("emoji-picker")).toHaveTextContent("🎯");
    });

    it("updates status toggle when clicked", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      const toggle = screen.getByTestId("toggle-input");
      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe("Form submission", () => {
    it("calls onSave with display-format location (slug conversion is parent responsibility)", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "Login Button" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter tip text..."), {
        target: { value: "Click here to log in" },
      });
      fireEvent.click(screen.getByText("Save"));
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "Login Button",
          tipText: "Click here to log in",
        }),
      );
    });
  });

  describe("Close behaviour", () => {
    it("calls onClose when header arrow button is clicked with no changes", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      const closeButton = screen.getByTestId("arrow-icon").closest("button")!;
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("shows unsaved changes popup when header arrow button is clicked with changes", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "New Location" },
      });
      const closeButton = screen.getByTestId("arrow-icon").closest("button")!;
      fireEvent.click(closeButton);
      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
    });

    it("calls onClose directly when Cancel is clicked with no changes", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("shows unsaved changes popup when Cancel is clicked with changes", () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "New Location" },
      });
      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
    });

    it("calls onClose when Close Anyway is confirmed", async () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "New Location" },
      });
      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getByTestId("confirm-close"));
      await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled());
    });

    it("keeps panel open when Keep Editing is clicked", async () => {
      render(<TooltipSidePanel {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Tooltip Location"), {
        target: { value: "New Location" },
      });
      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getByTestId("keep-editing"));
      await waitFor(() =>
        expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument(),
      );
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });
});
