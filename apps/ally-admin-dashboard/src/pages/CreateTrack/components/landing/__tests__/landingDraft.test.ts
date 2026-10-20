import { describe, expect, it } from "vitest";

import { LandingSittingLength, StoryBeat, TrackLandingPage } from "@types";

import { emptyLandingPage } from "../../../trackFormUtils";
import { mergeLandingDraft } from "../landingDraft";

const page = (edit: (draft: TrackLandingPage) => void = () => undefined): TrackLandingPage => {
  const draft = emptyLandingPage();
  edit(draft);
  return draft;
};

/** A draft that offers something in every field the merge can fill. */
const fullDraft = (): TrackLandingPage =>
  page(d => {
    d.hero = {
      hook: "Draft hook",
      question: "Draft question?",
      courseLine: "Draft course line",
      buttonLabel: "Draft button",
    };
    d.persona = {
      name: "Draft Name",
      descriptor: "Draft descriptor",
      imageUrl: null,
      characterId: null,
    };
    d.firstMove = {
      enabled: true,
      sceneLine: "Draft scene",
      personaLine: "Draft persona line",
      prompt: "Draft prompt",
      replies: [
        { text: "Reply A", label: "Label A", why: "Why A" },
        { text: "Reply B", label: "Label B", why: null },
      ],
    };
    d.arc = {
      enabled: true,
      chapters: [
        { sectionId: "s1", beat: StoryBeat.SETUP, teaser: "Teaser 1" },
        { sectionId: "s2", beat: StoryBeat.CLIMAX, teaser: "Teaser 2" },
      ],
      hardCallSectionId: "s2",
    };
    d.outcomes.items = ["Outcome 1", "Outcome 2"];
    d.howItPlays.sittingLength = LandingSittingLength.SHORT;
    d.cast = {
      enabled: true,
      callerLine: "Draft caller line",
      guide: { name: "Draft guide", role: "Draft role", line: "Draft guide line" },
    };
    d.contentNotes.extraNote = "Draft note";
  });

