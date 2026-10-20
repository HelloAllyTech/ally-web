import { describe, expect, it } from "vitest";

import {
  LandingSittingLength,
  StoryBeat,
  TrackFormValues,
  TrackItemType,
  TrackLandingPage,
} from "@types";

import { emptyLandingPage } from "../../../trackFormUtils";
import {
  LANDING_BLOCK_ORDER,
  computeLandingBlockStatuses,
  countItemsByType,
  countReadyBlocks,
  isFirstMoveComplete,
  personaFromCharacter,
} from "../landingBlocks";

const page = (edit: (draft: TrackLandingPage) => void = () => undefined): TrackLandingPage => {
  const draft = emptyLandingPage();
  edit(draft);
  return draft;
};

const sections = [{ serverId: "s1" }, { serverId: "s2" }, { serverId: undefined }];

describe("computeLandingBlockStatuses", () => {
  it("starts a blank page with Hero, First move, Outcomes and Cast waiting on input", () => {
    expect(computeLandingBlockStatuses(page(), sections)).toEqual({
      hero: "NEEDS_INPUT",
      firstMove: "NEEDS_INPUT",
      arc: "AUTO",
      outcomes: "NEEDS_INPUT",
      howItPlays: "AUTO",
      cast: "NEEDS_INPUT",
      xp: "AUTO",
      contentNotes: "AUTO",
    });
  });

  it("marks the Hero set once it has a hook, and not for whitespace", () => {
    expect(
      computeLandingBlockStatuses(
        page(p => (p.hero.hook = "Hook")),
        [],
      ).hero,
    ).toBe("SET");
    expect(
      computeLandingBlockStatuses(
        page(p => (p.hero.hook = "   ")),
        [],
      ).hero,
    ).toBe("NEEDS_INPUT");
  });

  it("needs a persona line and two showable replies before First move is set", () => {
    const base = (replies: { text: string; label: string; why: string | null }[]) =>
      page(p => {
        p.firstMove.personaLine = "I'm fine.";
        p.firstMove.replies = replies;
      });
    const good = { text: "Tell me more", label: "Curious", why: null };
    expect(computeLandingBlockStatuses(base([good]), []).firstMove).toBe("NEEDS_INPUT");
    // A reply without its "what it shows" label can't be shown.
    expect(
      computeLandingBlockStatuses(base([good, { text: "Hmm", label: "", why: null }]), [])
        .firstMove,
    ).toBe("NEEDS_INPUT");
    expect(computeLandingBlockStatuses(base([good, good]), []).firstMove).toBe("SET");

    const noLine = base([good, good]);
    noLine.firstMove.personaLine = null;
    expect(isFirstMoveComplete(noLine)).toBe(false);
  });

  it("shows Off for a switched-off block whatever it holds", () => {
    const statuses = computeLandingBlockStatuses(
      page(p => {
        p.firstMove.enabled = false;
        p.arc.enabled = false;
        p.outcomes.enabled = false;
        p.outcomes.items = ["Do it"];
        p.howItPlays.enabled = false;
        p.cast.enabled = false;
        p.xp.enabled = false;
      }),
      sections,
    );
    expect(statuses).toMatchObject({
      firstMove: "OFF",
      arc: "OFF",
      outcomes: "OFF",
      howItPlays: "OFF",
      cast: "OFF",
      xp: "OFF",
    });
    // Hero and Content notes have no switch.
    expect(statuses.hero).toBe("NEEDS_INPUT");
    expect(statuses.contentNotes).toBe("AUTO");
  });

  it("sets the Story arc only for a beat or teaser on a section the course still has", () => {
    const withChapter = (sectionId: string, beat: StoryBeat | null, teaser: string | null) =>
      page(p => (p.arc.chapters = [{ sectionId, beat, teaser }]));
    expect(computeLandingBlockStatuses(withChapter("s1", null, "A teaser"), sections).arc).toBe(
      "SET",
    );
    expect(
      computeLandingBlockStatuses(withChapter("s2", StoryBeat.CLIMAX, null), sections).arc,
    ).toBe("SET");
    expect(computeLandingBlockStatuses(withChapter("gone", null, "Stale"), sections).arc).toBe(
      "AUTO",
    );
    expect(computeLandingBlockStatuses(withChapter("s1", null, "  "), sections).arc).toBe("AUTO");
  });

  it("needs a persona name or a guide name for the Cast", () => {
    expect(
      computeLandingBlockStatuses(
        page(p => (p.persona.name = "Meera, 19")),
        [],
      ).cast,
    ).toBe("SET");
    expect(
      computeLandingBlockStatuses(
        page(p => (p.cast.guide.name = "Dr. Rao")),
        [],
      ).cast,
    ).toBe("SET");
    expect(
      computeLandingBlockStatuses(
        page(p => (p.cast.callerLine = "Calls at night")),
        [],
      ).cast,
    ).toBe("NEEDS_INPUT");
  });

  it("sets Outcomes, How it plays and Content notes from what the author wrote", () => {
    const statuses = computeLandingBlockStatuses(
      page(p => {
        p.outcomes.items = ["", "Name the feeling"];
        p.howItPlays.sittingLength = LandingSittingLength.MEDIUM;
        p.contentNotes.extraNote = "Fictional callers.";
      }),
      [],
    );
    expect(statuses).toMatchObject({ outcomes: "SET", howItPlays: "SET", contentNotes: "SET" });
  });
});

