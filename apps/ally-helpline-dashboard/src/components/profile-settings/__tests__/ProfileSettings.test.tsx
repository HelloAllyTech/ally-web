import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProfileSettings } from "../ProfileSettings";

// Keep the test focused on the component's own markup — stub the heavy children.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
  // Carbon's ComposedModal keeps mounted but toggles `open`; the stub mirrors that.
  ComposedModal: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
  ModalBody: ({ children, className }: any) => <div className={className}>{children}</div>,
  ModalFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@assets", () => ({
  CloseIcon: (props: any) => <button data-testid="close-icon" {...props} />,
}));

vi.mock("../../button", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  userData: { name: "Test", email: "test@example.com" } as any,
  onButtonClick: vi.fn(),
};

describe("ProfileSettings", () => {
  it("renders the dialog with title and action buttons when open", () => {
    render(<ProfileSettings {...baseProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("does not render the dialog content when isOpen is false", () => {
    render(<ProfileSettings {...baseProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
  });

  it("calls onClose when the cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<ProfileSettings {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close icon is clicked", () => {
    const onClose = vi.fn();
    render(<ProfileSettings {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("close-icon"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onButtonClick when the done button is clicked", () => {
    const onButtonClick = vi.fn();
    render(<ProfileSettings {...baseProps} onButtonClick={onButtonClick} />);
    fireEvent.click(screen.getByText("Done"));
    expect(onButtonClick).toHaveBeenCalledTimes(1);
  });
});
