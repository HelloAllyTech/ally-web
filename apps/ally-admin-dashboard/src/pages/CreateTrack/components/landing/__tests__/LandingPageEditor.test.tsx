import { ReactNode } from "react";

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToast, mockUpload } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  mockUpload: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

// Carbon's Tooltip animates through floating-ui state updates that React warns about under test.
// A stand-in that keeps the label where an assertion can read it is enough here.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ label, children }: { label: string; children: ReactNode }) => (
    <span data-tooltip={label}>{children}</span>
  ),
  CustomImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@api", () => ({
  useDraftTrackLandingPageMutation: vi.fn(),
  useGetCharactersQuery: vi.fn(),
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <span data-testid="tooltip-icon" />,
  Trash: () => <span data-testid="trash" />,
  Launch: () => <span data-testid="launch" />,
  WandStars: () => <span data-testid="wand" />,
  Locked: () => <span data-testid="lock" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label ?? "Toggle"}
      onClick={() => onChange(!enabled)}
    />
  ),
}));

vi.mock("@components/organization-access-details/text-helpline/helpers", () => ({
  buildPublicLink: (path: string) => `https://app.example.com${path}`,
}));

// The real `@constants` barrel reaches into `@components` (for `cellTypes`), which this suite mocks,
// so the mock is built from the real submodules this editor reads: the copy, the course constants
// and the permission names.
vi.mock("@constants", async () => ({
  ...(await import("../../../../../constants/CreateTrack")),
  ...(await import("../../../../../constants/permissions")),
  en: (await import("../../../../../constants/en")).en,
}));

vi.mock("@utils", () => ({
  hasPermissions: (granted: string[] = [], required: string[] = []) =>
    !required.length || required.some(permission => granted.includes(permission)),
}));

vi.mock("@hooks", () => ({
  useCanUseCourseCopilot: vi.fn(),
  useUser: vi.fn(),
  useClickOutside: vi.fn(),
}));

vi.mock("../../../useTrackMediaUpload", () => ({
  useTrackMediaUpload: () => ({ upload: mockUpload, isUploading: false }),
}));

import * as api from "@api";
import * as hooks from "@hooks";
import { DEFAULT_TRACK_FORM_VALUES, en } from "@constants";
import {
  LandingSittingLength,
  StoryBeat,
  TrackFormValues,
  TrackItemType,
  TrackLandingPage,
} from "@types";

import { emptyLandingPage } from "../../../trackFormUtils";
import { LandingPageEditor } from "../LandingPageEditor";

const TRACK_ID = "96d570f0-14b6-42d7-8e78-79d7520c7f69";
const copy = en.courseLanding;

const draftMutation = vi.fn();
const mockDraftResult = (result: unknown) =>
  draftMutation.mockReturnValue({ unwrap: () => Promise.resolve(result) });
const mockDraftFailure = (error: unknown) =>
  draftMutation.mockReturnValue({ unwrap: () => Promise.reject(error) });

const item = (type: TrackItemType, localId: string) => ({
  localId,
  type,
  title: localId,
  description: "",
  completionCriteria: {},
});

const SECTIONS: TrackFormValues["sections"] = [
  {
    localId: "l1",
    serverId: "s1",
    title: "The call",
    description: "",
    items: [item(TrackItemType.ROLEPLAY, "i1"), item(TrackItemType.ARTICLE, "i2")],
  },
  {
    localId: "l2",
    serverId: "s2",
    title: "The debrief",
    description: "",
    items: [item(TrackItemType.ROLEPLAY, "i3"), item(TrackItemType.QUIZ, "i4")],
  },
  { localId: "l3", title: "Brand new", description: "", items: [] },
];

/** Prints the live landing page so assertions read what a save would send. */
const FormValue = () => {
  const { control } = useFormContext<TrackFormValues>();
  const value = useWatch({ control, name: "landingPage" });
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
};

/** Makes the form dirty the way any other edit in the builder would. */
const DirtyButton = () => {
  const { setValue } = useFormContext<TrackFormValues>();
  return (
    <button type="button" onClick={() => setValue("title", "Edited", { shouldDirty: true })}>
      make dirty
    </button>
  );
};

