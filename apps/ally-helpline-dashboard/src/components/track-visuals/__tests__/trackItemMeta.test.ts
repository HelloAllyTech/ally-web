import { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { TrackDetailItem, TrackItemType } from "@types";

import { getTrackItemMeta } from "../trackItemMeta";

// Echoes the key plus its score interpolation, so assertions can tell
// "roleplay" from "roleplay · min score N" without loading real translations.
const t = ((key: string, opts?: { score?: number }) =>
  opts?.score === undefined ? key : `${key}:${opts.score}`) as unknown as TFunction;

const roleplayItem = (minScore?: number | null): TrackDetailItem =>
  ({
    type: TrackItemType.ROLEPLAY,
    completionCriteria: minScore === undefined ? {} : { minScore },
  }) as unknown as TrackDetailItem;

describe("getTrackItemMeta — roleplay minimum score", () => {
  it("shows a real threshold", () => {
    expect(getTrackItemMeta(roleplayItem(70), t)).toBe(
      "tracks2.meta.roleplay · tracks2.meta.minScore:70",
    );
  });

  // 0 is the builder's unconfigured default and gates nothing, so surfacing it
  // would advertise a hurdle the learner does not actually have to clear.
  it("omits a minimum of 0", () => {
    expect(getTrackItemMeta(roleplayItem(0), t)).toBe("tracks2.meta.roleplay");
  });

  it("omits an unset minimum", () => {
    expect(getTrackItemMeta(roleplayItem(undefined), t)).toBe("tracks2.meta.roleplay");
    expect(getTrackItemMeta(roleplayItem(null), t)).toBe("tracks2.meta.roleplay");
  });
});
