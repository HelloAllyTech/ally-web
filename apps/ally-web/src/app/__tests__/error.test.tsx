import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import { logger } from "@lifeline-ui-mono/ui-shared";

import ErrorComponent from "../error";

vi.mock("@lifeline-ui-mono/ui-shared", () => {
  return {
    logger: {
      info: vi.fn(),
    },
  };
});

describe("app/error.tsx", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("renders error heading and logs once", () => {
    const error = new Error("boom");
    render(<ErrorComponent error={error as any} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });
});