interface HarnessProps {
  landingPage?: TrackLandingPage | null;
  sections?: TrackFormValues["sections"];
  trackId?: string | null;
  isPublished?: boolean;
  isPublicView?: boolean;
  estimatedDurationMinutes?: number | null;
  children?: ReactNode;
}

const Harness = ({
  landingPage = null,
  sections = SECTIONS,
  trackId = TRACK_ID,
  isPublished = true,
  isPublicView = true,
  estimatedDurationMinutes = null,
}: HarnessProps) => {
  const methods = useForm<TrackFormValues>({
    defaultValues: {
      ...DEFAULT_TRACK_FORM_VALUES,
      title: "Course",
      isPublicView,
      estimatedDurationMinutes,
      landingPage,
      sections,
    },
  });
  return (
    <FormProvider {...methods}>
      <LandingPageEditor trackId={trackId} isPublished={isPublished} />
      <DirtyButton />
      <FormValue />
    </FormProvider>
  );
};

const saved = (): TrackLandingPage => {
  const page = emptyLandingPage();
  return page;
};

const stored = (): TrackLandingPage =>
  JSON.parse(screen.getByTestId("value").textContent ?? "null") as TrackLandingPage;

const selectBlock = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(
    within(screen.getByRole("list", { name: copy.blockListLabel })).getByRole("button", {
      name: new RegExp(`^${name}`),
    }),
  );

/** The tooltip wrapped around an element, read from the stand-in above. */
const tooltipOf = (element: HTMLElement) =>
  element.closest("[data-tooltip]")?.getAttribute("data-tooltip");

const rowOf = (key: string) => screen.getByTestId(`landing-block-${key}`);

beforeEach(() => {
  vi.clearAllMocks();
  (api.useDraftTrackLandingPageMutation as ReturnType<typeof vi.fn>).mockReturnValue([
    draftMutation,
    { isLoading: false },
  ]);
  (api.useGetCharactersQuery as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
  (hooks.useCanUseCourseCopilot as ReturnType<typeof vi.fn>).mockReturnValue(true);
  (hooks.useUser as ReturnType<typeof vi.fn>).mockReturnValue({ permissions: [], features: [] });
});

describe("LandingPageEditor — header and block list", () => {
  it("explains what the page is and when the story layout turns on", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Landing page" })).toBeTruthy();
    expect(screen.getByText(copy.explainer)).toBeTruthy();
    expect(copy.explainer).toContain("once the Hero has a hook");
  });

  it("lists the eight blocks in order, each with a status tag", () => {
    render(<Harness />);
    const rows = within(screen.getByRole("list", { name: copy.blockListLabel })).getAllByRole(
      "listitem",
    );
    expect(rows.map(row => within(row).getAllByRole("button")[0].textContent)).toEqual([
      "HeroNeeds input",
      "First moveNeeds input",
      "Story arcAuto",
      "OutcomesNeeds input",
      "How it playsAuto",
      "CastNeeds input",
      "XP lineAuto",
      "Content notesAuto",
    ]);
  });

  it("counts the blocks that are ready, and moves as the author writes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("landing-readiness").textContent).toBe("4 of 8 blocks ready");

    await user.type(screen.getByLabelText("Hook"), "She says she's fine.");

    expect(screen.getByTestId("landing-readiness").textContent).toBe("5 of 8 blocks ready");
    expect(within(rowOf("hero")).getByTestId("landing-status-tag").textContent).toBe("Set");
    expect(stored().hero.hook).toBe("She says she's fine.");
  });

  it("gives every block with a switch an on/off toggle, and Content notes a lock instead", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    for (const key of ["firstMove", "arc", "outcomes", "howItPlays", "cast", "xp"]) {
      expect(within(rowOf(key)).getByRole("switch")).toBeTruthy();
    }
    expect(within(rowOf("hero")).queryByRole("switch")).toBeNull();
    expect(within(rowOf("contentNotes")).queryByRole("switch")).toBeNull();
    expect(within(rowOf("contentNotes")).getByLabelText(copy.contentNotesLockHint)).toBeTruthy();

    await user.click(screen.getByRole("switch", { name: "Show First move" }));
    expect(stored().firstMove.enabled).toBe(false);
    expect(within(rowOf("firstMove")).getByTestId("landing-status-tag").textContent).toBe("Off");
    expect(screen.getByTestId("landing-readiness").textContent).toBe("4 of 7 blocks ready");

    await user.click(screen.getByRole("switch", { name: "Show First move" }));
    expect(stored().firstMove.enabled).toBe(true);
  });

  it("ends each block with the line that says what the page shows without it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const expected: Record<string, string> = {
      Hero: "Without a hook, the page shows the standard outline.",
      "First move": "Off or fewer than two replies: the hero's button goes straight to login.",
      "Story arc": "No teaser: the chapter shows its section description.",
      Outcomes: "Empty: the block is hidden.",
      Cast: "No guide: only the caller shows.",
      "XP line": "Off: no XP line.",
    };
    for (const [name, line] of Object.entries(expected)) {
      await selectBlock(user, name);
      expect(screen.getByTestId("landing-fallback").textContent).toBe(line);
    }
  });

  it("says so on a block that is switched off, and keeps its fields editable", async () => {
    const user = userEvent.setup();
    render(<Harness landingPage={{ ...saved(), outcomes: { enabled: false, items: [] } }} />);
    await selectBlock(user, "Outcomes");
    expect(screen.getByText(copy.offNote)).toBeTruthy();
    await user.type(screen.getByLabelText("Outcome 1"), "Name the feeling");
    expect(stored().outcomes.items).toEqual(["Name the feeling"]);
  });
});