describe("mergeLandingDraft", () => {
  it("fills an empty page from the draft and counts what it wrote", () => {
    const { merged, filledCount } = mergeLandingDraft(emptyLandingPage(), fullDraft());
    expect(merged.hero.hook).toBe("Draft hook");
    expect(merged.persona.name).toBe("Draft Name");
    expect(merged.firstMove.personaLine).toBe("Draft persona line");
    expect(merged.firstMove.replies).toEqual([
      { text: "Reply A", label: "Label A", why: "Why A" },
      { text: "Reply B", label: "Label B", why: null },
    ]);
    expect(merged.arc.chapters).toEqual([
      { sectionId: "s1", beat: StoryBeat.SETUP, teaser: "Teaser 1" },
      { sectionId: "s2", beat: StoryBeat.CLIMAX, teaser: "Teaser 2" },
    ]);
    expect(merged.arc.hardCallSectionId).toBe("s2");
    expect(merged.outcomes.items).toEqual(["Outcome 1", "Outcome 2"]);
    expect(merged.howItPlays.sittingLength).toBe(LandingSittingLength.SHORT);
    expect(merged.cast.guide.name).toBe("Draft guide");
    expect(merged.contentNotes.extraNote).toBe("Draft note");
    // 4 hero + 2 persona + 3 first move + 5 reply values + 4 chapter values + hard call
    // + 2 outcomes + sitting + caller line + 3 guide + note
    expect(filledCount).toBe(4 + 2 + 3 + 5 + 4 + 1 + 2 + 1 + 1 + 3 + 1);
  });

  it("never overwrites text the author wrote", () => {
    const current = page(p => {
      p.hero.hook = "My hook";
      p.persona.name = "My persona";
      p.firstMove.personaLine = "My line";
      p.cast.guide.name = "My guide";
      p.contentNotes.extraNote = "My note";
    });
    const { merged } = mergeLandingDraft(current, fullDraft());
    expect(merged.hero.hook).toBe("My hook");
    expect(merged.persona.name).toBe("My persona");
    expect(merged.firstMove.personaLine).toBe("My line");
    expect(merged.cast.guide.name).toBe("My guide");
    expect(merged.contentNotes.extraNote).toBe("My note");
    // The empty fields beside them are still filled.
    expect(merged.hero.question).toBe("Draft question?");
    expect(merged.cast.guide.role).toBe("Draft role");
  });

  it("treats whitespace as empty", () => {
    const current = page(p => (p.hero.hook = "   "));
    expect(mergeLandingDraft(current, fullDraft()).merged.hero.hook).toBe("Draft hook");
  });

  it("leaves the replies alone once the author has started them, even a single reply", () => {
    const current = page(p => (p.firstMove.replies = [{ text: "Mine", label: "", why: null }]));
    expect(mergeLandingDraft(current, fullDraft()).merged.firstMove.replies).toEqual([
      { text: "Mine", label: "", why: null },
    ]);
  });

  it("replaces a list of blank reply rows and blank outcome inputs", () => {
    const current = page(p => {
      p.firstMove.replies = [{ text: "", label: "", why: null }];
      p.outcomes.items = ["", ""];
    });
    const { merged } = mergeLandingDraft(current, fullDraft());
    expect(merged.firstMove.replies).toHaveLength(2);
    expect(merged.outcomes.items).toEqual(["Outcome 1", "Outcome 2"]);
  });

  it("leaves the outcomes alone once any one is written", () => {
    const current = page(p => (p.outcomes.items = ["", "Mine"]));
    expect(mergeLandingDraft(current, fullDraft()).merged.outcomes.items).toEqual(["", "Mine"]);
  });

  describe("chapters", () => {
    it("fills a chapter only while both its beat and teaser are empty", () => {
      const current = page(p => {
        p.arc.chapters = [
          { sectionId: "s1", beat: null, teaser: "Mine" },
          { sectionId: "s2", beat: null, teaser: null },
        ];
      });
      const { merged } = mergeLandingDraft(current, fullDraft());
      expect(merged.arc.chapters).toEqual([
        { sectionId: "s1", beat: null, teaser: "Mine" },
        { sectionId: "s2", beat: StoryBeat.CLIMAX, teaser: "Teaser 2" },
      ]);
    });

    it("leaves a chapter with only a beat alone", () => {
      const current = page(
        p => (p.arc.chapters = [{ sectionId: "s1", beat: StoryBeat.CONFLICT, teaser: null }]),
      );
      const chapter = mergeLandingDraft(current, fullDraft()).merged.arc.chapters.find(
        c => c.sectionId === "s1",
      );
      expect(chapter).toEqual({ sectionId: "s1", beat: StoryBeat.CONFLICT, teaser: null });
    });

    it("matches by sectionId, not by position", () => {
      const current = page(
        p =>
          (p.arc.chapters = [
            { sectionId: "s2", beat: null, teaser: null },
            { sectionId: "other", beat: null, teaser: null },
          ]),
      );
      const { merged } = mergeLandingDraft(current, fullDraft());
      expect(merged.arc.chapters.find(c => c.sectionId === "s2")?.teaser).toBe("Teaser 2");
      expect(merged.arc.chapters.find(c => c.sectionId === "other")).toEqual({
        sectionId: "other",
        beat: null,
        teaser: null,
      });
    });

    it("keeps the author's hard call", () => {
      const current = page(p => (p.arc.hardCallSectionId = "s1"));
      expect(mergeLandingDraft(current, fullDraft()).merged.arc.hardCallSectionId).toBe("s1");
    });
  });

  describe("what the draft may never touch", () => {
    it("leaves every enabled flag as the author set it", () => {
      const current = page(p => {
        p.firstMove.enabled = false;
        p.arc.enabled = false;
        p.outcomes.enabled = false;
        p.howItPlays.enabled = false;
        p.cast.enabled = false;
        p.xp.enabled = false;
      });
      const { merged } = mergeLandingDraft(current, fullDraft());
      expect(merged.firstMove.enabled).toBe(false);
      expect(merged.arc.enabled).toBe(false);
      expect(merged.outcomes.enabled).toBe(false);
      expect(merged.howItPlays.enabled).toBe(false);
      expect(merged.cast.enabled).toBe(false);
      expect(merged.xp.enabled).toBe(false);
      // The fields inside a switched-off block still fill: switches are the author's call, text is not.
      expect(merged.outcomes.items).toEqual(["Outcome 1", "Outcome 2"]);
    });

    it("leaves the persona image and character alone, even when the draft offers them", () => {
      const draft = fullDraft();
      draft.persona.imageUrl = "https://example.com/draft.png";
      draft.persona.characterId = "draft-character";
      const current = page(p => {
        p.persona.imageUrl = "https://example.com/mine.png";
        p.persona.characterId = "my-character";
      });
      const { merged } = mergeLandingDraft(current, draft);
      expect(merged.persona.imageUrl).toBe("https://example.com/mine.png");
      expect(merged.persona.characterId).toBe("my-character");

      const empty = mergeLandingDraft(emptyLandingPage(), draft).merged;
      expect(empty.persona.imageUrl).toBeNull();
      expect(empty.persona.characterId).toBeNull();
    });

    it("does not flip an enabled flag on when the draft has it off", () => {
      const draft = fullDraft();
      draft.xp.enabled = false;
      expect(mergeLandingDraft(emptyLandingPage(), draft).merged.xp.enabled).toBe(true);
    });
  });

  it("reports nothing filled when every field already has text", () => {
    const full = fullDraft();
    const { merged, filledCount } = mergeLandingDraft(full, fullDraft());
    expect(filledCount).toBe(0);
    expect(merged).toEqual(full);
  });

  it("reports nothing filled for an empty draft", () => {
    const { merged, filledCount } = mergeLandingDraft(emptyLandingPage(), emptyLandingPage());
    expect(filledCount).toBe(0);
    expect(merged).toEqual(emptyLandingPage());
  });

  it("does not modify its inputs", () => {
    const current = page(p => (p.hero.hook = "Mine"));
    const draft = fullDraft();
    const currentBefore = structuredClone(current);
    const draftBefore = structuredClone(draft);
    mergeLandingDraft(current, draft);
    expect(current).toEqual(currentBefore);
    expect(draft).toEqual(draftBefore);
  });
});
