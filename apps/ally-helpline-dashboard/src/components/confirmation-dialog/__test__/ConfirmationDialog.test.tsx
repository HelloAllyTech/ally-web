import React, { FC, ReactNode, SVGProps } from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocked Types Setup (Aligned with external Button definition) ---

// Mock ButtonVariantType to reflect the assumed string literal types
type ButtonVariantType = "primary" | "destructive" | "secondary" | "icon" | "text";
const ButtonVariant = {
  PRIMARY: "primary" as ButtonVariantType,
  DESTRUCTIVE: "destructive" as ButtonVariantType,
  SECONDARY: "secondary" as ButtonVariantType,
  ICON: "icon" as ButtonVariantType,
  TEXT: "text" as ButtonVariantType, // Using 'TEXT' instead of 'GHOST'
};

// Update ConfirmationDialogProps to match the user's latest definition
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: { normal: string; italic: string };
  icon?: FC<SVGProps<SVGSVGElement>>; // Updated: specific SVGProps
  content: string; // Updated: now strictly string
  buttonText: string;
  buttonVariant: ButtonVariantType;
  onButtonClick: () => void;
  footerText?: string;
  children?: ReactNode;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
}

// --- Mocks Setup ---

// 1. Mock framer-motion to simplify testing (no need to track animations)
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

// 3. Mock custom Button component. The path is relative to this test file
// (__test__/), so it must be "../../button" to resolve to components/button —
// the same module the component imports as "../button".
vi.mock("../../button", () => {
  const MockButton: FC<any> = ({ children, onClick, variant, fullWidth, ...props }) => (
    <button
      data-testid="mock-button" // This is the ID the original tests failed to find
      onClick={onClick}
      data-variant={variant} // Allows testing for correct variant
      data-fullwidth={fullWidth}
      {...props}
    >
      {children}
    </button>
  );

  return {
    Button: MockButton,
    // Source imports ButtonVariant from "../button" too; provide it so the
    // component can resolve its default secondary variant.
    ButtonVariant: {
      PRIMARY: "primary",
      DESTRUCTIVE: "destructive",
      SECONDARY: "secondary",
      ICON: "icon",
      TEXT: "text",
    },
  };
});

// 4. Mock custom CloseIcon
vi.mock("@assets/icons", () => {
  // Define MockCloseIcon INSIDE the factory to avoid hoisting issues
  const MockCloseIcon: FC<any> = ({ onClick, ...props }) => (
    <svg data-testid="mock-close-icon" onClick={onClick} {...props} />
  );

  return {
    CloseIcon: MockCloseIcon,
  };
});

// Mock Icon component that fits the new FC<SVGProps<SVGSVGElement>> signature
const MockIcon: FC<SVGProps<SVGSVGElement>> = props => (
  <svg data-testid="mock-icon" {...props}>
    <circle cx="5" cy="5" r="5" />
  </svg>
);

// Import the component after mocks
import ConfirmationDialog from "../ConfirmationDialog";

// --- Test Setup ---

const mockOnClose = vi.fn();
const mockOnButtonClick = vi.fn();
const mockOnSecondaryButtonClick = vi.fn();

const defaultProps: ConfirmationDialogProps = {
  isOpen: true,
  onClose: mockOnClose,
  title: { normal: "Are you", italic: "Sure?" },
  content: "This is the confirmation message.", // Strict string now
  buttonText: "Confirm Action",
  buttonVariant: ButtonVariant.PRIMARY,
  onButtonClick: mockOnButtonClick,
};

describe("ConfirmationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering & Structure Tests ---

  it("should render with correct title and content", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    // Check title rendering (combining normal and italic parts)
    expect(screen.getByText("Are you")).toBeInTheDocument();
    expect(screen.getByText("Sure?")).toHaveClass("italic font-bold");

    // Check content rendering
    expect(screen.getByText(defaultProps.content)).toBeInTheDocument();
  });

  it("should render inside an accessible modal dialog with a described-by body", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    // Carbon ComposedModal renders a role="dialog" element when open.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The description paragraph keeps its id for aria wiring.
    expect(document.getElementById("confirmation-dialog-description")).toHaveTextContent(
      defaultProps.content,
    );
  });

  it("should not render the dialog when isOpen is false", () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // --- Conditional Rendering Tests ---

  it("should render the optional Icon when provided", () => {
    render(<ConfirmationDialog {...defaultProps} icon={MockIcon} />);
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("should render children content when provided", () => {
    const childrenContent = <p data-testid="child">Hello Children</p>;
    render(<ConfirmationDialog {...defaultProps}>{childrenContent}</ConfirmationDialog>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should render footer text when provided", () => {
    const footer = "Legal fine print.";
    render(<ConfirmationDialog {...defaultProps} footerText={footer} />);
    expect(screen.getByText(footer)).toBeInTheDocument();
  });

  it("should render and style secondary button correctly", () => {
    const secondaryText = "Go Back";
    render(<ConfirmationDialog {...defaultProps} secondaryButtonText={secondaryText} />);

    // Scope to the mocked Button (data-testid) to avoid Carbon's focus-sentinel buttons.
    const buttons = screen.getAllByTestId("mock-button");
    expect(buttons).toHaveLength(2);
    expect(screen.getByText(secondaryText)).toBeInTheDocument();
    // Secondary button defaults to the SECONDARY variant.
    expect(screen.getByText(secondaryText).closest("button")).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("should NOT render secondary button when secondaryButtonText is undefined", () => {
    render(<ConfirmationDialog {...defaultProps} secondaryButtonText={undefined} />);
    expect(screen.getAllByTestId("mock-button")).toHaveLength(1);
  });

  // --- Interaction Tests ---

  it("should call onButtonClick when primary button is clicked", () => {
    render(<ConfirmationDialog {...defaultProps} />);
    const primaryButton = screen.getByText(defaultProps.buttonText);

    fireEvent.click(primaryButton);
    expect(mockOnButtonClick).toHaveBeenCalledTimes(1);
  });

  it("should call onSecondaryButtonClick when secondary button is clicked", () => {
    const secondaryText = "Secondary Action";
    render(
      <ConfirmationDialog
        {...defaultProps}
        secondaryButtonText={secondaryText}
        onSecondaryButtonClick={mockOnSecondaryButtonClick}
      />,
    );
    const secondaryButton = screen.getByText(secondaryText);

    fireEvent.click(secondaryButton);
    expect(mockOnSecondaryButtonClick).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when the CloseIcon is clicked", () => {
    render(<ConfirmationDialog {...defaultProps} />);
    const closeIcon = screen.getByTestId("mock-close-icon");

    fireEvent.click(closeIcon);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should pass the correct variant to the primary Button component", () => {
    render(<ConfirmationDialog {...defaultProps} buttonVariant={ButtonVariant.TEXT} />);
    const primaryButton = screen.getByText(defaultProps.buttonText).closest("button");

    expect(primaryButton).toBeInTheDocument();
    expect(primaryButton).toHaveAttribute("data-variant", "text");
  });
});
