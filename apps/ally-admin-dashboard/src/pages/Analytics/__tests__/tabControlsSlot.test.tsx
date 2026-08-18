import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TabControls, TabControlsSlotProvider } from "../tabControlsSlot";

/**
 * The point of the slot is that a tab's own slice pickers land in the SAME row
 * as the page's language and time range, so every number on the page is read
 * against one visible filter state. Two things can silently break that: the
 * control landing back inside the panel (two control groups again), or the
 * control vanishing when no slot is mounted. Both are invisible in a
 * typecheck, so they are pinned here.
 */
describe("TabControls slot", () => {
  it("renders into the page-level slot when one is provided", () => {
    const slot = document.createElement("div");
    slot.setAttribute("data-testid", "slot");
    document.body.appendChild(slot);

    render(
      <TabControlsSlotProvider value={slot}>
        <div data-testid="panel">
          <TabControls>
            <button type="button">Model</button>
          </TabControls>
        </div>
      </TabControlsSlotProvider>,
    );

    const control = screen.getByRole("button", { name: "Model" });
    expect(slot).toContainElement(control);
    expect(screen.getByTestId("panel")).not.toContainElement(control);
  });

  it("falls back to rendering in place when no slot is mounted", () => {
    render(
      <div data-testid="panel">
        <TabControls>
          <button type="button">Model</button>
        </TabControls>
      </div>,
    );

    expect(screen.getByTestId("panel")).toContainElement(
      screen.getByRole("button", { name: "Model" }),
    );
  });
});
