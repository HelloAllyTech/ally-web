import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SuspendedUser } from "../SuspendedUser";

// --- Mocks Setup ---

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock @assets
vi.mock("@assets", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    SuspendedUserIcon: (props: any) => <svg data-testid="suspended-user-icon" {...props} />,
  };
});

// --- Test Setup ---

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <SuspendedUser />
    </BrowserRouter>,
  );
};

describe("SuspendedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---

  it("should match snapshot when fully rendered", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the component successfully", () => {
    const { container } = renderComponent();
    expect(container).not.toBeNull();
  });

  it("should render without throwing errors", () => {
    expect(() => renderComponent()).not.toThrow();
  });

  it("should render a non-empty component", () => {
    const { container } = renderComponent();
    expect(container.firstChild).not.toBeNull();
  });

  it("should render the SuspendedUserIcon", () => {
    renderComponent();
    expect(screen.getByTestId("suspended-user-icon")).toBeInTheDocument();
  });

  it("should render the 'Account Suspended' title", () => {
    renderComponent();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();
  });

  it("should render the suspension message", () => {
    renderComponent();
    expect(screen.getByText("Your account has been suspended. Contact your")).toBeInTheDocument();
    expect(screen.getByText("administrator for assistance")).toBeInTheDocument();
  });

  it("should render the 'Go to login' button", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: /Go to login/i })).toBeInTheDocument();
  });

  // --- Structure Tests ---

  it("should render main container with correct layout", () => {
    const { container } = renderComponent();
    const mainContainer = container.querySelector(".flex.flex-col.justify-center.items-center");
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass("h-dvh", "gap-2");
  });

  it("should render inner container with border and padding", () => {
    const { container } = renderComponent();
    const innerContainer = container.querySelector(".border.rounded-lg");
    expect(innerContainer).toBeInTheDocument();
    expect(innerContainer).toHaveClass("px-16", "py-10");
  });

  // --- Interaction Tests ---

  it("should call navigate with '/' when 'Go to login' button is clicked", () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /Go to login/i });

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should handle multiple button clicks", () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /Go to login/i });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // --- Accessibility Tests ---

  it("should have a button element for navigation", () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /Go to login/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  // --- Edge Cases ---

  it("should render all text content correctly", () => {
    renderComponent();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();
    expect(screen.getByText("Your account has been suspended. Contact your")).toBeInTheDocument();
    expect(screen.getByText("administrator for assistance")).toBeInTheDocument();
    expect(screen.getByText("Go to login")).toBeInTheDocument();
  });

  it("should maintain component structure across rerenders", () => {
    const { rerender } = renderComponent();
    expect(screen.getByTestId("suspended-user-icon")).toBeInTheDocument();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <SuspendedUser />
      </BrowserRouter>,
    );

    expect(screen.getByTestId("suspended-user-icon")).toBeInTheDocument();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();
  });
});
