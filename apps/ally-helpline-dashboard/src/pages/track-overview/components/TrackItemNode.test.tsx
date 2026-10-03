import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { TrackItemNode } from "./TrackItemNode";
import { TrackDetailItem, TrackItemStatus, TrackItemType } from "@types";

const mockItem: TrackDetailItem = {
  id: "1",
  title: "Test Item",
  status: TrackItemStatus.LOCKED,
  type: TrackItemType.ARTICLE,
  order: 1,
  startedAt: null,
  completedAt: null,
  languageCode: "en",
  languageIsOriginal: true,
};

describe("TrackItemNode", () => {
  it("renders as a non-interactive element when locked", () => {
    const handleClick = vi.fn();
    render(
      <TrackItemNode
        item={mockItem}
        index={0}
        isNext={false}
        onClick={handleClick}
      />
    );

    const element = screen.getByLabelText(mockItem.title);
    expect(element.tagName).not.toBe("BUTTON");
  });

  it("does not call onClick when locked and clicked", () => {
    const handleClick = vi.fn();
    render(
      <TrackItemNode
        item={{ ...mockItem, status: TrackItemStatus.LOCKED }}
        index={0}
        isNext={false}
        onClick={handleClick}
      />
    );

    // Even if it's not a button, it might be inside a clickable element.
    // We select by title which should be the aria-label.
    const element = screen.getByLabelText(mockItem.title);
    fireEvent.click(element);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders as a button and is clickable when unlocked", () => {
    const handleClick = vi.fn();
    render(
      <TrackItemNode
        item={{ ...mockItem, status: TrackItemStatus.UNLOCKED }}
        index={0}
        isNext={false}
        onClick={handleClick}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
