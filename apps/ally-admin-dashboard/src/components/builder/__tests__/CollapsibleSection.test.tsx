import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollapsibleSection } from "../CollapsibleSection";

/**
 * The session screen shows a checklist, a run rail, a transcript of every tool
 * call, the pull requests and a PRD panel, all at full weight at once. Folding
 * is the cheapest fix for that: nothing is removed, and the parts you are not
 * reading stop competing with the parts you are.
 */
describe("CollapsibleSection", () => {
  it("shows its content when open", () => {
    render(
      <CollapsibleSection heading="PULL REQUESTS">
        <p>inside</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("PULL REQUESTS")).toBeInTheDocument();
    expect(screen.getByText("inside")).toBeInTheDocument();
  });

  /**
   * A section that folds to a bare label makes you open it to discover there
   * was nothing worth opening.
   */
  it("keeps the meta visible so a folded section still says something", () => {
    render(
      <CollapsibleSection heading="CHECKLIST" meta="0 of 7" defaultOpen={false}>
        <p>inside</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("0 of 7")).toBeInTheDocument();
  });

  it("starts folded when asked to", () => {
    const { container } = render(
      <CollapsibleSection heading="CHECKLIST" defaultOpen={false}>
        <p>inside</p>
      </CollapsibleSection>,
    );

    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("starts open by default", () => {
    const { container } = render(
      <CollapsibleSection heading="RUNS">
        <p>inside</p>
      </CollapsibleSection>,
    );

    expect(container.querySelector("details")?.open).toBe(true);
  });

  /**
   * A native <details> is keyboard accessible and screen-reader correct without
   * the ARIA a div-and-state version would need — worth asserting, because
   * "make it collapsible" is usually where that gets lost.
   */
  it("uses a real disclosure element", () => {
    const { container } = render(
      <CollapsibleSection heading="RUNS">
        <p>inside</p>
      </CollapsibleSection>,
    );

    expect(container.querySelector("details > summary")).not.toBeNull();
  });
});