describe("LandingPageEditor — Hero", () => {
  it("counts characters against each limit and stops at it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const hook = screen.getByLabelText("Hook") as HTMLTextAreaElement;
    expect(hook.maxLength).toBe(140);
    expect(screen.getAllByTestId("landing-char-count")[0].textContent).toBe("0/140");

    await user.type(hook, "Hello");
    expect(screen.getAllByTestId("landing-char-count")[0].textContent).toBe("5/140");

    expect((screen.getByLabelText("The question") as HTMLInputElement).maxLength).toBe(100);
    expect((screen.getByLabelText("Course line") as HTMLTextAreaElement).maxLength).toBe(200);
    expect((screen.getByLabelText("Button label") as HTMLInputElement).maxLength).toBe(32);
    expect((screen.getByLabelText("Name") as HTMLInputElement).maxLength).toBe(60);
    expect((screen.getByLabelText("Descriptor") as HTMLInputElement).maxLength).toBe(160);
  });

  it("shows the button label and persona placeholders", () => {
    render(<Harness />);
    expect((screen.getByLabelText("Button label") as HTMLInputElement).placeholder).toBe(
      "Take the case",
    );
    expect((screen.getByLabelText("Name") as HTMLInputElement).placeholder).toBe("Meera, 19");
  });

  it("stores an emptied field as null, the way the backend does", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("The question"), "Why?");
    await user.clear(screen.getByLabelText("The question"));
    expect(stored().hero.question).toBeNull();
  });

  it("uploads the persona image through the course media upload", async () => {
    const user = userEvent.setup();
    mockUpload.mockResolvedValue("https://cdn.example/persona.png");
    render(<Harness />);

    const file = new File(["x"], "persona.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Image"), file);

    await waitFor(() => expect(stored().persona.imageUrl).toBe("https://cdn.example/persona.png"));
    expect(mockUpload).toHaveBeenCalledWith(file, "image");

    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(stored().persona.imageUrl).toBeNull();
  });

  it("refuses a file that is not an image", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);
    await user.upload(
      screen.getByLabelText("Image"),
      new File(["x"], "notes.pdf", { type: "application/pdf" }),
    );
    expect(mockToast.error).toHaveBeenCalledWith(en.courseLanding.hero.personaImage.notAnImage);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  describe("Character Library picker", () => {
    const MEERA = {
      id: "char-1",
      name: "Meera",
      age: 19,
      profession: "Student",
      coverImageUrl: "https://cdn.example/meera.png",
    };

    it("is hidden without the view-character grant", () => {
      render(<Harness />);
      expect(screen.queryByText(copy.hero.characterPicker.open)).toBeNull();
    });

    it("is hidden when the library can't be read", async () => {
      const user = userEvent.setup();
      (hooks.useUser as ReturnType<typeof vi.fn>).mockReturnValue({
        permissions: ["view:scenario-character"],
        features: [],
      });
      const query = api.useGetCharactersQuery as ReturnType<typeof vi.fn>;
      render(<Harness />);
      query.mockReturnValue({ data: undefined, isLoading: false, isError: true });
      await user.click(screen.getByText(copy.hero.characterPicker.open));
      expect(screen.queryByTestId("character-picker")).toBeNull();
    });

    it("only asks for the list once opened, then copies name with age, image and id", async () => {
      const user = userEvent.setup();
      (hooks.useUser as ReturnType<typeof vi.fn>).mockReturnValue({
        permissions: ["view:scenario-character"],
        features: [],
      });
      const query = api.useGetCharactersQuery as ReturnType<typeof vi.fn>;
      query.mockReturnValue({
        data: { characters: [MEERA], count: 1 },
        isLoading: false,
        isError: false,
      });
      render(<Harness />);

      expect(query).toHaveBeenLastCalledWith(expect.anything(), { skip: true });

      await user.click(screen.getByText(copy.hero.characterPicker.open));
      expect(query).toHaveBeenLastCalledWith(expect.anything(), { skip: false });

      await user.click(screen.getByRole("button", { name: /Meera, 19/ }));

      const page = stored();
      expect(page.persona.name).toBe("Meera, 19");
      expect(page.persona.imageUrl).toBe("https://cdn.example/meera.png");
      expect(page.persona.characterId).toBe("char-1");
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Meera, 19");
    });

    it("keeps the persona's image when the character has none", async () => {
      const user = userEvent.setup();
      (hooks.useUser as ReturnType<typeof vi.fn>).mockReturnValue({
        permissions: ["view:scenario-character"],
        features: [],
      });
      (api.useGetCharactersQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: { characters: [{ ...MEERA, coverImageUrl: "" }], count: 1 },
        isLoading: false,
        isError: false,
      });
      const page = emptyLandingPage();
      page.persona.imageUrl = "https://cdn.example/mine.png";
      render(<Harness landingPage={page} />);

      await user.click(screen.getByText(copy.hero.characterPicker.open));
      await user.click(screen.getByRole("button", { name: /Meera, 19/ }));

      expect(stored().persona.imageUrl).toBe("https://cdn.example/mine.png");
    });
  });
});

