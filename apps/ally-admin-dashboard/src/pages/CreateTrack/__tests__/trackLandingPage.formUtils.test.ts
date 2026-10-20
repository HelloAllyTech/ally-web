import { describe, expect, it } from "vitest";

import { DEFAULT_TRACK_FORM_VALUES } from "@constants";
import {
  LANDING_LIMITS,
  LandingSittingLength,
  SimulationStatus,
  StoryBeat,
  TrackDetail,
  TrackFormValues,
  TrackLandingPage,
} from "@types";

import {
  deserializeTrack,
  emptyLandingPage,
  extractTrackMetadata,
  hasLandingPageContent,
  serializeLandingPage,
  withLandingDefaults,
} from "../trackFormUtils";

const detail = (overrides: Partial<TrackDetail> = {}): TrackDetail => ({
  id: "track-1",
  title: "Course",
  description: "",
  coverImageUrl: "",
  status: SimulationStatus.DRAFT,
  isGlobal: false,
  totalItems: 0,
  sections: [],
  ...overrides,
});

const section = (serverId?: string) => ({
  localId: `local-${serverId ?? "new"}`,
  serverId,
  title: "Section",
  description: "",
  items: [],
});

const withPage = (
  landingPage: TrackLandingPage | null | undefined,
  sectionIds: (string | undefined)[] = [],
): TrackFormValues => ({
  ...DEFAULT_TRACK_FORM_VALUES,
  title: "Course",
  landingPage,
  sections: sectionIds.map(section),
});

describe("emptyLandingPage", () => {
  it("matches the backend defaults: every block on, nothing written", () => {
    const page = emptyLandingPage();
    expect(page.version).toBe(1);
    expect(page.firstMove.enabled).toBe(true);
    expect(page.arc.enabled).toBe(true);
    expect(page.outcomes.enabled).toBe(true);
    expect(page.howItPlays.enabled).toBe(true);
    expect(page.cast.enabled).toBe(true);
    expect(page.xp.enabled).toBe(true);
    expect(page.hero).toEqual({ hook: null, question: null, courseLine: null, buttonLabel: null });
    expect(page.firstMove.replies).toEqual([]);
    expect(page.arc).toMatchObject({ chapters: [], hardCallSectionId: null });
    expect(page.outcomes.items).toEqual([]);
    expect(page.cast.guide).toEqual({ name: null, role: null, line: null });
  });

  it("returns a new object each time, so editing one form never edits another", () => {
    const first = emptyLandingPage();
    first.hero.hook = "changed";
    first.firstMove.replies.push({ text: "a", label: "b", why: null });
    expect(emptyLandingPage().hero.hook).toBeNull();
    expect(emptyLandingPage().firstMove.replies).toEqual([]);
  });
});

describe("withLandingDefaults", () => {
  it("reads null and undefined as the empty page", () => {
    expect(withLandingDefaults(null)).toEqual(emptyLandingPage());
    expect(withLandingDefaults(undefined)).toEqual(emptyLandingPage());
  });

  it("fills every key a partial page lacks, keeping what it has", () => {
    const page = withLandingDefaults({
      hero: { hook: "A hook" },
      firstMove: { enabled: false },
      outcomes: { items: ["Do a thing"] },
    });
    expect(page.hero).toEqual({
      hook: "A hook",
      question: null,
      courseLine: null,
      buttonLabel: null,
    });
    expect(page.firstMove.enabled).toBe(false);
    expect(page.firstMove.replies).toEqual([]);
    expect(page.outcomes).toEqual({ enabled: true, items: ["Do a thing"] });
    expect(page.cast.guide).toEqual({ name: null, role: null, line: null });
  });

  it("reads an unknown beat or sitting length as unset", () => {
    const page = withLandingDefaults({
      arc: { chapters: [{ sectionId: "s1", beat: "FINALE" as StoryBeat, teaser: "t" }] },
      howItPlays: { sittingLength: "FOREVER" as LandingSittingLength },
    });
    expect(page.arc.chapters).toEqual([{ sectionId: "s1", beat: null, teaser: "t" }]);
    expect(page.howItPlays.sittingLength).toBeNull();
  });

  it("copies rather than aliases, so a frozen RTK Query cache entry is safe to read", () => {
    const stored = Object.freeze({
      ...emptyLandingPage(),
      outcomes: Object.freeze({
        enabled: true,
        items: Object.freeze(["a"]) as unknown as string[],
      }),
    }) as TrackLandingPage;
    const page = withLandingDefaults(stored);
    page.outcomes.items.push("b");
    expect(stored.outcomes.items).toEqual(["a"]);
  });
});

describe("deserializeTrack — landing page", () => {
  it("gives a course with no page the empty page, never null", () => {
    expect(deserializeTrack(detail({ landingPage: null })).landingPage).toEqual(emptyLandingPage());
    expect(deserializeTrack(detail()).landingPage).toEqual(emptyLandingPage());
  });

  it("carries a saved page into the form", () => {
    const saved: TrackLandingPage = {
      ...emptyLandingPage(),
      hero: { hook: "Hook", question: "Q?", courseLine: null, buttonLabel: "Go" },
      persona: { name: "Meera, 19", descriptor: null, imageUrl: null, characterId: "c1" },
      arc: {
        enabled: true,
        chapters: [{ sectionId: "s1", beat: StoryBeat.CLIMAX, teaser: "Tease" }],
        hardCallSectionId: "s1",
      },
    };
    const form = deserializeTrack(detail({ landingPage: saved }));
    expect(form.landingPage).toEqual(saved);
    expect(form.landingPage).not.toBe(saved);
  });
});

