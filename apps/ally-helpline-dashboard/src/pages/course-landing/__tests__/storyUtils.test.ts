import { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { PublicTrackOutlineSection, StoryBeat, TrackItemType } from "@types";

import {
  arcPath,
  arcPoints,
  chapterKinds,
  countItemsByKind,
  describeWarnings,
  formatDuration,
  joinList,
} from "../story/storyUtils";

// Interpolates `{{name}}` from the options and appends the plural form the
// way i18next resolves `_one` / `_other`, so the helpers' output reads true.
const t = ((key: string, options: Record<string, unknown> = {}) => {
  const templates: Record<string, string> = {
    "courseLanding.story.durationMinutes": "About {{count}} min",
    "courseLanding.story.durationHours": "About {{count}} hours",
    "courseLanding.story.notes.listAnd": "{{rest}} and {{last}}",
    "courseLanding.story.notes.warningWithChapters":
      options.count === 1 ? "{{name}} (chapter {{chapters}})" : "{{name}} (chapters {{chapters}})",
  };
  const template = templates[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name] ?? ""));
}) as unknown as TFunction;

const section = (id: string, order: number, types: TrackItemType[]): PublicTrackOutlineSection => ({
  id,
  title: id,
  description: null,
  order,
  items: types.map((type, index) => ({
    id: `${id}-${index}`,
    type,
    order: index + 1,
    title: `${id} ${type}`,
    description: null,
    contentMeta: null,
  })),
});

describe("storyUtils", () => {
  it("counts components by type in reading order, leaving out types the course lacks", () => {
    const sections = [
      section("a", 1, [TrackItemType.QUIZ, TrackItemType.ROLEPLAY]),
      section("b", 2, [TrackItemType.ROLEPLAY, TrackItemType.GAME]),
    ];
    expect(countItemsByKind(sections)).toEqual([
      { type: TrackItemType.ROLEPLAY, count: 2 },
      { type: TrackItemType.QUIZ, count: 1 },
      { type: TrackItemType.GAME, count: 1 },
    ]);
  });

  it("lists a chapter's component types once each, in the order they appear", () => {
    expect(
      chapterKinds(
        section("a", 1, [TrackItemType.QUIZ, TrackItemType.ROLEPLAY, TrackItemType.QUIZ]),
      ),
    ).toEqual([TrackItemType.QUIZ, TrackItemType.ROLEPLAY]);
  });

  it("states time in minutes under an hour and in half hours above", () => {
    expect(formatDuration(45, t)).toBe("About 45 min");
    expect(formatDuration(120, t)).toBe("About 2 hours");
    expect(formatDuration(100, t)).toBe("About 1.5 hours");
  });

  it("joins a list the way a sentence would", () => {
    expect(joinList([], t)).toBe("");
    expect(joinList(["a"], t)).toBe("a");
    expect(joinList(["a", "b", "c"], t)).toBe("a, b and c");
  });

  it("reads content notes as one clause, lower-casing words but not acronyms", () => {
    expect(
      describeWarnings(
        [
          { name: "Self-harm", chapters: [4] },
          { name: "PTSD", chapters: [2, 3] },
        ],
        t,
      ),
    ).toBe("self-harm (chapter 4) and PTSD (chapters 2 and 3)");
  });

  it("peaks the arc at the hard call and eases off after it", () => {
    const points = arcPoints([
      { beat: StoryBeat.SETUP, isHardCall: false },
      { beat: StoryBeat.CONFLICT, isHardCall: false },
      { beat: StoryBeat.CLIMAX, isHardCall: true },
      { beat: StoryBeat.RESOLUTION, isHardCall: false },
    ]);
    const ys = points.map(point => point.y);
    expect(Math.min(...ys)).toBe(points[2].y);
    expect(points[2].isHardCall).toBe(true);
    expect(points[3].y).toBeGreaterThan(points[2].y);
    expect(points[0].y).toBeGreaterThan(points[1].y);
  });

  it("puts the peak on the last-but-one chapter, unmarked, when no hard call is set", () => {
    const points = arcPoints([
      { beat: null, isHardCall: false },
      { beat: null, isHardCall: false },
      { beat: null, isHardCall: false },
    ]);
    expect(Math.min(...points.map(point => point.y))).toBe(points[1].y);
    expect(points.some(point => point.isHardCall)).toBe(false);
  });

  it("draws one path through every point", () => {
    const points = arcPoints([
      { beat: null, isHardCall: false },
      { beat: null, isHardCall: true },
      { beat: null, isHardCall: false },
    ]);
    const d = arcPath(points);
    expect(d.startsWith("M")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(arcPath([])).toBe("");
  });
});
