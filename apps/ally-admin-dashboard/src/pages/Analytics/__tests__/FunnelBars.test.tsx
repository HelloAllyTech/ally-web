import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FunnelBars } from "../FunnelBars";

/**
 * The behaviour under test is a privacy rule, not a formatting preference.
 *
 * Learner-level funnels come from the server with their percentages already
 * suppressed when the denominator falls below the minimum group size — "67% of
 * previous" over three learners identifies one of them. The widget must render
 * those nulls as nulls; recomputing them from the counts would quietly undo the
 * suppression the backend exists to apply.
 */
describe("FunnelBars", () => {
  it("computes shares from counts when the caller supplies none", () => {
    // The legacy contract: funnels over populations that identify nobody
    // (sessions, enrollments, orgs) still get client-side percentages.
    render(
      <FunnelBars
        stages={[
          { label: "Enrolled", reached: 100 },
          { label: "Started", reached: 40 },
        ]}
        unit="enrollments"
      />,
    );

    expect(screen.getByText("100% of enrollments")).toBeInTheDocument();
    expect(screen.getByText("40% of previous")).toBeInTheDocument();
  });

  it("renders a server-supplied share instead of its own arithmetic", () => {
    render(
      <FunnelBars
        stages={[
          { label: "Practised once", reached: 100, ofEnteredPct: 100, ofPreviousPct: null },
          // Deliberately NOT 40%: the server's figure wins even when the counts
          // would produce something else, because the server applied the rule.
          { label: "Came back", reached: 40, ofEnteredPct: 37.5, ofPreviousPct: 37.5 },
        ]}
        unit="learners"
      />,
    );

    expect(screen.getByText("37.5% of previous")).toBeInTheDocument();
    expect(screen.queryByText("40% of previous")).not.toBeInTheDocument();
  });

  it("shows an em dash for a suppressed share, never a recomputed number", () => {
    render(
      <FunnelBars
        stages={[
          { label: "Practised once", reached: 4, ofEnteredPct: null, ofPreviousPct: null },
          { label: "Came back", reached: 2, ofEnteredPct: null, ofPreviousPct: null },
        ]}
        unit="learners"
      />,
    );

    // Two suppressed rows, two dashes — and no percentage anywhere.
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("still shows the counts when the shares are suppressed", () => {
    // A count is not an estimate of anything and leaks nothing on its own, so
    // suppression must not blank the whole row.
    render(
      <FunnelBars
        stages={[
          { label: "Practised once", reached: 4, ofEnteredPct: null, ofPreviousPct: null },
        ]}
      />,
    );

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders nothing for an empty funnel", () => {
    const { container } = render(<FunnelBars stages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