describe("hasLandingPageContent", () => {
  it("is false for nothing, the empty page and a page of only whitespace", () => {
    expect(hasLandingPageContent(null)).toBe(false);
    expect(hasLandingPageContent(undefined)).toBe(false);
    expect(hasLandingPageContent(emptyLandingPage())).toBe(false);
    const blank = emptyLandingPage();
    blank.hero.hook = "   ";
    blank.outcomes.items = ["", " "];
    blank.firstMove.replies = [{ text: "", label: " ", why: null }];
    blank.arc.chapters = [{ sectionId: "s1", beat: null, teaser: " " }];
    expect(hasLandingPageContent(blank)).toBe(false);
  });

  it.each([
    ["a hook", (p: TrackLandingPage) => void (p.hero.hook = "Hook")],
    ["only a button label", (p: TrackLandingPage) => void (p.hero.buttonLabel = "Go")],
    ["a persona image", (p: TrackLandingPage) => void (p.persona.imageUrl = "https://x/y.png")],
    ["an outcome", (p: TrackLandingPage) => void (p.outcomes.items = ["Do it"])],
    [
      "a reply",
      (p: TrackLandingPage) => void (p.firstMove.replies = [{ text: "x", label: "", why: null }]),
    ],
    [
      "a chapter beat",
      (p: TrackLandingPage) =>
        void (p.arc.chapters = [{ sectionId: "s1", beat: StoryBeat.SETUP, teaser: null }]),
    ],
    ["a hard call", (p: TrackLandingPage) => void (p.arc.hardCallSectionId = "s1")],
    [
      "a sitting length",
      (p: TrackLandingPage) => void (p.howItPlays.sittingLength = LandingSittingLength.SHORT),
    ],
    ["a guide name", (p: TrackLandingPage) => void (p.cast.guide.name = "Dr. Rao")],
    ["an extra note", (p: TrackLandingPage) => void (p.contentNotes.extraNote = "Note")],
    ["a block switched off", (p: TrackLandingPage) => void (p.xp.enabled = false)],
  ])("is true with %s", (_label, edit) => {
    const page = emptyLandingPage();
    edit(page);
    expect(hasLandingPageContent(page)).toBe(true);
  });
});

describe("extractTrackMetadata — landing page", () => {
  it("sends null when the page is entirely empty, so an emptied page clears the stored one", () => {
    expect(extractTrackMetadata(withPage(emptyLandingPage())).landingPage).toBeNull();
    expect(extractTrackMetadata(withPage(null)).landingPage).toBeNull();
    expect(extractTrackMetadata(DEFAULT_TRACK_FORM_VALUES).landingPage).toBeNull();
    // The key is present, not omitted: absent would leave the stored page untouched.
    expect(extractTrackMetadata(withPage(null))).toHaveProperty("landingPage", null);
  });

  it("sends the page once the Hero has a hook", () => {
    const page = emptyLandingPage();
    page.hero.hook = "She says she's fine.";
    const sent = extractTrackMetadata(withPage(page)).landingPage;
    expect(sent?.hero.hook).toBe("She says she's fine.");
    expect(sent?.version).toBe(1);
    expect(sent?.xp).toEqual({ enabled: true });
  });

  it("sends the page when something other than the hook is filled", () => {
    const page = emptyLandingPage();
    page.outcomes.items = ["Name the feeling"];
    expect(extractTrackMetadata(withPage(page)).landingPage?.outcomes.items).toEqual([
      "Name the feeling",
    ]);
  });

  it("keeps a block the author switched off, even with nothing written", () => {
    const page = emptyLandingPage();
    page.cast.enabled = false;
    expect(extractTrackMetadata(withPage(page)).landingPage?.cast.enabled).toBe(false);
  });
});

describe("serializeLandingPage", () => {
  it("drops blank reply rows and blank outcome inputs, and caps both lists", () => {
    const page = emptyLandingPage();
    page.hero.hook = "Hook";
    page.firstMove.replies = [
      { text: "One", label: "Label one", why: null },
      { text: "", label: "", why: null },
      { text: "Two", label: "", why: null },
    ];
    page.outcomes.items = ["A", "", "B", "C", "D"];
    const sent = serializeLandingPage(page, []);
    expect(sent?.firstMove.replies).toEqual([
      { text: "One", label: "Label one", why: null },
      { text: "Two", label: "", why: null },
    ]);
    expect(sent?.outcomes.items).toEqual(["A", "B", "C"]);
    expect(sent?.outcomes.items.length).toBeLessThanOrEqual(LANDING_LIMITS.outcomesMax);
  });

  it("keeps a chapter only while its section is in the course and it has a beat or teaser", () => {
    const page = emptyLandingPage();
    page.hero.hook = "Hook";
    page.arc.chapters = [
      { sectionId: "s1", beat: StoryBeat.SETUP, teaser: null },
      { sectionId: "s2", beat: null, teaser: "  " },
      { sectionId: "gone", beat: StoryBeat.CLIMAX, teaser: "Removed section" },
      { sectionId: "s3", beat: null, teaser: "Tease" },
    ];
    const sent = serializeLandingPage(page, [section("s1"), section("s2"), section("s3")]);
    expect(sent?.arc.chapters.map(chapter => chapter.sectionId)).toEqual(["s1", "s3"]);
  });

  it("clears a hard call on a section that is gone, and ignores unsaved sections", () => {
    const page = emptyLandingPage();
    page.hero.hook = "Hook";
    page.arc.hardCallSectionId = "gone";
    expect(
      serializeLandingPage(page, [section("s1"), section(undefined)])?.arc.hardCallSectionId,
    ).toBeNull();
    page.arc.hardCallSectionId = "s1";
    expect(serializeLandingPage(page, [section("s1")])?.arc.hardCallSectionId).toBe("s1");
  });
});
