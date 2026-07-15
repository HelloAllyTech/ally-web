import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StarYellowIcon } from "@assets";
import { STAR_COLOR_EMPTY, STAR_COLOR_FILLED } from "@constants/rating";

/**
 * These tests render the REAL svg (the rating component tests mock the icon and
 * therefore only prove which colour string is passed, not that the star is
 * actually painted).
 *
 * The rating stars rendered completely invisibly because the icon wrapped its
 * path in `<g clip-path="url(#clip0_...)">` with a hardcoded clip id. With five
 * (or ten) stars inlined on one page, every instance reused that same id, and
 * the shared clip erased the star shape — colour changes made no difference.
 * The clip bounded to ~the whole viewBox and served no purpose, so it was
 * removed. These tests guard both that regression and the colour handling.
 */
describe("StarYellowIcon", () => {
  it("is not wrapped in a clip that can erase the shape", () => {
    const { container } = render(<StarYellowIcon fill={STAR_COLOR_EMPTY} />);
    // A hardcoded clip id is reused across every inlined instance and clipped the
    // star to nothing — the star must render unclipped.
    expect(container.querySelector("[clip-path]")).toBeNull();
    expect(container.querySelector("clipPath")).toBeNull();
  });

  it("paints the whole star in the given fill colour", () => {
    const { container } = render(<StarYellowIcon fill={STAR_COLOR_EMPTY} />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", STAR_COLOR_EMPTY);
  });

  it("has no hardcoded stroke/fill on the star path that would override the colour", () => {
    const { container } = render(<StarYellowIcon fill={STAR_COLOR_EMPTY} />);
    const path = container.querySelector("path");
    expect(path).toBeTruthy();
    // The path must inherit colour from the root <svg>; a hardcoded stroke or fill
    // here is what previously left empty stars a near-invisible outline.
    expect(path).not.toHaveAttribute("stroke");
    expect(path).not.toHaveAttribute("fill");
  });

  it("never renders an empty star with a white or transparent interior", () => {
    const { container } = render(<StarYellowIcon fill={STAR_COLOR_EMPTY} />);
    const fill = container.querySelector("svg")?.getAttribute("fill")?.toLowerCase();
    expect(fill).not.toBe("none");
    expect(fill).not.toBe("#ffffff");
    expect(fill).not.toBe("#fff");
  });

  it("renders the filled state in gold", () => {
    const { container } = render(<StarYellowIcon fill={STAR_COLOR_FILLED} />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", STAR_COLOR_FILLED);
  });

  it("keeps the empty and filled colours distinct and visible", () => {
    expect(STAR_COLOR_EMPTY).not.toBe(STAR_COLOR_FILLED);
    expect(STAR_COLOR_EMPTY.toLowerCase()).not.toBe("#ffffff");
    expect(STAR_COLOR_EMPTY.toLowerCase()).not.toBe("#fff");
  });
});
