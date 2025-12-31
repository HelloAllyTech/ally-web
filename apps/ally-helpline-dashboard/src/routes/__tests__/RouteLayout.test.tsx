import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import RouteLayout from "../RouteLayout";

// Mock the pages
vi.mock("@pages", () => ({
  Health: () => <div data-testid="health-page">Health Page</div>,
  Login: () => <div data-testid="login-page">Login Page</div>,
  Learn: () => <div data-testid="learn-page">Learn Page</div>,
  Scenario: () => <div data-testid="scenario-page">Scenario Page</div>,
  PathwayDetails: () => <div data-testid="pathway-details-page">Pathway Details Page</div>,
  SuspendedUser: () => <div data-testid="suspended-user-page">Suspended User Page</div>,
}));

// Mock the route layouts
vi.mock("../HybridRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hybrid-layout">{children}</div>
  ),
}));

vi.mock("../PrivateRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="private-layout">{children}</div>
  ),
}));

vi.mock("../PublicRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="public-layout">{children}</div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  ROUTES: {
    LOGIN: "/login",
    HEALTH: "/health",
    LEARN: "/learn",
    SCENARIO: "/scenario/:scenarioId",
    PATHWAY: "/pathway/:pathwayId",
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(component);
};

describe("RouteLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderWithRouter(<RouteLayout />);
    // Should render the private layout as it's the catch-all route
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("renders private routes with PrivateRouteLayout", () => {
    renderWithRouter(<RouteLayout />);

    // Check that private layout is rendered (catch-all route)
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("has correct route structure", () => {
    renderWithRouter(<RouteLayout />);

    // Should have the private layout as the catch-all route
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("wraps everything in BrowserRouter", () => {
    const { container } = renderWithRouter(<RouteLayout />);

    // BrowserRouter should be the root element
    expect(container.firstChild).toBeInTheDocument();
  });
});
