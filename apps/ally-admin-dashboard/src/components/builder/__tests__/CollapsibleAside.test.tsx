import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CollapsibleAside } from "../CollapsibleAside";

/**
 * The PRD beside a running build. Once a build exists the document is frozen
 * reference — worth reaching for, not worth 38% of the window for the whole
 * time you are reading a transcript.
 */
describe("CollapsibleAside", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const setup = () =>
    render(
      <CollapsibleAside label="PRD" storageKey="builder.prdAside" widthClassName="w-[38%]">
        <p>the document</p>
      </CollapsibleAside>,
    );

  it("shows its content by default", () => {
    setup();
    expect(screen.getByText("the document")).toBeInTheDocument();
  });

  it("folds to a rail that still names what it is hiding", () => {
    setup();
    fireEvent.click(screen.getByTitle("Hide PRD"));

    expect(screen.queryByText("the document")).not.toBeInTheDocument();
    expect(screen.getByTitle("Show PRD")).toBeInTheDocument();
  });

  it("comes back", () => {
    setup();
    fireEvent.click(screen.getByTitle("Hide PRD"));
    fireEvent.click(screen.getByTitle("Show PRD"));

    expect(screen.getByText("the document")).toBeInTheDocument();
  });

  /** A reading preference that resets on every navigation is not a preference. */
  it("remembers the choice across mounts", () => {
    const { unmount } = setup();
    fireEvent.click(screen.getByTitle("Hide PRD"));
    unmount();

    setup();
    expect(screen.queryByText("the document")).not.toBeInTheDocument();
  });

  /**
   * Storage throws in a private window and returns nothing after a clear. A
   * preference is never worth a blank page.
   */
  it("opens normally when storage is unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    setup();
    expect(screen.getByText("the document")).toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByTitle("Hide PRD"))).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
