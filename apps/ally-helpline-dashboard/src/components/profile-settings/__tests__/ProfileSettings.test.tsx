import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProfileSettings } from "../ProfileSettings";

// Keep the test focused on the component's own markup — stub the heavy children.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
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

describe("ProfileSettings theme picker", () => {
  it("does not render the appearance picker when showThemePicker is false", () => {
    render(<ProfileSettings {...baseProps} showThemePicker={false} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("renders a swatch for each of the five themes when enabled", () => {
    render(
      <ProfileSettings
        {...baseProps}
        showThemePicker
        selectedTheme="daylight"
        onSelectTheme={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the selected theme as checked", () => {
    render(
      <ProfileSettings
        {...baseProps}
        showThemePicker
        selectedTheme="forest"
        onSelectTheme={vi.fn()}
      />,
    );
    const forest = screen.getByRole("radio", { name: "Forest" });
    expect(forest).toHaveAttribute("aria-checked", "true");
  });

  it("calls onSelectTheme with the chosen theme id", () => {
    const onSelectTheme = vi.fn();
    render(
      <ProfileSettings
        {...baseProps}
        showThemePicker
        selectedTheme="daylight"
        onSelectTheme={onSelectTheme}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Sunset" }));
    expect(onSelectTheme).toHaveBeenCalledWith("sunset");
  });
});
