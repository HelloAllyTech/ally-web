import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import { logger } from "@ally-ui-mono/ui-shared";

import ErrorComponent from "../error";

vi.mock("@ally-ui-mono/ui-shared", () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe("app/error.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error heading and logs once", () => {
    const error = new Error("boom");
    render(<ErrorComponent error={error as any} reset={vi.fn()} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("calls reset when the retry button is clicked", () => {
    const reset = vi.fn();
    render(<ErrorComponent error={new Error("boom") as any} reset={reset} />);

    fireEvent.click(screen.getByTestId("error-page-retry"));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