describe("LandingPageEditor — First move", () => {
  const open = async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectBlock(user, "First move");
    return user;
  };

  it("says it is shown before login with no score", async () => {
    await open();
    expect(
      screen.getByText(
        "Shown before login. No score. Write a fresh moment — a graded quiz question here would publish its answer.",
      ),
    ).toBeTruthy();
  });

  it("adds replies up to four, then stops", async () => {
    const user = await open();
    const add = screen.getByRole("button", { name: "Add reply" }) as HTMLButtonElement;

    for (let count = 1; count <= 4; count += 1) {
      await user.click(add);
      expect(screen.getAllByTestId("landing-reply")).toHaveLength(count);
    }
    expect(add.disabled).toBe(true);
    expect(screen.getByText(copy.firstMove.maxReplies(4))).toBeTruthy();
    expect(stored().firstMove.replies).toHaveLength(4);
  });

  it("removes the reply asked for and leaves the others as they were", async () => {
    const user = await open();
    const add = screen.getByRole("button", { name: "Add reply" });
    await user.click(add);
    await user.click(add);
    await user.click(add);

    const texts = screen.getAllByLabelText("Reply text");
    await user.type(texts[0], "first");
    await user.type(texts[1], "second");
    await user.type(texts[2], "third");

    await user.click(screen.getByRole("button", { name: "Remove reply 2" }));

    expect(stored().firstMove.replies.map(reply => reply.text)).toEqual(["first", "third"]);
    expect((screen.getAllByLabelText("Reply text")[1] as HTMLTextAreaElement).value).toBe("third");
  });

  it("edits a reply's text, what it shows and why", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Add reply" }));

    await user.type(screen.getByLabelText("Reply text"), "I'm here");
    await user.type(screen.getByLabelText("What it shows"), "Reassures first");
    await user.type(screen.getByLabelText("Why"), "Names the feeling");

    expect(stored().firstMove.replies).toEqual([
      { text: "I'm here", label: "Reassures first", why: "Names the feeling" },
    ]);
  });

  it("sets First move once it has a persona line and two showable replies", async () => {
    const user = await open();
    const add = screen.getByRole("button", { name: "Add reply" });
    await user.type(screen.getByLabelText("Persona's line"), "I'm fine.");
    await user.click(add);
    await user.click(add);
    const texts = screen.getAllByLabelText("Reply text");
    const labels = screen.getAllByLabelText("What it shows");
    await user.type(texts[0], "a");
    await user.type(labels[0], "A");
    await user.type(texts[1], "b");
    expect(within(rowOf("firstMove")).getByTestId("landing-status-tag").textContent).toBe(
      "Needs input",
    );
    await user.type(labels[1], "B");
    expect(within(rowOf("firstMove")).getByTestId("landing-status-tag").textContent).toBe("Set");
  });
});

