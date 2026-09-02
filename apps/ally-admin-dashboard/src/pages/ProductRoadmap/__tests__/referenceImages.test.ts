import { describe, expect, it } from "vitest";

import { sameReferenceImages } from "../utils/referenceImages";

/**
 * The comparison behind OpportunityDrawer's dirty check. The first test is the one that matters:
 * without it the drawer autosaves in a loop for as long as it is open.
 */
describe("sameReferenceImages", () => {
  it("treats equal lists in different array instances as the same", () => {
    const url = "https://assets/roadmap/reference-images/a.png";
    expect(sameReferenceImages([{ url }], [{ url }])).toBe(true);
  });

  it("sees a caption edit", () => {
    const url = "https://assets/roadmap/reference-images/a.png";
    expect(sameReferenceImages([{ url, caption: "Before" }], [{ url }])).toBe(false);
    expect(sameReferenceImages([{ url, caption: "Before" }], [{ url, caption: "After" }])).toBe(
      false,
    );
  });

  it("sees an addition and a removal", () => {
    const a = { url: "https://assets/roadmap/reference-images/a.png" };
    const b = { url: "https://assets/roadmap/reference-images/b.png" };
    expect(sameReferenceImages([a], [a, b])).toBe(false);
    expect(sameReferenceImages([a, b], [a])).toBe(false);
  });

  it("sees a REORDER — the order is stored, so it is a real edit", () => {
    const a = { url: "https://assets/roadmap/reference-images/a.png" };
    const b = { url: "https://assets/roadmap/reference-images/b.png" };
    expect(sameReferenceImages([a, b], [b, a])).toBe(false);
  });

  it("calls two empty lists the same, so an untouched drawer is never dirty", () => {
    expect(sameReferenceImages([], [])).toBe(true);
  });
});
