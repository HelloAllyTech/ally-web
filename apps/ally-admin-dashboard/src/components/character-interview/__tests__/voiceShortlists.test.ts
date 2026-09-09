import { describe, expect, it } from "vitest";

import { collectVoiceShortlists } from "../voiceShortlists";

const catalog = [
  {
    language_id: 1,
    label: "English (India)",
    voices: [{ id: "en-a" }, { id: "en-b" }],
  },
  { language_id: 5, label: "Marathi (India)", voices: [{ id: "mr-a" }, { id: "mr-b" }] },
];

const question = (id: string, optionIds: string[], extra: Record<string, unknown> = {}) =>
  ({
    id: `m-${id}`,
    role: "assistant" as const,
    content: "Which voice fits?",
    question: {
      id,
      prompt: "Which voice fits?",
      kind: "singleSelect" as const,
      options: optionIds.map(optionId => ({
        id: optionId,
        label: `${optionId} label`,
        description: `${optionId} reason`,
      })),
    },
    ...extra,
  }) as never;

describe("collectVoiceShortlists", () => {
  it("groups each shortlist under the language its voices belong to", () => {
    const shortlists = collectVoiceShortlists(
      [question("q1", ["en-a", "en-b"]), question("q2", ["mr-a", "mr-b"])],
      catalog,
    );

    expect(shortlists.map(s => [s.languageId, s.languageLabel])).toEqual([
      ["1", "English (India)"],
      ["5", "Marathi (India)"],
    ]);
    expect(shortlists[0].options.map(o => o.id)).toEqual(["en-a", "en-b"]);
  });

  it("keeps the shortlist available after the card was answered", () => {
    // The point of the strip: the card locks, the options stay playable.
    const [shortlist] = collectVoiceShortlists(
      [
        question("q1", ["en-a", "en-b"], {
          answeredAnswer: { selectedOptionIds: ["en-b"] },
        }),
      ],
      catalog,
    );

    expect(shortlist.options).toHaveLength(2);
    expect(shortlist.chosenVoiceId).toBe("en-b");
  });

  it("reads a singleSelect answer that was recorded by label", () => {
    const [shortlist] = collectVoiceShortlists(
      [question("q1", ["en-a", "en-b"], { answeredWith: "en-a label" })],
      catalog,
    );

    expect(shortlist.chosenVoiceId).toBe("en-a");
  });

  it("marks a language the admin declined a voice for", () => {
    const [shortlist] = collectVoiceShortlists(
      [question("q1", ["en-a"], { answeredAnswer: { none: true } })],
      catalog,
    );

    expect(shortlist.noneChosen).toBe(true);
    expect(shortlist.chosenVoiceId).toBeUndefined();
  });

  it("lets a re-asked language replace its earlier shortlist", () => {
    const shortlists = collectVoiceShortlists(
      [question("q1", ["en-a"]), question("q2", ["en-b"])],
      catalog,
    );

    // One group per language, not a second English row.
    expect(shortlists).toHaveLength(1);
    expect(shortlists[0].options.map(o => o.id)).toEqual(["en-b"]);
  });

  it("ignores questions that are not about voices", () => {
    const shortlists = collectVoiceShortlists(
      [question("q1", ["guarded", "open"]), question("q2", ["en-a"])],
      catalog,
    );

    expect(shortlists.map(s => s.languageId)).toEqual(["1"]);
  });

  it("returns nothing before the catalog has loaded", () => {
    // Otherwise every option would look like "not a voice" and, worse, a
    // partially-loaded catalog could group a shortlist under the wrong tab.
    expect(collectVoiceShortlists([question("q1", ["en-a"])], [])).toEqual([]);
  });

  it("splits a mixed question across the languages its voices belong to", () => {
    // Regression: a real transcript offered English (US), (India) and (UK) in
    // one question, and taking the first option's language labelled the whole
    // group "English (US)". The prompt now asks per language, but an
    // overridden one still may not.
    const mixedCatalog = [
      { language_id: 1, label: "English (India)", voices: [{ id: "en-in" }] },
      { language_id: 12, label: "English (UK)", voices: [{ id: "en-uk" }] },
      { language_id: 13, label: "English (US)", voices: [{ id: "en-us" }] },
    ];

    const shortlists = collectVoiceShortlists(
      [
        question("q1", ["en-us", "en-in", "en-uk"], {
          answeredAnswer: { selectedOptionIds: ["en-uk"] },
        }),
      ],
      mixedCatalog,
    );

    expect(shortlists.map(s => [s.languageLabel, s.options.map(o => o.id)])).toEqual([
      ["English (India)", ["en-in"]],
      ["English (UK)", ["en-uk"]],
      ["English (US)", ["en-us"]],
    ]);
    // The pick is marked only on the language that actually holds it.
    expect(shortlists.map(s => s.chosenVoiceId)).toEqual([undefined, "en-uk", undefined]);
  });

  it("keeps the agent's reason, which is the useful half of the shortlist", () => {
    const [shortlist] = collectVoiceShortlists([question("q1", ["en-a"])], catalog);

    expect(shortlist.options[0].description).toBe("en-a reason");
  });
});