describe("LandingPageEditor — Story arc", () => {
  const open = async (landingPage: TrackLandingPage | null = null) => {
    const user = userEvent.setup();
    render(<Harness landingPage={landingPage} />);
    await selectBlock(user, "Story arc");
    return user;
  };

  it("gives each saved section a chapter, in order, with its title read-only", async () => {
    await open();
    const chapters = screen.getAllByTestId("landing-chapter");
    expect(chapters).toHaveLength(3);
    expect(within(chapters[0]).getByText("The call")).toBeTruthy();
    expect(within(chapters[1]).getByText("The debrief")).toBeTruthy();
    expect(within(chapters[0]).queryByDisplayValue("The call")).toBeNull();
    expect(
      screen.getByText("Teasers never give away a roleplay's hidden events or a quiz answer."),
    ).toBeTruthy();
  });

  it("asks for a save before a section with no id yet can take a teaser", async () => {
    await open();
    const unsaved = screen.getAllByTestId("landing-chapter")[2];
    expect(
      within(unsaved).getByText("Save the course to add a teaser for this chapter."),
    ).toBeTruthy();
    expect(within(unsaved).queryByLabelText("Teaser")).toBeNull();
    expect(within(unsaved).queryByRole("combobox")).toBeNull();
    expect(within(unsaved).queryByRole("radio")).toBeNull();
  });

  it("stores a beat and a teaser as a chapter keyed by the section id", async () => {
    const user = await open();
    const [first, second] = screen.getAllByTestId("landing-chapter");

    await user.selectOptions(within(first).getByRole("combobox"), StoryBeat.SETUP);
    await user.type(within(first).getByLabelText("Teaser"), "Something is off");
    await user.selectOptions(within(second).getByRole("combobox"), StoryBeat.CLIMAX);

    expect(stored().arc.chapters).toEqual([
      { sectionId: "s1", beat: StoryBeat.SETUP, teaser: "Something is off" },
      { sectionId: "s2", beat: StoryBeat.CLIMAX, teaser: null },
    ]);
    expect(within(rowOf("arc")).getByTestId("landing-status-tag").textContent).toBe("Set");
  });

  it("offers the five beats and a way to clear one", async () => {
    const user = await open();
    const select = within(screen.getAllByTestId("landing-chapter")[0]).getByRole(
      "combobox",
    ) as HTMLSelectElement;
    expect(Array.from(select.options).map(option => option.textContent)).toEqual([
      "No beat",
      "Setup",
      "Conflict",
      "Challenge",
      "Climax",
      "Resolution",
    ]);
    await user.selectOptions(select, StoryBeat.CHALLENGE);
    await user.selectOptions(select, "");
    expect(stored().arc.chapters[0].beat).toBeNull();
  });

  it("allows one hard call per course, and lets the author clear it", async () => {
    const user = await open();
    await user.click(screen.getByRole("radio", { name: "Hard call: The call" }));
    expect(stored().arc.hardCallSectionId).toBe("s1");

    await user.click(screen.getByRole("radio", { name: "Hard call: The debrief" }));
    expect(stored().arc.hardCallSectionId).toBe("s2");
    expect(
      (screen.getByRole("radio", { name: "Hard call: The call" }) as HTMLInputElement).checked,
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: copy.arc.hardCall.clear }));
    expect(stored().arc.hardCallSectionId).toBeNull();
  });

  it("shows a chapter already saved on the course", async () => {
    const page = emptyLandingPage();
    page.arc.chapters = [{ sectionId: "s2", beat: StoryBeat.CONFLICT, teaser: "Saved teaser" }];
    page.arc.hardCallSectionId = "s2";
    await open(page);
    const second = screen.getAllByTestId("landing-chapter")[1];
    expect((within(second).getByRole("combobox") as HTMLSelectElement).value).toBe(
      StoryBeat.CONFLICT,
    );
    expect((within(second).getByLabelText("Teaser") as HTMLInputElement).value).toBe(
      "Saved teaser",
    );
    expect((within(second).getByRole("radio") as HTMLInputElement).checked).toBe(true);
  });

  it("says so when the course has no sections", async () => {
    const user = userEvent.setup();
    render(<Harness sections={[]} />);
    await selectBlock(user, "Story arc");
    expect(screen.getByText(copy.arc.empty)).toBeTruthy();
  });
});

