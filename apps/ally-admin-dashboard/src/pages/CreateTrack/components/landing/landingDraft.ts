import { LandingChapter, LandingReply, TrackLandingPage } from "@types";

import { isLandingTextFilled, withLandingDefaults } from "../../trackFormUtils";

export interface LandingDraftMerge {
  merged: TrackLandingPage;
  /** Values the draft wrote. Each text, beat, hard call or sitting length counts once. */
  filledCount: number;
}

/**
 * Folds a Copilot draft into the page the author has open, filling gaps and nothing else.
 *
 * - Text fields are filled only while blank. Text the author wrote is never replaced.
 * - Replies and outcomes are filled only while the whole list is empty; a half-written list is
 *   the author's.
 * - A chapter (matched by `sectionId`) is filled only while both its beat and its teaser are
 *   empty. One with either set is left alone.
 * - The hard call and the sitting length are filled only while unset.
 * - `enabled` flags, `persona.imageUrl` and `persona.characterId` are never touched: switches are
 *   the author's call, and the draft has no image or character to offer.
 *
 * Pure: `current` and `draft` are not modified. `draft` is read through `withLandingDefaults`, so a
 * partial or older shape cannot break the merge.
 */
export const mergeLandingDraft = (
  current: TrackLandingPage,
  draft: TrackLandingPage,
): LandingDraftMerge => {
  const next = withLandingDefaults(current);
  const source = withLandingDefaults(draft);
  let filledCount = 0;

  /** The draft's text when it has some and `existing` is blank, else `existing` unchanged. */
  const fillText = (existing: string | null, offered: string | null): string | null => {
    if (isLandingTextFilled(existing) || !isLandingTextFilled(offered)) return existing;
    filledCount += 1;
    return (offered as string).trim();
  };

  next.hero = {
    hook: fillText(next.hero.hook, source.hero.hook),
    question: fillText(next.hero.question, source.hero.question),
    courseLine: fillText(next.hero.courseLine, source.hero.courseLine),
    buttonLabel: fillText(next.hero.buttonLabel, source.hero.buttonLabel),
  };

  next.persona = {
    ...next.persona,
    name: fillText(next.persona.name, source.persona.name),
    descriptor: fillText(next.persona.descriptor, source.persona.descriptor),
  };

  const replies = next.firstMove.replies;
  const replyListEmpty = replies.every(
    reply =>
      !isLandingTextFilled(reply.text) &&
      !isLandingTextFilled(reply.label) &&
      !isLandingTextFilled(reply.why),
  );
  let nextReplies: LandingReply[] = replies;
  if (replyListEmpty && source.firstMove.replies.length > 0) {
    nextReplies = source.firstMove.replies.map(reply => {
      const why = isLandingTextFilled(reply.why) ? (reply.why as string).trim() : null;
      filledCount +=
        (isLandingTextFilled(reply.text) ? 1 : 0) + (isLandingTextFilled(reply.label) ? 1 : 0);
      if (why) filledCount += 1;
      return { text: reply.text.trim(), label: reply.label.trim(), why };
    });
  }
  next.firstMove = {
    ...next.firstMove,
    sceneLine: fillText(next.firstMove.sceneLine, source.firstMove.sceneLine),
    personaLine: fillText(next.firstMove.personaLine, source.firstMove.personaLine),
    prompt: fillText(next.firstMove.prompt, source.firstMove.prompt),
    replies: nextReplies,
  };

  const chapters: LandingChapter[] = next.arc.chapters.map(chapter => ({ ...chapter }));
  for (const offered of source.arc.chapters) {
    const offeredTeaser = isLandingTextFilled(offered.teaser)
      ? (offered.teaser as string).trim()
      : null;
    if (offered.beat === null && offeredTeaser === null) continue;
    const existing = chapters.find(chapter => chapter.sectionId === offered.sectionId);
    if (existing) {
      if (existing.beat !== null || isLandingTextFilled(existing.teaser)) continue;
      existing.beat = offered.beat;
      existing.teaser = offeredTeaser;
    } else {
      chapters.push({ sectionId: offered.sectionId, beat: offered.beat, teaser: offeredTeaser });
    }
    filledCount += (offered.beat !== null ? 1 : 0) + (offeredTeaser !== null ? 1 : 0);
  }
  let hardCallSectionId = next.arc.hardCallSectionId;
  if (
    !isLandingTextFilled(hardCallSectionId) &&
    isLandingTextFilled(source.arc.hardCallSectionId)
  ) {
    hardCallSectionId = source.arc.hardCallSectionId;
    filledCount += 1;
  }
  next.arc = { ...next.arc, chapters, hardCallSectionId };

  if (!next.outcomes.items.some(isLandingTextFilled)) {
    const offered = source.outcomes.items.filter(isLandingTextFilled).map(item => item.trim());
    if (offered.length > 0) {
      next.outcomes = { ...next.outcomes, items: offered };
      filledCount += offered.length;
    }
  }

  if (next.howItPlays.sittingLength === null && source.howItPlays.sittingLength !== null) {
    next.howItPlays = { ...next.howItPlays, sittingLength: source.howItPlays.sittingLength };
    filledCount += 1;
  }

  next.cast = {
    ...next.cast,
    callerLine: fillText(next.cast.callerLine, source.cast.callerLine),
    guide: {
      name: fillText(next.cast.guide.name, source.cast.guide.name),
      role: fillText(next.cast.guide.role, source.cast.guide.role),
      line: fillText(next.cast.guide.line, source.cast.guide.line),
    },
  };

  next.contentNotes = {
    extraNote: fillText(next.contentNotes.extraNote, source.contentNotes.extraNote),
  };

  return { merged: next, filledCount };
};
