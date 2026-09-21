import { describe, expect, it } from "vitest";

import { LIST_MAX_LOADED, loadMoreState, pageRange } from "../utils/paging";

describe("pageRange", () => {
  it("describes the first page of a multi-page list", () => {
    // The production case: 184 opportunities at 50 a page.
    const range = pageRange(0, 50, 184);
    expect(range).toMatchObject({
      rangeStart: 1,
      rangeEnd: 50,
      page: 1,
      totalPages: 4,
      canPrev: false,
      canNext: true,
      nextOffset: 50,
    });
  });

  it("stops the last page at the total rather than at a full page width", () => {
    const range = pageRange(150, 50, 184);
    expect(range).toMatchObject({
      rangeStart: 151,
      rangeEnd: 184,
      page: 4,
      totalPages: 4,
      canPrev: true,
      canNext: false,
    });
    // `next` must be a no-op on the last page, not an offset past the end.
    expect(range.nextOffset).toBe(150);
    expect(range.prevOffset).toBe(100);
  });

  it("shows 0–0 of 0 on an empty result set, and still reads as page 1 of 1", () => {
    expect(pageRange(0, 50, 0)).toMatchObject({
      rangeStart: 0,
      rangeEnd: 0,
      page: 1,
      totalPages: 1,
      canPrev: false,
      canNext: false,
    });
  });

  it("hides both controls when everything fits on one page", () => {
    expect(pageRange(0, 50, 12)).toMatchObject({
      rangeEnd: 12,
      totalPages: 1,
      canPrev: false,
      canNext: false,
    });
  });

  it("still offers a way back when a shrinking list leaves the offset past the end", () => {
    // A realtime delete (or a filter applied on the server) can drop `total` below the current
    // offset. The page renders empty, so Previous is the only escape and must stay enabled.
    const range = pageRange(150, 50, 20);
    expect(range.canPrev).toBe(true);
    expect(range.canNext).toBe(false);
    expect(range.prevOffset).toBe(100);
  });

  it("never lets prevOffset go negative", () => {
    expect(pageRange(20, 50, 184).prevOffset).toBe(0);
  });
});

describe("loadMoreState", () => {
  it("offers more while rows remain", () => {
    expect(loadMoreState(50, 159)).toEqual({ canLoadMore: true, atCeiling: false });
  });

  it("stops when everything is loaded", () => {
    expect(loadMoreState(159, 159)).toEqual({ canLoadMore: false, atCeiling: false });
  });

  it("reports the ceiling rather than silently stalling", () => {
    // The server clamps an over-large limit without erroring, so without this the button would
    // keep fetching the same 500 rows and look broken.
    expect(loadMoreState(LIST_MAX_LOADED, 900)).toEqual({ canLoadMore: false, atCeiling: true });
  });

  it("is not 'at ceiling' when the ceiling happens to equal the total", () => {
    expect(loadMoreState(LIST_MAX_LOADED, LIST_MAX_LOADED)).toEqual({
      canLoadMore: false,
      atCeiling: false,
    });
  });
});