describe("LandingPageEditor — Outcomes, How it plays, Cast, XP, Content notes", () => {
  it("takes up to three outcomes in place, with the verb-first helper", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectBlock(user, "Outcomes");
    expect(
      screen.getByText("Start with a verb. Write what they'll do, not what they'll know."),
    ).toBeTruthy();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);

    await user.type(screen.getByLabelText("Outcome 3"), "Close the call");
    expect(stored().outcomes.items).toEqual(["", "", "Close the call"]);
    await user.type(screen.getByLabelText("Outcome 1"), "Name the feeling");
    expect(stored().outcomes.items).toEqual(["Name the feeling", "", "Close the call"]);
    await user.clear(screen.getByLabelText("Outcome 3"));
    expect(stored().outcomes.items).toEqual(["Name the feeling"]);
    expect(within(rowOf("outcomes")).getByTestId("landing-status-tag").textContent).toBe("Set");
  });

  it("counts the course's items, shows the duration read-only and stores the sitting length", async () => {
    const user = userEvent.setup();
    render(<Harness estimatedDurationMinutes={25} />);
    await selectBlock(user, "How it plays");

    expect(
      within(screen.getByTestId("landing-counts"))
        .getAllByRole("listitem")
        .map(li => li.textContent),
    ).toEqual(["2 roleplays", "1 quiz", "1 article"]);
    expect(screen.getByTestId("landing-duration").textContent).toBe("About 25 min");
    expect(screen.getByText("Edit this in Track settings.")).toBeTruthy();
    // Read-only here: the duration is edited in Track settings.
    expect(screen.queryByRole("spinbutton")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Sitting length"), LandingSittingLength.MEDIUM);
    expect(stored().howItPlays.sittingLength).toBe(LandingSittingLength.MEDIUM);

    expect(screen.getByText("Retry any roleplay as often as you like")).toBeTruthy();
    expect(screen.getByText("Every roleplay ends in a debrief on what you did")).toBeTruthy();
    expect(screen.getByText("Nothing you earn is ever taken away")).toBeTruthy();
  });

  it("drops the two roleplay promises when the course has no roleplay", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        sections={[
          {
            localId: "l1",
            serverId: "s1",
            title: "Read",
            description: "",
            items: [item(TrackItemType.ARTICLE, "a")],
          },
        ]}
      />,
    );
    await selectBlock(user, "How it plays");
    expect(screen.queryByText("Retry any roleplay as often as you like")).toBeNull();
    expect(screen.getByText("Nothing you earn is ever taken away")).toBeTruthy();
    expect(screen.getByTestId("landing-duration").textContent).toBe("Not set");
  });

  it("takes the caller's name from the Hero persona, read-only", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectBlock(user, "Cast");
    expect(screen.getByTestId("landing-caller-name").textContent).toBe(copy.cast.callerNameUnset);

    await selectBlock(user, "Hero");
    await user.type(screen.getByLabelText("Name"), "Meera, 19");
    await selectBlock(user, "Cast");
    expect(screen.getByTestId("landing-caller-name").textContent).toBe("Meera, 19");
    expect(screen.getByLabelText("Caller line")).toBeTruthy();

    await user.type(screen.getByLabelText("Guide name"), "Dr. Rao");
    await user.type(screen.getByLabelText("Guide role"), "Supervisor");
    await user.type(screen.getByLabelText("Guide line"), "Debriefs every call.");
    expect(stored().cast.guide).toEqual({
      name: "Dr. Rao",
      role: "Supervisor",
      line: "Debriefs every call.",
    });
  });

  it("explains the XP line without asking for anything", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectBlock(user, "XP line");
    expect(screen.getByText(copy.xp.explainer)).toBeTruthy();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("explains where content warnings come from and takes an extra note", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectBlock(user, "Content notes");
    expect(screen.getByText(copy.contentNotes.explainer)).toBeTruthy();
    await user.type(screen.getByLabelText("Extra note"), "Callers are fictional.");
    expect(stored().contentNotes.extraNote).toBe("Callers are fictional.");
  });
});

