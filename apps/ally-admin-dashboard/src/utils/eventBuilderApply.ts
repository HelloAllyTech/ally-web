import type {
  EventBuilderClassifier,
  EventBuilderExamples,
  EventBuilderFeedback,
  EventBuilderField,
} from "@api";
import type { BinaryClassificationExample } from "@types";

import { sanitizeClassifierExamples } from "./classifierExamples";

/**
 * The draft a binary-classification event is generated into.
 *
 * Deliberately NOT an `UpdateEventDataParam`: nothing here is persisted until
 * the author submits, and the shared event catalogue has no tenant column, so
 * an abandoned generation must leave no row behind. The panel converts this to
 * an event payload once, on Add.
 *
 * `detectionConfig` is absent on purpose — occurrence caps and time windows are
 * scenario-pacing decisions belonging to whoever assembles the simulation, not
 * properties of the behaviour being detected, so they are never generated.
 */
export interface EventDraft {
  /** Display label in the event table. */
  name: string;
  /** `detectionData.className` — the only definition the runtime classifier gets. */
  className: string;
  positiveExamples: BinaryClassificationExample[];
  negativeExamples: BinaryClassificationExample[];
  /** Real-time feedback shown to the learner mid-session. */
  message: string;
  emoji: string;
  /** Signed quality-score delta carried when the event fires. */
  score: number;
  /** Injected into the AI client's prompt — direction for the actor. */
  branchInstruction: string;
  tags: string[];
}

/** The studio's own default for a new event, kept when nothing generates one. */
export const DEFAULT_EVENT_EMOJI = "🫥";

export const emptyEventDraft = (): EventDraft => ({
  name: "",
  className: "",
  positiveExamples: [],
  negativeExamples: [],
  message: "",
  emoji: DEFAULT_EVENT_EMOJI,
  score: 0,
  branchInstruction: "",
  tags: [],
});

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Apply ONE generated field to the draft.
 *
 * Returns the next draft and whether anything actually landed, so the task feed
 * can mark a row "no content generated" rather than a silent success — the
 * author needs to know which parts they still have to write themselves.
 *
 * Every value has already been clamped server-side; the guards here are against
 * a shape that never arrived (a failed parse yields blanks, not a throw), not
 * against bad ranges.
 */
export const applyEventBuilderField = (
  field: EventBuilderField,
  value: unknown,
  draft: EventDraft,
): { draft: EventDraft; applied: boolean } => {
  switch (field) {
    case "classifier": {
      const parsed = (value ?? {}) as Partial<EventBuilderClassifier>;
      const name = asString(parsed.name);
      const className = asString(parsed.className);
      if (!name && !className) return { draft, applied: false };
      return {
        draft: {
          ...draft,
          name: name || draft.name,
          className: className || draft.className,
        },
        applied: true,
      };
    }

    case "examples": {
      const parsed = (value ?? {}) as Partial<EventBuilderExamples>;
      const positiveExamples = sanitizeClassifierExamples(parsed.positiveExamples);
      const negativeExamples = sanitizeClassifierExamples(parsed.negativeExamples);
      // Replaced, not merged: a regenerate is the author saying the last set
      // was wrong, and appending would leave the rejected examples calibrating
      // the classifier alongside the new ones.
      if (!positiveExamples.length && !negativeExamples.length) {
        return { draft, applied: false };
      }
      return { draft: { ...draft, positiveExamples, negativeExamples }, applied: true };
    }

    case "feedback": {
      const parsed = (value ?? {}) as Partial<EventBuilderFeedback>;
      const message = asString(parsed.message);
      const emoji = asString(parsed.emoji);
      const score = typeof parsed.score === "number" ? parsed.score : draft.score;
      if (!message && !emoji && typeof parsed.score !== "number") {
        return { draft, applied: false };
      }
      return {
        draft: {
          ...draft,
          message: message || draft.message,
          // Blank means the model returned something that was not an emoji;
          // keep whatever the draft already shows rather than clearing it.
          emoji: emoji || draft.emoji,
          score,
        },
        applied: true,
      };
    }

    case "branch_instruction": {
      const branchInstruction = asString(value);
      if (!branchInstruction) return { draft, applied: false };
      return { draft: { ...draft, branchInstruction }, applied: true };
    }

    case "tags": {
      const tags = Array.isArray(value)
        ? value.map(asString).filter((tag): tag is string => tag.length > 0)
        : [];
      if (!tags.length) return { draft, applied: false };
      return { draft: { ...draft, tags }, applied: true };
    }

    default:
      return { draft, applied: false };
  }
};

/**
 * Whether a draft is complete enough to create an event from.
 *
 * `className` is the bar, not `name`: an event with no class name is one the
 * runtime cannot evaluate at all — `_parse_binary_classifier_data` logs it and
 * returns None, so the event silently never fires. The display name falls back
 * to the class name on submit.
 */
export const isEventDraftSubmittable = (draft: EventDraft): boolean =>
  draft.className.trim().length > 0;
