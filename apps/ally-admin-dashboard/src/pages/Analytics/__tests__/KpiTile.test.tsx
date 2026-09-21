import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiTile } from "../chartKit";

/**
 * The KPI strip is the part of the Analytics page most likely to be
 * screenshotted on its own, so a tile's definition has to be on its face in
 * every state — including while the value is still loading and when the sample
 * is too thin to state a number. A definition that only survives the happy path
 * is a definition the reader will be missing exactly when they need it.
 */
describe("KpiTile description", () => {
  const description = "Organisations with at least one completed simulation in this range.";

  it("renders the definition alongside the value", () => {
    render(<KpiTile label="Active orgs" description={description} value="12" />);

    expect(screen.getByText("Active orgs")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("keeps the definition visible while loading, so it doesn't shift in later", () => {
    render(<KpiTile label="Active orgs" description={description} value="12" loading />);

    expect(screen.queryByText("12")).not.toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("keeps the definition visible in the thin-sample state", () => {
    render(
      <KpiTile
        label="Avg quality score"
        description={description}
        value="82.0"
        n={4}
        nUnit="evaluated sessions"
        minN={20}
      />,
    );

    expect(screen.getByText("Not enough data")).toBeInTheDocument();
    expect(screen.queryByText("82.0")).not.toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("omits the line entirely when no description is given", () => {
    const { container } = render(<KpiTile label="Active orgs" value="12" />);

    expect(container.textContent).not.toContain(description);
  });
});

/**
 * A fetch failure must never look like a legitimate zero or thin sample — the
 * exact bug this state was added to close: `isLoading` resolves to `false` on
 * error, so with no error state the value branch rendered
 * `formatCount(undefined)` as "—", indistinguishable from a real zero.
 */
describe("KpiTile error state", () => {
  it("shows an error notice instead of the value, and never the raw value", () => {
    render(<KpiTile label="Active orgs" value="12" error />);

    expect(screen.getByText("Couldn't load")).toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("keeps the definition visible in the error state too", () => {
    const definition = "Organisations with at least one completed simulation in this range.";
    render(<KpiTile label="Active orgs" description={definition} value="12" error />);

    expect(screen.getByText(definition)).toBeInTheDocument();
  });

  it("shows a retry button only when onRetry is provided", () => {
    const { rerender } = render(<KpiTile label="Active orgs" value="12" error />);
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();

    const onRetry = () => {};
    rerender(<KpiTile label="Active orgs" value="12" error onRetry={onRetry} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("error takes precedence over the thin-sample state", () => {
    // Same precedence as ChartCard (loading -> error -> thin -> value): a
    // failed fetch is never allowed to fall through to a data-shaped state.
    render(
      <KpiTile
        label="Avg quality score"
        value="82.0"
        n={4}
        nUnit="evaluated sessions"
        minN={20}
        error
      />,
    );

    expect(screen.getByText("Couldn't load")).toBeInTheDocument();
    expect(screen.queryByText("Not enough data")).not.toBeInTheDocument();
  });

  it("loading takes precedence over error", () => {
    render(<KpiTile label="Active orgs" value="12" loading error />);

    expect(screen.queryByText("Couldn't load")).not.toBeInTheDocument();
  });
});
