import { describe, it, expect, vi } from "vitest";

import type { UseFormReturn } from "react-hook-form";

import { FORM_FIELD_IDS } from "@constants";

import { applyAgentBuilderField } from "../agentBuilderApply";

/** Minimal RHF stub — applyAgentBuilderField only touches setValue. */
const makeForm = () => {
  const setValue = vi.fn();
  return { form: { setValue } as unknown as UseFormReturn<any>, setValue };
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
