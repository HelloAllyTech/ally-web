import { durationFast02, durationModerate02, durationSlow01, easings } from "@carbon/motion";
import { describe, expect, it } from "vitest";

import { CARBON_DURATION, CARBON_EASE, CARBON_MOTION, stillness } from "../carbonMotion";

/**
 * The point of these is not that the numbers are correct today — it is that
 * they stay tied to the package. Transcribed design tokens drift silently; the
 * whole reason this module derives them is so a Carbon upgrade that retunes a
 * curve shows up here instead of quietly leaving this tab on the old one.
 */
describe("carbonMotion — derived from @carbon/motion, not transcribed", () => {
  it("converts Carbon's millisecond tokens to the seconds framer-motion wants", () => {
    expect(CARBON_DURATION.fast02).toBeCloseTo(Number.parseFloat(durationFast02) / 1000);
    expect(CARBON_DURATION.moderate02).toBeCloseTo(Number.parseFloat(durationModerate02) / 1000);
    expect(CARBON_DURATION.slow01).toBeCloseTo(Number.parseFloat(durationSlow01) / 1000);

    // Guards the unit, which is the one thing a silent mistake here would be:
    // 240 instead of 0.24 is a four-minute animation, not a broken build.
    expect(CARBON_DURATION.moderate02).toBeLessThan(1);
  });

  it("parses each easing into the four control points, in order", () => {
    expect(CARBON_EASE.standardProductive).toEqual([0.2, 0, 0.38, 0.9]);
    expect(CARBON_EASE.entranceProductive).toEqual([0, 0, 0.38, 0.9]);
    expect(CARBON_EASE.exitProductive).toEqual([0.2, 0, 1, 0.9]);
    expect(CARBON_EASE.standardExpressive).toEqual([0.4, 0.14, 0.3, 1]);
  });

  it("parses whatever the package currently ships, not a hardcoded copy of it", () => {
    const fromPackage = (easings.standard.productive.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    expect(CARBON_EASE.standardProductive).toEqual(fromPackage);
  });

  it("never leaves a control point undefined, which would silently disable the easing", () => {
    Object.values(CARBON_EASE).forEach(points => {
      expect(points).toHaveLength(4);
      points.forEach(point => expect(Number.isFinite(point)).toBe(true));
    });
  });
});

describe("carbonMotion — the named transitions", () => {
  /**
   * Carbon's guidance is that duration tracks distance. A node recolouring is
   * the smallest move on the tab and a row changing place is one of the
   * largest, so getting these the same — or the wrong way round — would be the
   * substantive mistake, not a stray millisecond.
   */
  it("scales duration with how far the thing travels", () => {
    expect(CARBON_MOTION.advance.duration).toBeLessThan(CARBON_MOTION.reorder.duration);
    expect(CARBON_MOTION.reorder.duration).toBeLessThan(CARBON_MOTION.railFill.duration);
  });

  // Carbon exits are shorter than their entrances: something on its way out has
  // stopped being worth the reader's time.
  it("leaves faster than it arrives", () => {
    expect(CARBON_MOTION.exit.duration).toBeLessThan(CARBON_MOTION.enter.duration);
  });

  it("uses entrance and exit curves for entering and leaving, not the standard one", () => {
    expect(CARBON_MOTION.enter.ease).toEqual(CARBON_EASE.entranceProductive);
    expect(CARBON_MOTION.exit.ease).toEqual(CARBON_EASE.exitProductive);
  });

  /**
   * Productive vs. expressive is Carbon's significance split, not a speed one.
   * The ambient loops are the only motion here meant to be noticed, so they are
   * the only expressive ones — if a functional transition picked up the
   * expressive curve, ordinary reordering would start drawing the eye.
   */
  it("reserves the expressive curve for the ambient loop", () => {
    expect(CARBON_MOTION.ambient.ease).toEqual(CARBON_EASE.standardExpressive);
    expect(CARBON_MOTION.ambient.repeat).toBe(Infinity);

    [CARBON_MOTION.advance, CARBON_MOTION.reorder, CARBON_MOTION.enter, CARBON_MOTION.exit].forEach(
      transition => {
        expect(transition.ease).not.toEqual(CARBON_EASE.standardExpressive);
      },
    );
  });

  it("offers stillness as the reduced-motion stand-in, not a slowed-down animation", () => {
    expect(stillness.duration).toBe(0);
  });
});
