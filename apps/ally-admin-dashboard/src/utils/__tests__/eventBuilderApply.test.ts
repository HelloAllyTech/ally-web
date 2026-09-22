import { describe, it, expect } from "vitest";

import {
  applyEventBuilderField,
  emptyEventDraft,
  isEventDraftSubmittable,
  DEFAULT_EVENT_EMOJI,
} from "../eventBuilderApply";

describe("eventBuilderApply", () => {
  describe("applyEventBuilderField", () => {
    it("writes the classifier into name and className", () => {
      const { draft, applied } = applyEventBuilderField(
        "classifier",
        { name: "Open-Ended Question", className: "Open-ended question" },
        emptyEventDraft(),
      );

      expect(applied).toBe(true);
      expect(draft.name).toBe("Open-Ended Question");
      expect(draft.className).toBe("Open-ended question");
    });

    it("keeps the existing value for whichever half came back blank", () => {
      const base = { ...emptyEventDraft(), name: "Typed by hand", className: "Existing" };
      const { draft } = applyEventBuilderField("classifier", { className: "Regenerated" }, base);

      expect(draft.name).toBe("Typed by hand");
      expect(draft.className).toBe("Regenerated");
    });

    it("replaces examples rather than appending them", () => {
      // A regenerate is the author saying the previous set was wrong; appending
      // would leave the rejected examples calibrating the classifier too.
      const base = {
        ...emptyEventDraft(),
        positiveExamples: [{ text: "old positive" }],
        negativeExamples: [{ text: "old negative" }],
      };
      const { draft } = applyEventBuilderField(
        "examples",
        {
          positiveExamples: [{ text: "new positive" }],
          negativeExamples: [{ text: "new negative" }],
        },
        base,
      );

      expect(draft.positiveExamples).toEqual([{ text: "new positive" }]);
      expect(draft.negativeExamples).toEqual([{ text: "new negative" }]);
    });

    it("drops blank examples, which would render as empty numbered lines at runtime", () => {
      const { draft } = applyEventBuilderField(
        "examples",
        { positiveExamples: [{ text: "  kept  " }, { text: "   " }], negativeExamples: [] },
        emptyEventDraft(),
      );

      expect(draft.positiveExamples).toEqual([{ text: "kept" }]);
    });

    it("applies feedback including a negative score", () => {
      const { draft, applied } = applyEventBuilderField(
        "feedback",
        { message: "That closed the question down", emoji: "🤔", score: -3 },
        emptyEventDraft(),
      );

      expect(applied).toBe(true);
      expect(draft.message).toBe("That closed the question down");
      expect(draft.emoji).toBe("🤔");
      expect(draft.score).toBe(-3);
    });

    it("keeps a score of 0 rather than treating it as nothing generated", () => {
      const { draft, applied } = applyEventBuilderField(
        "feedback",
        { message: "", emoji: "", score: 0 },
        { ...emptyEventDraft(), score: 7 },
      );

      expect(applied).toBe(true);
      expect(draft.score).toBe(0);
    });

    it("keeps the default emoji when the model returned none", () => {
      const { draft } = applyEventBuilderField(
        "feedback",
        { message: "Nice work", score: 4 },
        emptyEventDraft(),
      );

      expect(draft.emoji).toBe(DEFAULT_EVENT_EMOJI);
    });

    it("applies the branch instruction as plain text", () => {
      const { draft, applied } = applyEventBuilderField(
        "branch_instruction",
        "  You open up a little.  ",
        emptyEventDraft(),
      );

      expect(applied).toBe(true);
      expect(draft.branchInstruction).toBe("You open up a little.");
    });

    it("applies tags and discards blanks", () => {
      const { draft } = applyEventBuilderField(
        "tags",
        ["active-listening", "  ", "questioning"],
        emptyEventDraft(),
      );

      expect(draft.tags).toEqual(["active-listening", "questioning"]);
    });

    it("reports applied=false and leaves the draft untouched for an empty result", () => {
      // The feed shows these rows as "no content generated" — the author needs
      // to know which parts they still have to write themselves.
      const base = { ...emptyEventDraft(), className: "Existing" };

      for (const [field, value] of [
        ["classifier", {}],
        ["examples", { positiveExamples: [], negativeExamples: [] }],
        ["feedback", {}],
        ["branch_instruction", "   "],
        ["tags", []],
      ] as const) {
        const result = applyEventBuilderField(field, value, base);
        expect(result.applied).toBe(false);
        expect(result.draft).toBe(base);
      }
    });

    it("survives a null or undefined value without throwing", () => {
      expect(applyEventBuilderField("classifier", null, emptyEventDraft()).applied).toBe(false);
      expect(applyEventBuilderField("examples", undefined, emptyEventDraft()).applied).toBe(false);
    });
  });

  describe("isEventDraftSubmittable", () => {
    it("requires a class name, not a display name", () => {
      // An event with no className is one ally-ai-learn cannot evaluate at all:
      // it logs the miss and returns None, so the event silently never fires.
      expect(isEventDraftSubmittable({ ...emptyEventDraft(), name: "Named" })).toBe(false);
      expect(isEventDraftSubmittable({ ...emptyEventDraft(), className: "Open question" })).toBe(
        true,
      );
    });

    it("treats a whitespace-only class name as missing", () => {
      expect(isEventDraftSubmittable({ ...emptyEventDraft(), className: "   " })).toBe(false);
    });
  });
});
