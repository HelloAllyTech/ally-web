import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import ErrorState from "../ErrorState";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("ErrorState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default title, description and retry button", () => {
    render(<ErrorState />);

    expect(screen.getByText("Error loading search results.")).toBeInTheDocument();
    expect(screen.getByTestId("error-state-retry")).toBeInTheDocument();
  });

  it("refreshes the route on retry by default", () => {
    render(<ErrorState />);

    fireEvent.click(screen.getByTestId("error-state-retry"));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("uses the custom retry handler when provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId("error-state-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