describe("LandingPageEditor — help tooltips", () => {
  it("puts a help icon on Hard call, Beat, What it shows and Sitting length", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await selectBlock(user, "Story arc");
    const chapter = screen.getAllByTestId("landing-chapter")[0];
    const arcHelp = within(chapter).getAllByLabelText(/^Help:/);
    expect(arcHelp.map(tooltipOf)).toEqual([copy.arc.hardCall.tooltip, copy.arc.beat.tooltip]);

    await selectBlock(user, "First move");
    await user.click(screen.getByRole("button", { name: "Add reply" }));
    const replyHelp = within(screen.getByTestId("landing-reply")).getAllByLabelText(/^Help:/);
    expect(replyHelp.map(tooltipOf)).toEqual([copy.firstMove.replyLabel.tooltip]);

    await selectBlock(user, "How it plays");
    expect(screen.getAllByLabelText(/^Help:/).map(tooltipOf)).toEqual([
      copy.howItPlays.sittingLength.tooltip,
    ]);
  });

  it("explains the lock on Content notes", () => {
    render(<Harness />);
    const lock = within(rowOf("contentNotes")).getByLabelText(copy.contentNotesLockHint);
    expect(tooltipOf(lock)).toBe(
      "Shown automatically when any roleplay in the course has a trigger warning.",
    );
  });
});

