import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "../ErrorBoundary";

const loggerError = vi.fn();

vi.mock("@utils", () => ({ logger: { error: (msg: string) => loggerError(msg) } }));

// @constants reads `cellTypes` off the @components barrel at module-eval time,
// which drags the whole barrel — and a barrel member that reads back from the
// still-evaluating @constants blows up. Same stub, same reason, as the
// BugHunter tests.
vi.mock("@components", () => ({ cellTypes: {} }));

/** Throws on demand so a test can flip a boundary from healthy to crashed. */
const Boom = ({ explode, message }: { explode: boolean; message?: string }) => {
  if (explode) throw new Error(message ?? "steps is not iterable");
  return <p>the real content</p>;
};

// React logs every caught error to console.error itself, and so does the
// boundary. Silenced so a passing run isn't a wall of expected stack traces.
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("ErrorBoundary", () => {
  beforeEach(() => vi.clearAllMocks());
  afterAll(() => consoleError.mockRestore());

  it("renders its children untouched while nothing is wrong", () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("the real content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /**
   * The whole point: before this component existed a throw here unmounted the
   * app and left a blank white page.
   */
  it("shows a recoverable panel instead of a blank screen when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/this page stopped working/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
  });

  it("surfaces the thrown message, so a report names the actual failure", () => {
    render(
      <ErrorBoundary>
        <Boom explode message="Cannot read properties of undefined (reading 'some')" />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/Cannot read properties of undefined \(reading 'some'\)/),
    ).toBeInTheDocument();
  });

  it("logs the crash to the in-app log, so it leaves a trail to read later", () => {
    render(
      <ErrorBoundary>
        <Boom explode message="boom" />
      </ErrorBoundary>,
    );
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });

  it("re-renders the children on Try again, recovering once the cause is gone", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Whatever caused it has passed (a refetch landed, a toggle flipped).
    rerender(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("the real content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /**
   * React Router reuses this element position between routes, so a boundary
   * that kept its error would greet you with the last page's crash on the next
   * page you opened.
   */
  it("clears the error when resetKey changes, so navigating away is a fresh start", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/bug-hunter">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/users">
        <Boom explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("the real content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps showing the error while resetKey is unchanged", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/bug-hunter">
        <Boom explode />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary resetKey="/bug-hunter">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  describe("panel variant", () => {
    it("offers no page reload — an overreaction to one broken section", () => {
      render(
        <ErrorBoundary variant="panel">
          <Boom explode />
        </ErrorBoundary>,
      );
      expect(screen.getByText(/this panel stopped working/i)).toBeInTheDocument();
      expect(screen.queryByText(/Reload the page/)).not.toBeInTheDocument();
    });

    it("offers the close the crashed panel can no longer offer itself", () => {
      const onDismiss = vi.fn();
      render(
        <ErrorBoundary variant="panel" onDismiss={onDismiss}>
          <Boom explode />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByText("Close"));
      expect(onDismiss).toHaveBeenCalled();
    });

    it("shows no close button when the caller has nothing to close", () => {
      render(
        <ErrorBoundary variant="panel">
          <Boom explode />
        </ErrorBoundary>,
      );
      expect(screen.queryByText("Close")).not.toBeInTheDocument();
    });
  });
});