describe("countReadyBlocks", () => {
  it("counts Set and Auto blocks as ready, out of the blocks that are on", () => {
    // Blank page: Hero, First move, Outcomes, Cast need input; Arc, How it plays, XP, Notes are auto.
    expect(countReadyBlocks(computeLandingBlockStatuses(page(), []))).toEqual({
      ready: 4,
      total: 8,
    });
  });

  it("leaves a switched-off block out of both numbers", () => {
    const statuses = computeLandingBlockStatuses(
      page(p => {
        p.hero.hook = "Hook";
        p.firstMove.enabled = false;
        p.outcomes.enabled = false;
        p.cast.enabled = false;
      }),
      [],
    );
    expect(countReadyBlocks(statuses)).toEqual({ ready: 5, total: 5 });
  });

  it("is fully ready when every block is set or automatic", () => {
    const full = page(p => {
      p.hero.hook = "Hook";
      p.firstMove.personaLine = "Line";
      p.firstMove.replies = [
        { text: "a", label: "A", why: null },
        { text: "b", label: "B", why: null },
      ];
      p.outcomes.items = ["Do it"];
      p.persona.name = "Meera, 19";
    });
    expect(countReadyBlocks(computeLandingBlockStatuses(full, []))).toEqual({ ready: 8, total: 8 });
  });

  it("lists the blocks in the order the page shows them", () => {
    expect(LANDING_BLOCK_ORDER).toEqual([
      "hero",
      "firstMove",
      "arc",
      "outcomes",
      "howItPlays",
      "cast",
      "xp",
      "contentNotes",
    ]);
  });
});

describe("countItemsByType", () => {
  const item = (type: TrackItemType) => ({
    localId: Math.random().toString(),
    type,
    title: "",
    description: "",
    completionCriteria: {},
  });
  const form = (...groups: TrackItemType[][]): TrackFormValues["sections"] =>
    groups.map((types, index) => ({
      localId: `s${index}`,
      title: `Section ${index}`,
      description: "",
      items: types.map(item),
    }));

  it("counts each type across every section, in declared type order", () => {
    expect(
      countItemsByType(
        form(
          [TrackItemType.ARTICLE, TrackItemType.ROLEPLAY],
          [TrackItemType.ROLEPLAY, TrackItemType.QUIZ, TrackItemType.ARTICLE],
        ),
      ),
    ).toEqual([
      { type: TrackItemType.ROLEPLAY, count: 2 },
      { type: TrackItemType.QUIZ, count: 1 },
      { type: TrackItemType.ARTICLE, count: 2 },
    ]);
  });

  it("is empty for a course with no items", () => {
    expect(countItemsByType(form([], []))).toEqual([]);
    expect(countItemsByType([])).toEqual([]);
  });
});

describe("personaFromCharacter", () => {
  it("copies the name with the age, the image and the id", () => {
    expect(
      personaFromCharacter({
        id: "char-1",
        name: "Meera",
        age: 19,
        coverImageUrl: "https://cdn.example/meera.png",
      }),
    ).toEqual({
      name: "Meera, 19",
      imageUrl: "https://cdn.example/meera.png",
      characterId: "char-1",
    });
  });

  it("uses the bare name when there is no age, and accepts an age typed as text", () => {
    expect(personaFromCharacter({ id: "c", name: "Meera", age: "" }).name).toBe("Meera");
    expect(personaFromCharacter({ id: "c", name: "Meera", age: " 19 " }).name).toBe("Meera, 19");
  });

  it("leaves the image to the caller when the character has none", () => {
    expect(personaFromCharacter({ id: "c", name: "Meera", age: 19 }).imageUrl).toBeNull();
  });

  it("keeps the name inside the persona name limit", () => {
    expect(personaFromCharacter({ name: "M".repeat(80), age: 19 }).name).toHaveLength(60);
  });
});