describe("LandingPageEditor — Draft with Copilot", () => {
  const draftOf = (edit: (page: TrackLandingPage) => void): TrackLandingPage => {
    const page = emptyLandingPage();
    edit(page);
    return page;
  };
  const draftButton = () => screen.getByRole("button", { name: copy.draftWithCopilot });

  it("is not offered for an unsaved course", () => {
    render(<Harness trackId={null} />);
    expect(screen.queryByRole("button", { name: copy.draftWithCopilot })).toBeNull();
  });

  it("is not offered to someone who can't use Course Copilot", () => {
    (hooks.useCanUseCourseCopilot as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<Harness />);
    expect(screen.queryByRole("button", { name: copy.draftWithCopilot })).toBeNull();
  });

  it("is enabled on a saved, clean form, and says what it does", () => {
    render(<Harness />);
    expect((draftButton() as HTMLButtonElement).disabled).toBe(false);
    expect(tooltipOf(draftButton())).toBe(copy.draftHint);
  });

  it("is disabled while the form has unsaved changes, and says to save first", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("make dirty"));
    expect((draftButton() as HTMLButtonElement).disabled).toBe(true);
    expect(tooltipOf(draftButton())).toBe(
      "Save your changes first — the copilot works on the saved version of this course.",
    );
    await user.click(draftButton());
    expect(draftMutation).not.toHaveBeenCalled();
  });

  it("drafts for the saved course, merges into empty fields only and reports how many it filled", async () => {
    const user = userEvent.setup();
    mockDraftResult({
      draft: draftOf(page => {
        page.hero.hook = "Draft hook";
        page.hero.question = "Draft question?";
        page.persona.imageUrl = "https://cdn.example/draft.png";
        page.xp.enabled = false;
      }),
    });
    const existing = emptyLandingPage();
    existing.hero.hook = "My hook";
    render(<Harness landingPage={existing} />);

    await user.click(draftButton());

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledTimes(1));
    expect(draftMutation).toHaveBeenCalledWith(TRACK_ID);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Copilot filled 1 empty field. Review it, then save.",
    );
    const page = stored();
    expect(page.hero.hook).toBe("My hook");
    expect(page.hero.question).toBe("Draft question?");
    expect(page.persona.imageUrl).toBeNull();
    expect(page.xp.enabled).toBe(true);
  });

  it("says how many it filled, and leaves the form dirty so the author saves", async () => {
    const user = userEvent.setup();
    mockDraftResult({
      draft: draftOf(page => {
        page.hero.hook = "Draft hook";
        page.hero.question = "Draft question?";
        page.contentNotes.extraNote = "Draft note";
      }),
    });
    render(<Harness />);

    await user.click(draftButton());

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Copilot filled 3 empty fields. Review them, then save.",
      ),
    );
    expect(stored().hero.hook).toBe("Draft hook");
    // Filled values arrive in the form dirty, which disables a second draft until the author saves.
    expect((draftButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("says when there was nothing to fill and changes nothing", async () => {
    const user = userEvent.setup();
    mockDraftResult({ draft: emptyLandingPage() });
    render(<Harness />);

    await user.click(draftButton());

    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith(copy.draftNothing));
    expect(copy.draftNothing).toBe("Nothing to fill — every field already has text.");
    expect(mockToast.success).not.toHaveBeenCalled();
    expect((draftButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the server's message when the request fails", async () => {
    const user = userEvent.setup();
    mockDraftFailure({ status: 502, data: { message: "The model's answer could not be read." } });
    render(<Harness />);

    await user.click(draftButton());

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("The model's answer could not be read."),
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("falls back to a plain message when the failure carries none", async () => {
    const user = userEvent.setup();
    mockDraftFailure({ status: "FETCH_ERROR" });
    render(<Harness />);
    await user.click(draftButton());
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(copy.draftFailed));
  });

  it("shows a loading state on the button while the request runs", () => {
    (api.useDraftTrackLandingPageMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      draftMutation,
      { isLoading: true },
    ]);
    render(<Harness />);
    const button = screen.getByRole("button", { name: copy.drafting }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("merges against what the form holds when the answer arrives, not when it was asked for", async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => undefined;
    draftMutation.mockReturnValue({ unwrap: () => new Promise(r => (resolve = r)) });
    render(<Harness />);

    await user.click(draftButton());
    await user.type(screen.getByLabelText("Hook"), "Typed while waiting");
    await act(async () => {
      resolve({
        draft: draftOf(page => {
          page.hero.hook = "Draft hook";
          page.hero.question = "Draft question?";
        }),
      });
    });

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(stored().hero.hook).toBe("Typed while waiting");
    expect(stored().hero.question).toBe("Draft question?");
  });
});

describe("LandingPageEditor — Open page", () => {
  const openButton = () => screen.getByRole("button", { name: copy.openPage }) as HTMLButtonElement;

  it("opens the public link in a new tab when public view is on and the course is published", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness />);

    expect(openButton().disabled).toBe(false);
    expect(tooltipOf(openButton())).toBe(copy.openPageHint);
    await user.click(openButton());

    expect(open).toHaveBeenCalledWith(
      `https://app.example.com/course/${TRACK_ID}`,
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
  });

  it.each([
    ["the course isn't saved", { trackId: null }, copy.openPageUnsaved],
    ["public view is off", { isPublicView: false }, copy.openPageNeedsPublicView],
    ["the course isn't published", { isPublished: false }, copy.openPageNeedsPublish],
  ])("is disabled when %s, and says what is missing", async (_label, props, reason) => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness {...props} />);
    expect(openButton().disabled).toBe(true);
    expect(tooltipOf(openButton())).toBe(reason);
    await user.click(openButton());
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("is disabled until a freshly switched-on public view is saved", async () => {
    const user = userEvent.setup();
    function WithToggle() {
      const methods = useForm<TrackFormValues>({
        defaultValues: { ...DEFAULT_TRACK_FORM_VALUES, isPublicView: false, sections: SECTIONS },
      });
      return (
        <FormProvider {...methods}>
          <LandingPageEditor trackId={TRACK_ID} isPublished />
          <button
            type="button"
            onClick={() => methods.setValue("isPublicView", true, { shouldDirty: true })}
          >
            switch on
          </button>
        </FormProvider>
      );
    }
    render(<WithToggle />);
    await user.click(screen.getByText("switch on"));
    expect(openButton().disabled).toBe(true);
    expect(tooltipOf(openButton())).toBe(copy.openPagePendingPublicView);
  });
});
