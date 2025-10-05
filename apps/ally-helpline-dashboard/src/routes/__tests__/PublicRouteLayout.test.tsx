import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import PublicRouteLayout from "../PublicRouteLayout";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

describe("PublicRouteLayout", () => {
  it("renders without crashing", () => {
    render(<PublicRouteLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("renders the Outlet component", () => {
    render(<PublicRouteLayout />);

    const outlet = screen.getByTestId("outlet");
    expect(outlet).toBeInTheDocument();
    expect(outlet).toHaveTextContent("Outlet Content");
  });

  it("has correct structure with div wrapper", () => {
    const { container } = render(<PublicRouteLayout />);

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toBeInTheDocument();
    expect(wrapperDiv?.tagName).toBe("DIV");
  });

  it("renders children through Outlet", () => {
    render(<PublicRouteLayout />);

    // The Outlet should be rendered inside the wrapper div
    const outlet = screen.getByTestId("outlet");
    expect(outlet).toBeInTheDocument();
  });

  it("has minimal styling structure", () => {
    const { container } = render(<PublicRouteLayout />);

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toBeInTheDocument();
    // Should be a simple div without complex styling
    expect(wrapperDiv.className).toBe("");
  });
});
