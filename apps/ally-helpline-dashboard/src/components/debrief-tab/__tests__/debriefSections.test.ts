import { describe, expect, it } from "vitest";

import { isLabelledSectionKey, parseDebriefSections } from "../debriefSections";

const STRUCTURED_NOTE = [
  "Sandeep — that was a tough one to sit with.",
  "",
  "## [what_worked]",
  "You asked what the evenings were like [[msg:m7]], and she opened up.",
  "",
  "## [what_it_cost]",
  "Reassuring her there closed something off.",
  "",
  "## [try_next]",
  'Try "Can you say more about that?"',
  "",
  "## [closing]",
  "Reply and we'll talk it through.",
].join("\n");

describe("parseDebriefSections", () => {
  it("splits a keyed note into its sections, opening first", () => {
    const sections = parseDebriefSections(STRUCTURED_NOTE);

    expect(sections.map(section => section.key)).toEqual([
      null,
      "what_worked",
      "what_it_cost",
      "try_next",
      "closing",
    ]);
    expect(sections[0].paragraphs).toEqual(["Sandeep — that was a tough one to sit with."]);
    expect(sections[1].paragraphs[0]).toContain("[[msg:m7]]");
  });

  it("renders a note with no keys as one unlabelled block", () => {
    // Every note written before sections existed looks like this, and so does
    // any generation where the headings drifted. The learner should still get
    // their debrief, exactly as it read before.
    const sections = parseDebriefSections("First para.\n\nSecond para.");

    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBeNull();
    expect(sections[0].paragraphs).toEqual(["First para.", "Second para."]);
  });

  it("accepts the spellings a model actually drifts into", () => {
    const drifted = [
      "what_worked:",
      "You left the silence alone.",
      "",
      "**[what_it_cost]**",
      "You moved to reassurance early.",
      "",
      "#### TRY_NEXT",
      "Ask one more question before you close.",
    ].join("\n");

    expect(parseDebriefSections(drifted).map(section => section.key)).toEqual([
      "what_worked",
      "what_it_cost",
      "try_next",
    ]);
  });

  it("lifts a key the model wrote inline with its first sentence", () => {
    // The drift that actually reached learners: the marker arrived at the head
    // of the paragraph rather than on a line of its own, so the note read
    // "## [what_worked] You effectively acknowledged…" on screen.
    const inlineNote = [
      "Sandeep, today we focused on deepening emotional exploration.",
      "",
      "## [what_worked] You effectively acknowledged the client's challenges.",
      "",
      "## [what_it_cost] There were moments where you suggested solutions early.",
      "",
      "## [try_next] Try prompting the client to reflect more.",
      "",
      "## [closing] Feel free to reach out.",
    ].join("\n");

    const sections = parseDebriefSections(inlineNote);

    expect(sections.map(section => section.key)).toEqual([
      null,
      "what_worked",
      "what_it_cost",
      "try_next",
      "closing",
    ]);
    expect(sections[1].paragraphs).toEqual([
      "You effectively acknowledged the client's challenges.",
    ]);
    expect(sections.flatMap(section => section.paragraphs).join(" ")).not.toContain("[");
  });

  it("leaves prose alone when a key-like word opens a sentence without brackets", () => {
    // Only a bracketed key is lifted mid-prose. "Closing that door early…" is a
    // sentence, not a marker, and must not lose its first word to a heading.
    const sections = parseDebriefSections("Closing that door early cost you the moment.");

    expect(sections).toEqual([
      { key: null, paragraphs: ["Closing that door early cost you the moment."] },
    ]);
  });

  it("keeps a heading attached to prose on the very next line", () => {
    const sections = parseDebriefSections("## [what_worked]\nYou named the feeling first.");

    expect(sections).toEqual([
      { key: "what_worked", paragraphs: ["You named the feeling first."] },
    ]);
  });

  it("preserves paragraph breaks inside a section", () => {
    const sections = parseDebriefSections("## [try_next]\nOne thing.\n\nAnd why it helps.");

    expect(sections[0].paragraphs).toEqual(["One thing.", "And why it helps."]);
  });

  it("drops a heading that has nothing under it", () => {
    // Ally is told to omit a section it cannot support. A bare label with no
    // prose reads as a failed load, so treat drift the same way.
    const sections = parseDebriefSections(
      "## [what_worked]\n\n## [try_next]\nGive it a few more turns.",
    );

    expect(sections).toEqual([{ key: "try_next", paragraphs: ["Give it a few more turns."] }]);
  });

  it("folds a repeated key into the section already on screen", () => {
    const sections = parseDebriefSections(
      "## [what_worked]\nYou paused.\n\n## [what_worked]\nAnd you asked again.",
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].paragraphs).toEqual(["You paused.", "And you asked again."]);
  });

  it("handles a thin session that only carries one section", () => {
    const sections = parseDebriefSections(
      "This one ended before it got going.\n\n## [try_next]\nGive it a few more turns.",
    );

    expect(sections.map(section => section.key)).toEqual([null, "try_next"]);
  });

  it("returns nothing for an empty note", () => {
    expect(parseDebriefSections("")).toEqual([]);
    expect(parseDebriefSections("   \n\n  ")).toEqual([]);
  });
});

describe("isLabelledSectionKey", () => {
  it("labels the three content sections", () => {
    expect(isLabelledSectionKey("what_worked")).toBe(true);
    expect(isLabelledSectionKey("what_it_cost")).toBe(true);
    expect(isLabelledSectionKey("try_next")).toBe(true);
  });

  it("does not label the closing or the opening", () => {
    // The closing invites a reply; under a heading it would read as the thing
    // Ally asked them to practise.
    expect(isLabelledSectionKey("closing")).toBe(false);
    expect(isLabelledSectionKey(null)).toBe(false);
  });
});
