import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartCard, ChartIdBadge, KpiTile } from "../chartKit";

/**
 * The chart id ("admin analytics question id", e.g. AAQ-042) is the stable
 * handle used to refer to one specific chart. It must render next to the chart
 * so a reader can read and quote it, and it must never appear when no id is
 * given (older call sites, and the many charts that predate the registry, must
 * look exactly as they did).
 */
describe("ChartIdBadge", () => {
  it("shows the id when one is given", () => {
    render(<ChartIdBadge id="AAQ-042" />);
    expect(screen.getByText("AAQ-042")).toBeInTheDocument();
  });

  it("renders nothing when no id is given", () => {
    const { container } = render(<ChartIdBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is exposed as a copy affordance", () => {
    render(<ChartIdBadge id="AAQ-042" />);
    const badge = screen.getByRole("button", { name: /AAQ-042/ });
    expect(badge).toHaveAttribute("title", expect.stringContaining("AAQ-042"));
  });

  it("renders beside a ChartCard title", () => {
    render(
      <ChartCard chartId="AAQ-015" title="Practising learners per period">
        <div>chart body</div>
      </ChartCard>,
    );
    expect(screen.getByText("Practising learners per period")).toBeInTheDocument();
    expect(screen.getByText("AAQ-015")).toBeInTheDocument();
  });

  it("renders beside a KpiTile label", () => {
    render(<KpiTile chartId="AAQ-013" label="Practising learners" value="1,204" />);
    expect(screen.getByText("Practising learners")).toBeInTheDocument();
    expect(screen.getByText("AAQ-013")).toBeInTheDocument();
  });

  it("a ChartCard with no chartId shows no badge", () => {
    render(
      <ChartCard title="Some chart">
        <div>chart body</div>
      </ChartCard>,
    );
    expect(screen.queryByText(/^AAQ-\d{3}$/)).not.toBeInTheDocument();
  });
});
