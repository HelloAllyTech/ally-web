import { LANDING_LIMITS, TrackFormValues, TrackItemType, TrackLandingPage } from "@types";

import { isLandingTextFilled } from "../../trackFormUtils";

/** The blocks of the story layout, in the order the editor lists them and the page shows them. */
export type LandingBlockKey =
  | "hero"
  | "firstMove"
  | "arc"
  | "outcomes"
  | "howItPlays"
  | "cast"
  | "xp"
  | "contentNotes";

export const LANDING_BLOCK_ORDER: LandingBlockKey[] = [
  "hero",
  "firstMove",
  "arc",
  "outcomes",
  "howItPlays",
  "cast",
  "xp",
  "contentNotes",
];

/**
 * - `SET`: the author wrote what the block needs.
 * - `AUTO`: the page fills the block in by itself; nothing is required.
 * - `NEEDS_INPUT`: switched on, but missing what it needs, so the page leaves it out.
 * - `OFF`: switched off.
 */
export type LandingBlockStatus = "SET" | "AUTO" | "NEEDS_INPUT" | "OFF";

/** Blocks that carry an on/off switch. Hero is gated by its hook and Content notes is automatic. */
export type LandingToggleKey = "firstMove" | "arc" | "outcomes" | "howItPlays" | "cast" | "xp";

export const LANDING_TOGGLE_KEYS: LandingToggleKey[] = [
  "firstMove",
  "arc",
  "outcomes",
  "howItPlays",
  "cast",
  "xp",
];

export const hasLandingToggle = (key: LandingBlockKey): key is LandingToggleKey =>
  (LANDING_TOGGLE_KEYS as LandingBlockKey[]).includes(key);

/** A reply the page can show: it needs its text and its "what it shows" label. */
export const isShowableReply = (reply: { text: string; label: string }): boolean =>
  isLandingTextFilled(reply.text) && isLandingTextFilled(reply.label);

/** The First move block is shown only with a persona line and at least two showable replies. */
export const isFirstMoveComplete = (page: TrackLandingPage): boolean =>
  isLandingTextFilled(page.firstMove.personaLine) &&
  page.firstMove.replies.filter(isShowableReply).length >= LANDING_LIMITS.repliesMin;

/**
 * Status of every block, from the display rules in the story-layout contract (§1). Pure, so the
 * list and its readiness count can be tested without rendering.
 *
 * `sections` scopes the Story arc to chapters that still exist, the way the page does.
 */
export const computeLandingBlockStatuses = (
  page: TrackLandingPage,
  sections: Pick<TrackFormValues["sections"][number], "serverId">[] = [],
): Record<LandingBlockKey, LandingBlockStatus> => {
  const sectionIds = new Set(sections.map(section => section.serverId).filter(Boolean));
  const arcHasConfig = page.arc.chapters.some(
    chapter =>
      sectionIds.has(chapter.sectionId) &&
      (chapter.beat !== null || isLandingTextFilled(chapter.teaser)),
  );

  return {
    hero: isLandingTextFilled(page.hero.hook) ? "SET" : "NEEDS_INPUT",
    firstMove: !page.firstMove.enabled ? "OFF" : isFirstMoveComplete(page) ? "SET" : "NEEDS_INPUT",
    arc: !page.arc.enabled ? "OFF" : arcHasConfig ? "SET" : "AUTO",
    outcomes: !page.outcomes.enabled
      ? "OFF"
      : page.outcomes.items.some(isLandingTextFilled)
        ? "SET"
        : "NEEDS_INPUT",
    howItPlays: !page.howItPlays.enabled
      ? "OFF"
      : page.howItPlays.sittingLength !== null
        ? "SET"
        : "AUTO",
    cast: !page.cast.enabled
      ? "OFF"
      : isLandingTextFilled(page.persona.name) || isLandingTextFilled(page.cast.guide.name)
        ? "SET"
        : "NEEDS_INPUT",
    xp: page.xp.enabled ? "AUTO" : "OFF",
    contentNotes: isLandingTextFilled(page.contentNotes.extraNote) ? "SET" : "AUTO",
  };
};

/**
 * "N of M blocks ready": M counts the blocks that are switched on, N those that are `SET` or
 * `AUTO`. A switched-off block is neither ready nor missing, so it is left out of both.
 */
export const countReadyBlocks = (
  statuses: Record<LandingBlockKey, LandingBlockStatus>,
): { ready: number; total: number } => {
  const active = LANDING_BLOCK_ORDER.map(key => statuses[key]).filter(status => status !== "OFF");
  return {
    ready: active.filter(status => status === "SET" || status === "AUTO").length,
    total: active.length,
  };
};

/** Items of each type across the course, in the order the types are declared. */
export const countItemsByType = (
  sections: TrackFormValues["sections"],
): { type: TrackItemType; count: number }[] => {
  const counts = new Map<TrackItemType, number>();
  for (const section of sections ?? []) {
    for (const item of section.items ?? []) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }
  }
  return Object.values(TrackItemType)
    .filter(type => counts.has(type))
    .map(type => ({ type, count: counts.get(type) ?? 0 }));
};

/** The persona fields a Character Library pick copies in. `null` leaves that field as it was. */
export interface PersonaFromCharacter {
  name: string;
  imageUrl: string | null;
  characterId: string | null;
}

/**
 * What picking a Character Library character writes into the persona: the name with the age
 * ("Meera, 19"), the cover image and the character's id. A character without an image leaves the
 * persona's current one in place (`imageUrl: null`), the way the simulation form treats media.
 * The descriptor is not copied: a character has no one-line summary to offer.
 */
export const personaFromCharacter = (character: {
  id?: string;
  name: string;
  age?: number | string | null;
  coverImageUrl?: string;
}): PersonaFromCharacter => {
  const name = (character.name ?? "").trim();
  const age =
    character.age === null || character.age === undefined ? "" : String(character.age).trim();
  const imageUrl = (character.coverImageUrl ?? "").trim();
  return {
    name: (age ? `${name}, ${age}` : name).slice(0, LANDING_LIMITS.personaNameMax),
    imageUrl: imageUrl && imageUrl.length <= LANDING_LIMITS.personaImageUrlMax ? imageUrl : null,
    characterId: character.id ?? null,
  };
};
