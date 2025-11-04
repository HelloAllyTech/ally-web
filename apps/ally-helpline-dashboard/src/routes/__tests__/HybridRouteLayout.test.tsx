import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import HybridRouteLayout from "../HybridRouteLayout";

// Mock react-router-dom
vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: "/test" })),
  };
});

// Mock useAutoActiveCallRedirect hook
vi.mock("@hooks", () => ({
  useAutoActiveCallRedirect: vi.fn(),
}));

// Mock NavbarWrapper
vi.mock("../components", () => ({
  NavbarWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navbar-wrapper">{children}</div>
  ),
}));

describe("HybridRouteLayout", () => {
  it("renders without crashing", () => {
    render(<HybridRouteLayout />);
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("renders NavbarWrapper component", () => {
    render(<HybridRouteLayout />);

    const navbarWrapper = screen.getByTestId("navbar-wrapper");
    expect(navbarWrapper).toBeInTheDocument();
  });

  it("renders Outlet inside NavbarWrapper", () => {
    render(<HybridRouteLayout />);

    const navbarWrapper = screen.getByTestId("navbar-wrapper");
    const outlet = screen.getByTestId("outlet");

    expect(navbarWrapper).toBeInTheDocument();
    expect(outlet).toBeInTheDocument();
    expect(navbarWrapper).toContainElement(outlet);
  });

  it("has correct component structure", () => {
    render(<HybridRouteLayout />);

    // Should have NavbarWrapper as parent
    const navbarWrapper = screen.getByTestId("navbar-wrapper");
    expect(navbarWrapper).toBeInTheDocument();

    // Should have Outlet as child
    const outlet = screen.getByTestId("outlet");
    expect(outlet).toBeInTheDocument();
    expect(outlet).toHaveTextContent("Outlet Content");
  });

  it("passes children to NavbarWrapper", () => {
    render(<HybridRouteLayout />);

    // The Outlet should be rendered as children of NavbarWrapper
    const navbarWrapper = screen.getByTestId("navbar-wrapper");
    const outlet = screen.getByTestId("outlet");

    expect(navbarWrapper).toContainElement(outlet);
  });

  it("maintains proper nesting structure", () => {
    const { container } = render(<HybridRouteLayout />);

    // Check the nesting: HybridRouteLayout -> NavbarWrapper -> Outlet
    const navbarWrapper = screen.getByTestId("navbar-wrapper");
    const outlet = screen.getByTestId("outlet");

    expect(container.firstChild).toBe(navbarWrapper);
    expect(navbarWrapper).toContainElement(outlet);
  });
});
