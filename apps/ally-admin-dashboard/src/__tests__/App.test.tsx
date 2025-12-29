import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import App from "../App";

// Mock RouteLayout component
vi.mock("@routes/RouteLayout", () => ({
  RouteLayout: () => <div data-testid="route-layout">RouteLayout</div>,
}));

// Mock sonner Toaster component
vi.mock("sonner", () => ({
  Toaster: ({
    position,
    richColors,
    toastOptions,
    style,
  }: {
    position: string;
    richColors: boolean;
    toastOptions: Record<string, unknown>;
    style: Record<string, unknown>;
  }) => (
    <div
      data-testid="toaster"
      data-position={position}
      data-rich-colors={richColors}
      data-toast-options={JSON.stringify(toastOptions)}
      data-style={JSON.stringify(style)}
    >
      Toaster
    </div>
  ),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("renders RouteLayout component", () => {
    render(<App />);
    const routeLayout = screen.getByTestId("route-layout");
    expect(routeLayout).toBeInTheDocument();
    expect(routeLayout).toHaveTextContent("RouteLayout");
  });

  it("renders Toaster component", () => {
    render(<App />);
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveTextContent("Toaster");
  });

  it("configures Toaster with correct position", () => {
    render(<App />);
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toHaveAttribute("data-position", "bottom-right");
  });

  it("configures Toaster with richColors enabled", () => {
    render(<App />);
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toHaveAttribute("data-rich-colors", "true");
  });

  it("configures Toaster with correct toast options", () => {
    render(<App />);
    const toaster = screen.getByTestId("toaster");
    const toastOptions = JSON.parse(toaster.getAttribute("data-toast-options") || "{}");

    expect(toastOptions).toHaveProperty("style");
    expect(toastOptions.style).toHaveProperty("transform", "translateZ(0)");
    expect(toastOptions.style).toHaveProperty("willChange", "transform");
  });

  it("configures Toaster with correct style prop", () => {
    render(<App />);
    const toaster = screen.getByTestId("toaster");
    const style = JSON.parse(toaster.getAttribute("data-style") || "{}");

    expect(style).toHaveProperty("transform", "translateZ(0)");
    expect(style).toHaveProperty("willChange", "transform");
  });

  it("renders both RouteLayout and Toaster in the same component", () => {
    render(<App />);
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("exports App as default export", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });
});
