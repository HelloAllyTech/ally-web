import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiLabErrorState } from "../AiLabErrorState";

/**
 * Before this existed, all six AI Lab tabs destructured only
 * {data, isLoading} — never isError — so a failed fetch fell into the exact
 * same branch as a genuinely empty list, complete with a "create one" call
 * to action inviting the admin to recreate data that already exists.
 */
describe("AiLabErrorState", () => {
  it("renders the given failure message", () => {
    render(<AiLabErrorState message="Couldn't load skills." />);

    expect(screen.getByText("Couldn't load skills.")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is omitted", () => {
    render(<AiLabErrorState message="Couldn't load skills." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a retry button that calls onRetry when provided", () => {
    const onRetry = vi.fn();
    render(<AiLabErrorState message="Couldn't load skills." onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: /retry/i });
    button.click();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
