import { TFunction } from "i18next";

import { PublicTrackOutlineSection, PublicTrackStory, StoryBeat, TrackItemType } from "@types";

/**
 * Order the "How it plays" tiles read in: practice first, then the things a
 * learner reads or watches, and the optional game last.
 */
const KIND_ORDER: TrackItemType[] = [
  TrackItemType.ROLEPLAY,
  TrackItemType.CASE,
  TrackItemType.ANNOTATED_ARTIFACT,
  TrackItemType.QUIZ,
  TrackItemType.ARTICLE,
  TrackItemType.VIDEO,
  TrackItemType.JOURNAL,
  TrackItemType.GAME,
];

export const sortSections = (sections: PublicTrackOutlineSection[]) =>
  [...sections].sort((a, b) => a.order - b.order);

/** Components counted by type, in `KIND_ORDER`, types with none left out. */
export const countItemsByKind = (
  sections: PublicTrackOutlineSection[],
): { type: TrackItemType; count: number }[] => {
  const counts = new Map<TrackItemType, number>();
  for (const section of sections) {
    for (const item of section.items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return KIND_ORDER.filter(type => counts.has(type)).map(type => ({
    type,
    count: counts.get(type)!,
  }));
};

/** Distinct component types in a chapter, in the order they first appear. */
export const chapterKinds = (section: PublicTrackOutlineSection): TrackItemType[] => {
  const seen = new Set<TrackItemType>();
  for (const item of [...section.items].sort((a, b) => a.order - b.order)) seen.add(item.type);
  return [...seen];
};

/**
 * "About 2 hours" / "About 45 min". Hours round to the nearest half so the
 * estimate never reads as more precise than it is.
 */
export const formatDuration = (minutes: number, t: TFunction): string => {
  if (minutes < 60) return t("courseLanding.story.durationMinutes", { count: minutes });
  const hours = Math.round(minutes / 30) / 2;
  return t("courseLanding.story.durationHours", { count: hours });
};

/** Chapters (1-based) that carry at least one content note. */
export const chaptersWithNotes = (story: PublicTrackStory): Set<number> =>
  new Set((story.contentNotes?.warnings ?? []).flatMap(warning => warning.chapters));

/**
 * A warning name as it reads mid-sentence: "Self-harm" → "self-harm", while an
 * acronym such as "PTSD" keeps its capitals.
 */
const inlineName = (name: string): string =>
  /^\p{Lu}\p{Ll}/u.test(name) ? name.charAt(0).toLocaleLowerCase() + name.slice(1) : name;

/**
 * "self-harm (chapter 4) and family conflict (chapters 2 and 3)": the content
 * notes as one readable clause, so the box reads as a sentence, not a list of
 * tags.
 */
export const describeWarnings = (
  warnings: { name: string; chapters: number[] }[],
  t: TFunction,
): string =>
  joinList(
    warnings.map(warning =>
      warning.chapters.length
        ? t("courseLanding.story.notes.warningWithChapters", {
            name: inlineName(warning.name),
            chapters: joinList(warning.chapters.map(String), t),
            count: warning.chapters.length,
          })
        : inlineName(warning.name),
    ),
    t,
  );

/** "a", "a and b", "a, b and c" — the joiner word comes from the locale. */
export const joinList = (values: string[], t: TFunction): string => {
  if (values.length <= 1) return values[0] ?? "";
  return t("courseLanding.story.notes.listAnd", {
    rest: values.slice(0, -1).join(", "),
    last: values[values.length - 1],
  });
};

/** The persona as a sentence names them: "Meera, 19" → "Meera". */
export const personaShortName = (name: string): string => name.split(",")[0].trim() || name;

/** The letter on a persona's placeholder portrait: "Meera, 19" → "M". */
export const personaInitial = (name: string): string => {
  const first = name.trim().charAt(0);
  return first ? first.toLocaleUpperCase() : "";
};

export interface ArcPoint {
  x: number;
  y: number;
  beat: StoryBeat | null;
  isHardCall: boolean;
}

export const ARC_WIDTH = 600;
export const ARC_HEIGHT = 120;
// Room above the peak for its label and below the lowest point for a beat
// name, so neither is clipped by the viewBox.
const ARC_TOP = 30;
const ARC_BOTTOM = 86;
const ARC_PAD = 40;

/**
 * Points for the story-arc strip: tension rises chapter by chapter to the
 * hard call, then eases off to the resolution. Without a marked hard call the
 * peak is the last-but-one chapter, which is where a capstone usually sits.
 */
export const arcPoints = (
  chapters: { beat: StoryBeat | null; isHardCall: boolean }[],
): ArcPoint[] => {
  const n = chapters.length;
  if (n === 0) return [];
  const marked = chapters.findIndex(chapter => chapter.isHardCall);
  const peak = marked >= 0 ? marked : Math.max(0, n - 2);
  const step = n > 1 ? (ARC_WIDTH - ARC_PAD * 2) / (n - 1) : 0;
  return chapters.map((chapter, index) => {
    // 0 at the start, 1 at the peak, then back down to about a third.
    const tension =
      index <= peak
        ? peak === 0
          ? 1
          : index / peak
        : 1 - ((index - peak) / Math.max(1, n - 1 - peak)) * 0.65;
    return {
      x: n > 1 ? ARC_PAD + step * index : ARC_WIDTH / 2,
      y: ARC_BOTTOM - (ARC_BOTTOM - ARC_TOP) * tension,
      beat: chapter.beat,
      isHardCall: index === peak && marked >= 0,
    };
  });
};

/** A smooth path through the arc points (Catmull-Rom as cubic Béziers). */
export const arcPath = (points: ArcPoint[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [p] = points;
    return `M${p.x - 40} ${p.y + 10} Q${p.x} ${p.y - 10} ${p.x + 40} ${p.y + 10}`;
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
};
