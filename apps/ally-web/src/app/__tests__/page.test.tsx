import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import SearchPage from "../page";

// Mock the logger
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ErrorState uses useRouter for its retry action
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock the fetchReferenceDocuments function to throw an error
vi.mock("../api", () => ({
  fetchReferenceDocuments: vi.fn().mockRejectedValue(new Error("API Error")),
}));

describe("Search Page (Vitest)", () => {
  it("renders without crashing", async () => {
    const component = await SearchPage({ searchParams: {} });
    const { container } = render(component);
    expect(container).toBeDefined();
  });

  it("displays error message when API fails", async () => {
    const component = await SearchPage({ searchParams: {} });
    render(component);
    expect(screen.getByText("Error loading search results.")).toBeInTheDocument();
  });

  it("handles search query parameter in error state", async () => {
    const component = await SearchPage({ searchParams: { q: "test query" } });
    render(component);
    expect(screen.getByText("Error loading search results.")).toBeInTheDocument();
  });

  it("handles category parameter in error state", async () => {
    const component = await SearchPage({ searchParams: { category: "test-category" } });
    render(component);
    expect(screen.getByText("Error loading search results.")).toBeInTheDocument();
  });

  it("should have proper error handling with a retry affordance", async () => {
    const component = await SearchPage({ searchParams: { q: "vitest query" } });
    render(component);

    const errorElement = screen.getByText("Error loading search results.");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement.tagName).toBe("H1");
    expect(screen.getByTestId("error-state-retry")).toBeInTheDocument();
  });
});
