import { describe, it, expect, vi } from "vitest";

import { applyAgentBuilderOutputToForm, parseAgentBuilderOutput } from "../agentBuilderOutput";

const makeForm = () => {
  const calls: Record<string, unknown> = {};
  const setValue = vi.fn((key: string, value: unknown) => {
    calls[key] = value;
  });
  return { formMethods: { setValue } as any, calls };
};

describe("parseAgentBuilderOutput", () => {
  it("parses a direct JSON object", () => {
    expect(parseAgentBuilderOutput('{"title":"Hi"}')).toEqual({ title: "Hi" });
  });

  it("parses JSON wrapped in markdown fences", () => {
    const raw = '```json\n{"title":"Hi"}\n```';
    expect(parseAgentBuilderOutput(raw)).toEqual({ title: "Hi" });
  });

  it("rescues a JSON object embedded in surrounding prose", () => {
    const raw = 'Here you go:\n{"title":"Hi","age":3}\nThanks!';
    expect(parseAgentBuilderOutput(raw)).toEqual({ title: "Hi", age: 3 });
  });

  it("returns null for non-JSON", () => {
    expect(parseAgentBuilderOutput("not json at all")).toBeNull();
  });

  it("returns null for a JSON array (not an object)", () => {
    expect(parseAgentBuilderOutput("[1,2,3]")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseAgentBuilderOutput("")).toBeNull();
  });
});

describe("applyAgentBuilderOutputToForm", () => {
  it("applies and truncates string fields and joins opening statements", () => {
    const { formMethods, calls } = makeForm();
    const longTitle = "x".repeat(150);
    const longRole = "y".repeat(2000);
    const applied = applyAgentBuilderOutputToForm(
      {
        title: longTitle,
        description: "A goal",
        roleInstruction: longRole,
        characterBackstory: "Backstory",
        openingStatements: ["Hello.", "I'm nervous."],
      },
      formMethods,
    );

    expect((calls.title as string).length).toBe(100);
    expect(calls.description).toBe("A goal");
    expect((calls.prompt as string).length).toBe(1500);
    expect(calls.characterProfileText).toBe("Backstory");
    expect(calls.openingStatements).toBe("Hello.\nI'm nervous.");
    expect(applied).toContain("Title");
    expect(applied).toContain("Opening Dialogues");
  });

  it("maps customFields with synthesized ids, defaults, and a 3-row cap", () => {
    const { formMethods, calls } = makeForm();
    applyAgentBuilderOutputToForm(
      {
        customFields: [
          { name: "Hobby", value: "Painting" },
          { name: "Pet", value: "Cat" },
          { name: "Job", value: "Nurse" },
          { name: "Extra", value: "dropped" },
        ],
      },
      formMethods,
    );
    const rows = calls.customFields as any[];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      id: "customFields1",
      name: "Hobby",
      value: "Painting",
      useInDefaultPrompt: true,
    });
  });

  it("applies valid enums and skips invalid ones", () => {
    const { formMethods, calls } = makeForm();
    applyAgentBuilderOutputToForm(
      {
        experienceMode: "FEEDBACK",
        checklistType: "NOT_A_TYPE",
        persona: { gender: "female", genderIdentity: "Bogus", age: 34 },
      },
      formMethods,
    );
    expect(calls.experienceMode).toBe("FEEDBACK");
    expect(calls).not.toHaveProperty("checklistType");
    expect(calls.gender).toBe("female");
    expect(calls).not.toHaveProperty("genderIdentity");
    expect(calls.age).toBe(34);
  });

  it("applies boolean toggles and ignores non-booleans", () => {
    const { formMethods, calls } = makeForm();
    applyAgentBuilderOutputToForm(
      { toggles: { showScoreMeter: true, enableFeedback: false, isPublic: "yes" } },
      formMethods,
    );
    expect(calls.showScoreMeter).toBe(true);
    expect(calls.enableFeedback).toBe(false);
    expect(calls).not.toHaveProperty("isPublic");
  });

  it("applies maxTimeValue only when the timer is enabled", () => {
    const off = makeForm();
    applyAgentBuilderOutputToForm(
      { maxTimeValue: "00:30:00", toggles: { timerMode: false } },
      off.formMethods,
    );
    expect(off.calls).not.toHaveProperty("maxTimeValue");

    const on = makeForm();
    applyAgentBuilderOutputToForm(
      { maxTimeValue: "00:30:00", toggles: { timerMode: true } },
      on.formMethods,
    );
    expect(on.calls.maxTimeValue).toBe("00:30:00");
  });

  it("returns an empty list when nothing is applicable", () => {
    const { formMethods } = makeForm();
    expect(applyAgentBuilderOutputToForm({ unknownKey: "ignored" }, formMethods)).toEqual([]);
  });
});
