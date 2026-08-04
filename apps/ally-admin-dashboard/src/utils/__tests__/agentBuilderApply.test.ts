import { describe, it, expect, vi } from "vitest";

import type { UseFormReturn } from "react-hook-form";

import { FORM_FIELD_IDS } from "@constants";

import { applyAgentBuilderField } from "../agentBuilderApply";

/**
 * Minimal RHF stub — applyAgentBuilderField touches setValue, and (for the
 * per-language fields) reads the current value back via getValues to merge
 * rather than clobber other languages.
 */
const makeForm = (existingValues: Record<string, unknown> = {}) => {
  const setValue = vi.fn();
  const getValues = vi.fn((key: string) => existingValues[key]);
  return { form: { setValue, getValues } as unknown as UseFormReturn<any>, setValue, getValues };
};

const validStates = [
  {
    id: "s1",
    name: "Guarded",
    guidelines: "You are wary.",
    scoreLower: 0,
    scoreUpper: 100,
    ragEnabled: false,
  },
  {
    id: "s2",
    name: "Opening up",
    guidelines: "You share a little.",
    scoreLower: 100,
    scoreUpper: 200,
    ragEnabled: true,
  },
];

describe("applyAgentBuilderField — states", () => {
  it("paints server-built states into the states form field", () => {
    const { form, setValue } = makeForm();
    const label = applyAgentBuilderField("states", validStates, form);

    expect(label).toBe("States");
    expect(setValue).toHaveBeenCalledTimes(1);
    const [key, rows] = setValue.mock.calls[0];
    expect(key).toBe(FORM_FIELD_IDS.STATES);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "s1",
      name: "Guarded",
      guidelines: "You are wary.",
      scoreLower: 0,
      scoreUpper: 100,
      ragEnabled: false,
    });
  });

  it("returns null and writes nothing for an empty / non-array value", () => {
    const { form, setValue } = makeForm();
    expect(applyAgentBuilderField("states", [], form)).toBeNull();
    expect(applyAgentBuilderField("states", undefined, form)).toBeNull();
    expect(applyAgentBuilderField("states", "nope", form)).toBeNull();
    expect(setValue).not.toHaveBeenCalled();
  });

  it("drops malformed cards (missing name/guidelines or non-finite bounds)", () => {
    const { form, setValue } = makeForm();
    const mixed = [
      validStates[0],
      { id: "x", name: "", guidelines: "g", scoreLower: 0, scoreUpper: 100 },
      { id: "y", name: "No guides", guidelines: "", scoreLower: 0, scoreUpper: 100 },
      { id: "z", name: "Bad bounds", guidelines: "g", scoreLower: null, scoreUpper: 100 },
    ];
    const label = applyAgentBuilderField("states", mixed, form);

    expect(label).toBe("States");
    const rows = setValue.mock.calls[0][1];
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Guarded");
  });

  it("mints an id when the server value is missing one, and defaults ragEnabled", () => {
    const { form, setValue } = makeForm();
    applyAgentBuilderField(
      "states",
      [{ name: "A", guidelines: "g", scoreLower: 0, scoreUpper: 100 }],
      form,
    );
    const rows = setValue.mock.calls[0][1];
    expect(typeof rows[0].id).toBe("string");
    expect(rows[0].id.length).toBeGreaterThan(0);
    expect(rows[0].ragEnabled).toBe(true);
  });
});

describe("applyAgentBuilderField — backstory", () => {
  it("writes the trimmed value into characterProfileText", () => {
    const { form, setValue } = makeForm();
    const label = applyAgentBuilderField("backstory", "  You grew up in Chennai.  ", form);

    expect(label).toBe("Character Backstory");
    expect(setValue).toHaveBeenCalledWith(
      FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT,
      "You grew up in Chennai.",
      expect.anything(),
    );
  });

  it("returns null and writes nothing for an empty value", () => {
    const { form, setValue } = makeForm();
    expect(applyAgentBuilderField("backstory", "   ", form)).toBeNull();
    expect(applyAgentBuilderField("backstory", undefined, form)).toBeNull();
    expect(setValue).not.toHaveBeenCalled();
  });
});

describe("applyAgentBuilderField — opening_statements / reminders", () => {
  it("joins non-empty lines back into a newline blob for openingStatements", () => {
    const { form, setValue } = makeForm();
    const label = applyAgentBuilderField(
      "opening_statements",
      "Hi there.\n\n  I wasn't sure I'd come.  \n",
      form,
    );

    expect(label).toBe("Opening Dialogues");
    expect(setValue).toHaveBeenCalledWith(
      FORM_FIELD_IDS.OPENING_STATEMENTS,
      "Hi there.\nI wasn't sure I'd come.",
      expect.anything(),
    );
  });

  it("joins non-empty lines back into a newline blob for reminders", () => {
    const { form, setValue } = makeForm();
    applyAgentBuilderField("reminders", "Maintain eye contact\nAsk open-ended questions", form);

    expect(setValue).toHaveBeenCalledWith(
      FORM_FIELD_IDS.REMINDERS,
      "Maintain eye contact\nAsk open-ended questions",
      expect.anything(),
    );
  });

  it("returns null when every line is blank", () => {
    const { form, setValue } = makeForm();
    expect(applyAgentBuilderField("opening_statements", "  \n  ", form)).toBeNull();
    expect(applyAgentBuilderField("reminders", "", form)).toBeNull();
    expect(setValue).not.toHaveBeenCalled();
  });
});

describe("applyAgentBuilderField — linguistic_style_samples / allowed_filler_words", () => {
  it("keys new samples under the default (English) language, preserving other languages", () => {
    const { form, setValue } = makeForm({
      linguisticStyleSamples: { "2": ["Existing Malayalam sample"] },
    });
    const label = applyAgentBuilderField(
      "linguistic_style_samples",
      ["I guess so.", "I don't really know.", ""],
      form,
    );

    expect(label).toBe("Linguistic Style Samples");
    const [key, value] = setValue.mock.calls[0];
    expect(key).toBe(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES);
    expect(value).toEqual({
      "2": ["Existing Malayalam sample"],
      "1": ["I guess so.", "I don't really know."],
    });
  });

  it("dedupes and keys new fillers under the default (English) language", () => {
    const { form, setValue } = makeForm({ allowedFillerWords: { "3": ["eh"] } });
    const label = applyAgentBuilderField(
      "allowed_filler_words",
      ["um", "you know", "um"],
      form,
    );

    expect(label).toBe("Allowed Filler Words");
    const [key, value] = setValue.mock.calls[0];
    expect(key).toBe("allowedFillerWords");
    expect(value).toEqual({ "3": ["eh"], "1": ["um", "you know"] });
  });

  it("returns null and writes nothing for an empty list", () => {
    const { form, setValue } = makeForm();
    expect(applyAgentBuilderField("linguistic_style_samples", [], form)).toBeNull();
    expect(applyAgentBuilderField("allowed_filler_words", undefined, form)).toBeNull();
    expect(setValue).not.toHaveBeenCalled();
  });
});
