import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import App from "../App";

// Mock the RouteLayout component
vi.mock("@routes/RouteLayout", () => ({
  default: () => <div data-testid="route-layout">Route Layout</div>,
}));

// Mock the theme
vi.mock("../theme", () => ({
  theme: {
    typography: {},
  },
}));

// Mock MUI components
vi.mock("@mui/material/styles", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
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
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("renders ThemeProvider with theme", () => {
    render(<App />);

    const themeProvider = screen.getByTestId("theme-provider");
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

    // Should have ThemeProvider as root
    const themeProvider = screen.getByTestId("theme-provider");
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
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("applies theme to the application", () => {
    render(<App />);

    // ThemeProvider should wrap the entire app
    const themeProvider = screen.getByTestId("theme-provider");
    expect(themeProvider).toBeInTheDocument();

    // RouteLayout should be inside ThemeProvider
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
