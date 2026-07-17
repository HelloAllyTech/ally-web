import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import App from "../App";

// Mock the RouteLayout component
vi.mock("@routes/RouteLayout", () => ({
  default: () => <div data-testid="route-layout">Route Layout</div>,
}));

// Mock the shared Carbon design-system boundary. App now wraps its tree in
// AllyThemeProvider (from @ally-ui-mono/ui-shared) instead of MUI's
// ThemeProvider — there is no per-user theme switcher any more.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  AllyThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ally-theme-provider">{children}</div>
  ),
}));

// Mock Sonner Toaster
vi.mock("sonner", () => ({
  Toaster: ({ position, closeButton, toastOptions }: any) => (
    <div
      data-testid="toaster"
      data-position={position}
      data-close-button={closeButton}
      data-toast-options={JSON.stringify(toastOptions)}
    >
      Toaster Component
    </div>
  ),
}));

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByTestId("ally-theme-provider")).toBeInTheDocument();
  });

  it("wraps the app in the shared AllyThemeProvider", () => {
    render(<App />);

    const themeProvider = screen.getByTestId("ally-theme-provider");
    expect(themeProvider).toBeInTheDocument();
  });

  it("renders Toaster component with correct props", () => {
    render(<App />);

    const toaster = screen.getByTestId("toaster");
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveAttribute("data-position", "bottom-right");
    expect(toaster).toHaveAttribute("data-close-button", "true");
  });

  it("renders RouteLayout component", () => {
    render(<App />);

    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("has correct component structure", () => {
    const { container } = render(<App />);

    // AllyThemeProvider should be the root boundary
    const themeProvider = screen.getByTestId("ally-theme-provider");
    expect(container.firstChild).toBe(themeProvider);

    // Should contain Toaster and RouteLayout
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("passes correct toast options to Toaster", () => {
    render(<App />);

    const toaster = screen.getByTestId("toaster");
    const toastOptions = JSON.parse(toaster.getAttribute("data-toast-options") || "{}");

    expect(toastOptions).toMatchObject({
      classNames: {
        content: "mr-3",
        icon: "hidden",
        warning: expect.stringContaining("bg-"),
        closeButton: expect.stringContaining("absolute"),
      },
    });
  });

  it("renders all components in correct order", () => {
    render(<App />);

    // Check that all expected components are rendered
    expect(screen.getByTestId("ally-theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("applies the theme boundary to the application", () => {
    render(<App />);

    // AllyThemeProvider should wrap the entire app
    const themeProvider = screen.getByTestId("ally-theme-provider");
    expect(themeProvider).toBeInTheDocument();

    // RouteLayout should be inside AllyThemeProvider
    const routeLayout = screen.getByTestId("route-layout");
    expect(themeProvider).toContainElement(routeLayout);
  });

  it("configures Toaster with proper positioning", () => {
    render(<App />);

    const toaster = screen.getByTestId("toaster");
    expect(toaster).toHaveAttribute("data-position", "bottom-right");
    expect(toaster).toHaveAttribute("data-close-button", "true");
  });
});
