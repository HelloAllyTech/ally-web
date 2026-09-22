import { EVENT_DETECTION_TYPES } from "@constants";
import type { UpdateEventDataParam } from "@types";

import type { EventDraft } from "./eventBuilderApply";

/**
 * Turn a finished Event Builder draft into the shape the existing event
 * converters expect, so a generated event is created through exactly the same
 * path as a hand-authored one — `convertEventToApiPayload` still does the
 * className join, the detectionConfig defaults and the example sanitising.
 *
 * Kept OUT of `eventBuilderApply` even though it is about the same draft: this
 * imports `@constants`, which transitively reaches `@store` and reads
 * `baseAPI.reducerPath` at module load. `eventBuilderApply` is imported by
 * `useEventBuilderGeneration`, whose test mocks `@api` — pulling the store in
 * there deadlocks the suite. Only the pages that actually persist a draft need
 * this, and they already depend on the store.
 */
export const draftToEventParam = (draft: EventDraft): UpdateEventDataParam => ({
  name: draft.name.trim() || draft.className.trim(),
  description: "",
  score: draft.score,
  emoji: draft.emoji,
  message: draft.message,
  branchInstruction: draft.branchInstruction,
  detectionType: EVENT_DETECTION_TYPES.BINARY_CLASSIFIER,
  visibilityType: "ACTIVE",
  triggerCondition: {
    // An array because that is what the MULTILINE_TEXT trigger field produces
    // for this type; `convertEventToApiPayload` joins it back to one string.
    className: [draft.className.trim()],
    positiveExamples: draft.positiveExamples,
    negativeExamples: draft.negativeExamples,
  },
  tags: draft.tags,
});
