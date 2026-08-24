import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ErrorBoundary } from "../ErrorBoundary";

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("kaboom");
  }
  return <div>content rendered fine</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error to the console by design; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders a page-level fallback with the thrown message when a child throws", () => {
    render(
      <ErrorBoundary variant="page">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/stopped working/i)).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload the page/i })).toBeInTheDocument();
  });

  it("renders a compact panel fallback without a reload button in panel variant", () => {
    render(
      <ErrorBoundary variant="panel">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reload the page/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("recovers and remounts children after Try again is clicked", () => {
    let shouldThrow = true;
    const ThrowsOnce = () => <Bomb shouldThrow={shouldThrow} />;

    render(
      <ErrorBoundary variant="panel">
        <ThrowsOnce />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Fix the underlying condition, then click "Try again" — the boundary
    // should remount the subtree rather than simply re-rendering the same
    // instance (which would immediately hit the same throw).
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("content rendered fine")).toBeInTheDocument();
  });
});
