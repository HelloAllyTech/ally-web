import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ isOpen, title, description, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div>
        <p>{title}</p>
        <p>{description}</p>
        <button onClick={primaryButton.onClick} disabled={primaryButton.disabled}>
          {primaryButton.label}
        </button>
        <button onClick={secondaryButton.onClick} disabled={secondaryButton.disabled}>
          {secondaryButton.label}
        </button>
      </div>
    ) : null,
}));

// eslint-disable-next-line import/first
import { ConfirmCancelDialog } from "../ConfirmCancelDialog";

/**
 * "Stop this build" used to cancel on a single click. This dialog is the gate
 * — the point of the test is that neither confirm nor dismiss can be reached
 * without going through it, and that the confirm action is the one actually
 * wired to `onConfirm`.
 */
describe("ConfirmCancelDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmCancelDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} isLoading={false} />,
    );
    expect(screen.queryByText("Stop it?")).toBeNull();
  });

  it("asks for confirmation before stopping the build", () => {
    render(
      <ConfirmCancelDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} isLoading={false} />,
    );

    expect(screen.getByText("Stop it?")).toBeInTheDocument();
  });

  it("only calls onConfirm when the confirm button is pressed", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmCancelDialog isOpen onClose={onClose} onConfirm={onConfirm} isLoading={false} />);

    fireEvent.click(screen.getByText("Stop this build"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismisses without confirming via the secondary button", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmCancelDialog isOpen onClose={onClose} onConfirm={onConfirm} isLoading={false} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables both buttons while a cancel is already in flight", () => {
    render(<ConfirmCancelDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} isLoading />);

    expect(screen.getByText("Stop this build")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});
