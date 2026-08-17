import { describe, expect, it } from "vitest";

import { AnnotationTarget, AnnotationUnit } from "@types";

import { parseArtifact, resegmentArtifact, unitsToSourceText } from "./annotationSegmentation";

describe("parseArtifact", () => {
  it("splits a transcript into speaker turns", () => {
    const units = parseArtifact(
      "Caller: I don't know why I called.\nVolunteer: Take your time.",
      "TRANSCRIPT",
    );
    expect(units).toEqual([
      { speaker: "Caller", text: "I don't know why I called." },
      { speaker: "Volunteer", text: "Take your time." },
    ]);
  });

  it("keeps a line with no speaker prefix rather than dropping it", () => {
    const units = parseArtifact("Caller: Hello\n[long pause]", "TRANSCRIPT");
    expect(units).toEqual([{ speaker: "Caller", text: "Hello" }, { text: "[long pause]" }]);
  });

  it("does not mistake a mid-sentence colon for a speaker", () => {
    const long = "There is one thing I have never told anyone about all of this: I am scared";
    const units = parseArtifact(long, "TRANSCRIPT");
    expect(units).toEqual([{ text: long }]);
  });

  it("splits a document on blank lines and joins wrapped lines", () => {
    const units = parseArtifact("First para\nstill first.\n\nSecond para.", "DOCUMENT");
    expect(units).toEqual([{ text: "First para still first." }, { text: "Second para." }]);
  });

  it("returns nothing for empty input", () => {
    expect(parseArtifact("   \n  ", "TRANSCRIPT")).toEqual([]);
  });
});

describe("resegmentArtifact", () => {
  const existingUnits: AnnotationUnit[] = [
    { id: "u1", speaker: "Caller", text: "Line one." },
    { id: "u2", speaker: "Caller", text: "Line two." },
    { id: "u3", speaker: "Volunteer", text: "Line three." },
  ];
  const existingTargets: AnnotationTarget[] = [
    { unitId: "u2", labelId: "l1", note: "Why this matters." },
  ];

  const resegment = (raw: string) =>
    resegmentArtifact({ raw, kind: "TRANSCRIPT", existingUnits, existingTargets });

  it("keeps every id when nothing changed", () => {
    const result = resegment("Caller: Line one.\nCaller: Line two.\nVolunteer: Line three.");
    expect(result.units.map(u => u.id)).toEqual(["u1", "u2", "u3"]);
    expect(result.droppedTargetCount).toBe(0);
  });

  it("keeps the marked line's id when a typo is fixed on it", () => {
    const result = resegment("Caller: Line one.\nCaller: Line two!\nVolunteer: Line three.");
    expect(result.units[1].id).toBe("u2");
    expect(result.units[1].text).toBe("Line two!");
    expect(result.targets).toHaveLength(1);
    expect(result.droppedTargetCount).toBe(0);
  });

  it("keeps the marked line's id when a line is inserted above it", () => {
    const result = resegment(
      "Caller: Brand new line.\nCaller: Line one.\nCaller: Line two.\nVolunteer: Line three.",
    );
    const lineTwo = result.units.find(u => u.text === "Line two.");
    expect(lineTwo?.id).toBe("u2");
    expect(result.targets).toHaveLength(1);
    expect(result.droppedTargetCount).toBe(0);
  });

  it("keeps the marked line's id when lines are reordered", () => {
    const result = resegment("Volunteer: Line three.\nCaller: Line two.\nCaller: Line one.");
    expect(result.units.map(u => u.id)).toEqual(["u3", "u2", "u1"]);
    expect(result.targets).toHaveLength(1);
  });

  it("drops the target and reports it when the marked line is deleted", () => {
    const result = resegment("Caller: Line one.\nVolunteer: Line three.");
    expect(result.units.map(u => u.id)).toEqual(["u1", "u3"]);
    expect(result.targets).toHaveLength(0);
    expect(result.droppedTargetCount).toBe(1);
  });

  it("mints fresh ids for genuinely new lines", () => {
    const result = resegment(
      "Caller: Line one.\nCaller: Line two.\nVolunteer: Line three.\nCaller: Line four.",
    );
    expect(result.units).toHaveLength(4);
    expect(result.units[3].id).not.toBe("u1");
    expect(new Set(result.units.map(u => u.id)).size).toBe(4);
  });

  it("drops every target when the artifact is cleared", () => {
    const result = resegment("");
    expect(result.units).toEqual([]);
    expect(result.droppedTargetCount).toBe(1);
  });
});

describe("unitsToSourceText", () => {
  it("round-trips a transcript back into editable text", () => {
    const units: AnnotationUnit[] = [
      { id: "u1", speaker: "Caller", text: "Hello." },
      { id: "u2", text: "[pause]" },
    ];
    const raw = unitsToSourceText(units, "TRANSCRIPT");
    expect(raw).toBe("Caller: Hello.\n[pause]");
    expect(parseArtifact(raw, "TRANSCRIPT")).toEqual([
      { speaker: "Caller", text: "Hello." },
      { text: "[pause]" },
    ]);
  });

  it("separates document paragraphs with a blank line", () => {
    const units: AnnotationUnit[] = [
      { id: "u1", text: "One." },
      { id: "u2", text: "Two." },
    ];
    expect(unitsToSourceText(units, "DOCUMENT")).toBe("One.\n\nTwo.");
  });
});
