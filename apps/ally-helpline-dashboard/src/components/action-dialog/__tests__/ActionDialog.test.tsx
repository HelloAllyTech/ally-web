import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, vi, expect } from "vitest";

import ActionDialog from "../ActionDialog";
import { ActionDialogProps } from "../types";

describe("ActionDialog", () => {
  const defaultProps: ActionDialogProps = {
    title: "Test Title",
    open: true,
    onClose: vi.fn(),
    primaryButton: {
      label: "Primary",
      onClick: vi.fn(),
      variant: "primary" as const,
    },
    secondaryButton: {
      label: "Secondary",
      onClick: vi.fn(),
    },
    children: <span>Content</span>,
  };

  it("renders dialog, title, and children", () => {
    render(<ActionDialog {...defaultProps} />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders both buttons when show flags are true", () => {
    render(<ActionDialog {...defaultProps} />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
  });

  it("hides primary button when showPrimaryButton is false", () => {
    render(<ActionDialog {...defaultProps} showPrimaryButton={false} />);
    expect(screen.queryByText("Primary")).toBeNull();
  });

  it("hides secondary button when showSecondaryButton is false", () => {
    render(<ActionDialog {...defaultProps} showSecondaryButton={false} />);
    expect(screen.queryByText("Secondary")).toBeNull();
  });

  it("calls primary button onClick", () => {
    const primaryClick = vi.fn();
    render(
      <ActionDialog
        {...defaultProps}
        primaryButton={{ ...defaultProps.primaryButton, onClick: primaryClick }}
      />,
    );
    fireEvent.click(screen.getByText("Primary"));
    expect(primaryClick).toHaveBeenCalledTimes(1);
  });

  it("calls secondary button onClick", () => {
    const secondaryClick = vi.fn();
    render(
      <ActionDialog
        {...defaultProps}
        secondaryButton={{ ...defaultProps.secondaryButton, onClick: secondaryClick }}
      />,
    );
    fireEvent.click(screen.getByText("Secondary"));
    expect(secondaryClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(<ActionDialog {...defaultProps} onClose={onClose} />);
    // Carbon ModalHeader renders the close control as a button labelled "Close".
    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render dialog when open is false", () => {
    render(<ActionDialog {...defaultProps} open={false} />);
    // Carbon's ComposedModal stays mounted but the dialog is hidden (aria-hidden)
    // when closed, so it is absent from the accessibility tree.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

//snapshot
describe("ActionDialog snapshot", () => {
  it("matches the snapshot", () => {
    const { container } = render(
      <ActionDialog
        title="Snapshot Test"
        open={true}
        onClose={() => {}}
        primaryButton={{ label: "Primary", onClick: () => {}, variant: "primary" }}
        secondaryButton={{ label: "Secondary", onClick: () => {} }}
      >
        <span>Snapshot Content</span>
      </ActionDialog>,
    );
    expect(container).toMatchSnapshot();
  });
});
