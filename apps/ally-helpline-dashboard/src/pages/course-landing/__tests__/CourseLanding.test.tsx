import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LandingSittingLength,
  PublicTrackOutline,
  PublicTrackStory,
  StoryBeat,
  TrackAccessDenialReason,
  TrackItemType,
} from "@types";

const {
  mockUseGetPublicTrackOutlineQuery,
  mockCheckAccess,
  mockEnrollTrack,
  mockGetNextItem,
  mockToastError,
  mockUser,
  mockTrack,
} = vi.hoisted(() => ({
  mockUseGetPublicTrackOutlineQuery: vi.fn(),
  mockCheckAccess: vi.fn(),
  mockEnrollTrack: vi.fn(),
  mockGetNextItem: vi.fn(),
  mockToastError: vi.fn(),
  mockUser: { current: null as null | { email: string } },
  mockTrack: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPublicTrackOutlineQuery: (args: unknown, opts: unknown) =>
    mockUseGetPublicTrackOutlineQuery(args, opts),
  useLazyGetTrackAccessQuery: () => [mockCheckAccess],
  useEnrollTrackMutation: () => [mockEnrollTrack],
  useLazyGetNextTrackItemQuery: () => [mockGetNextItem],
}));

vi.mock("@hooks", () => ({
  useUser: () => ({ user: mockUser.current }),
  useAnalytics: () => ({ track: mockTrack }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts?.email ? `${key}:${opts.email}` : key,
    i18n: { language: "hi" },
  }),
}));

vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

vi.mock(
  "@assets",
  () =>
    new Proxy(
      {},
      {
        has: (_target, prop) => typeof prop === "string" && prop !== "then",
        get: (_target, prop) => {
          if (typeof prop !== "string" || prop === "then") return undefined;
          if (prop === "__esModule") return true;
          const Stub = () => <svg data-testid={`asset-${prop}`} />;
          return Stub;
        },
      },
    ),
);

// The login dialog is its own component; here it only has to open and report
// a successful sign-in, the way the real one does after the terms step.
vi.mock("@components", () => ({
  TrackTypeIcon: () => <svg data-testid="type-icon" />,
  getTrackItemMeta: () => "meta",
  LoginDialog: ({ isOpen, onSuccess, requireTerms }: any) =>
    isOpen ? (
      <div data-testid="login-dialog" data-require-terms={String(requireTerms)}>
        <button
          onClick={() => {
            localStorage.setItem("accessToken", "token");
            onSuccess();
          }}
        >
          complete-login
        </button>
      </div>
    ) : null,
}));

vi.mock("@ally-ui-mono/ui-shared", async () => {
  const actual =
    await vi.importActual<typeof import("@ally-ui-mono/ui-shared")>("@ally-ui-mono/ui-shared");
  return { ...actual, CustomImage: (props: any) => <img alt={props.alt} src={props.src} /> };
});

vi.mock("../../blog/usePageMeta", () => ({ usePageMeta: () => undefined }));

import { CourseLanding } from "../CourseLanding";

const TRACK_ID = "96d570f0-14b6-42d7-8e78-79d7520c7f69";

const outline: PublicTrackOutline = {
  id: TRACK_ID,
  title: "New Counselor Foundations",
  description: "<p>A guided on-ramp</p>",
  coverImageUrl: null,
  totalItems: 2,
  simulationsCount: 1,
  estimatedDurationMinutes: 95,
  languageCode: "en",
  sections: [
    {
      id: "s1",
      title: "Orientation",
      description: null,
      order: 1,
      items: [
        {
          id: "i1",
          type: TrackItemType.ARTICLE,
          order: 1,
          title: "Welcome to Client-Centered Care",
          description: null,
          contentMeta: null,
        },
        {
          id: "i2",
          type: TrackItemType.ROLEPLAY,
          order: 2,
          title: "Practice: Opening the call",
          description: null,
          contentMeta: null,
        },
      ],
    },
  ],
};

const unwrapping = (value: unknown) => ({ unwrap: () => Promise.resolve(value) });
const rejecting = (error: unknown) => ({ unwrap: () => Promise.reject(error) });

const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={[`/course/${TRACK_ID}`]}>
      <Routes>
        <Route path="/course/:trackId" element={<CourseLanding />} />
        <Route path="/track/:trackId" element={<div data-testid="course-page" />} />
        <Route path="/track/:trackId/item/:itemId" element={<div data-testid="item-player" />} />
        <Route path="/learn" element={<div data-testid="learn" />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>,
  );

describe("CourseLanding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser.current = null;
    mockUseGetPublicTrackOutlineQuery.mockReturnValue({
      data: outline,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows a logged-out visitor the outline, and asks for the app language", () => {
    renderLanding();

    expect(screen.getByRole("heading", { name: "New Counselor Foundations" })).toBeTruthy();
    expect(screen.getByText("Welcome to Client-Centered Care")).toBeTruthy();
    expect(screen.getByText("Practice: Opening the call")).toBeTruthy();
    expect(screen.getByText("courseLanding.loginHint")).toBeTruthy();
    expect(mockUseGetPublicTrackOutlineQuery).toHaveBeenCalledWith(
      { trackId: TRACK_ID, languageCode: "hi" },
      { skip: false },
    );
    expect(mockCheckAccess).not.toHaveBeenCalled();
  });

  it("brands the visitor header with the Ally logo, not the name typed out", () => {
    renderLanding();

    expect(screen.getByTestId("asset-Ally")).toBeTruthy();
    expect(screen.queryByText("ally")).toBeNull();
  });

  it("opens the login popup, with the terms step, when a logged-out visitor presses Start", () => {
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: "courseLanding.start" }));

    expect(screen.getByTestId("login-dialog").getAttribute("data-require-terms")).toBe("true");
  });

  it("enrols a learner with access after login and opens the first step", async () => {
    mockCheckAccess.mockReturnValue(unwrapping({ hasAccess: true, enrolled: false, reason: null }));
    mockEnrollTrack.mockReturnValue(unwrapping({ trackEnrollmentId: "e1" }));
    mockGetNextItem.mockReturnValue(unwrapping({ trackCompleted: false, nextItem: { id: "i1" } }));
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: "courseLanding.start" }));
    fireEvent.click(screen.getByText("complete-login"));

    await waitFor(() => expect(screen.getByTestId("item-player")).toBeTruthy());
    expect(mockCheckAccess).toHaveBeenCalledWith({ trackId: TRACK_ID });
    expect(mockEnrollTrack).toHaveBeenCalledWith({ trackId: TRACK_ID, languageCode: "hi" });
  });

  it("tells a learner without access after login that the course is not available to them", async () => {
    mockCheckAccess.mockReturnValue(
      unwrapping({
        hasAccess: false,
        enrolled: false,
        reason: TrackAccessDenialReason.NOT_IN_ORGANIZATION,
      }),
    );
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: "courseLanding.start" }));
    mockUser.current = { email: "someone@example.com" };
    fireEvent.click(screen.getByText("complete-login"));

    await waitFor(() => expect(screen.getByTestId("course-landing-denied")).toBeTruthy());
    expect(mockToastError).toHaveBeenCalledWith("courseLanding.denied.toast");
    expect(screen.getByText("courseLanding.denied.bodyWithEmail:someone@example.com")).toBeTruthy();
    expect(mockEnrollTrack).not.toHaveBeenCalled();
    // The outline stays visible under the notice.
    expect(screen.getByText("Welcome to Client-Centered Care")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "courseLanding.start" })).toBeNull();
  });

  it("sends a learner who arrives signed in with access straight to the course page", async () => {
    localStorage.setItem("accessToken", "token");
    mockUser.current = { email: "learner@example.com" };
    mockCheckAccess.mockReturnValue(unwrapping({ hasAccess: true, enrolled: true, reason: null }));
    renderLanding();

    await waitFor(() => expect(screen.getByTestId("course-page")).toBeTruthy());
    expect(mockEnrollTrack).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("treats a 403 from the access check as no access, without a toast on arrival", async () => {
    localStorage.setItem("accessToken", "token");
    mockUser.current = { email: "admin@example.com" };
    mockCheckAccess.mockReturnValue(rejecting({ status: 403 }));
    renderLanding();

    await waitFor(() => expect(screen.getByTestId("course-landing-denied")).toBeTruthy());
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("says a closed course is closed rather than not assigned", async () => {
    localStorage.setItem("accessToken", "token");
    mockUser.current = { email: "learner@example.com" };
    mockCheckAccess.mockReturnValue(
      unwrapping({
        hasAccess: false,
        enrolled: false,
        reason: TrackAccessDenialReason.NOT_AVAILABLE,
      }),
    );
    renderLanding();

    await waitFor(() => expect(screen.getByText("courseLanding.denied.closedTitle")).toBeTruthy());
  });

  it("shows the not-available page when the link is not public or the course is unpublished", () => {
    mockUseGetPublicTrackOutlineQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderLanding();

    expect(screen.getByTestId("course-landing-unavailable")).toBeTruthy();
    expect(screen.getByText("courseLanding.unavailable.title")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "courseLanding.logIn" }));
    expect(screen.getByTestId("login-page")).toBeTruthy();
  });

  describe("story layout", () => {
    const story: PublicTrackStory = {
      hook: "She's called twice and hung up. Tonight, she stays on the line.",
      question: "Will you know what to say?",
      courseLine: "A course in holding silence.",
      buttonLabel: null,
      persona: {
        name: "Meera, 19",
        descriptor: "First-year student, far from home.",
        imageUrl: null,
      },
      firstMove: {
        sceneLine: "Line open · 11:47 pm",
        personaLine: "Sorry… I don't even know why I called.",
        prompt: "What do you say first?",
        replies: [
          {
            text: "You don't need a reason.",
            label: "You gave her room",
            why: "You made space first.",
          },
          { text: "Can I take your name?", label: "You started with intake", why: null },
        ],
      },
      arc: {
        chapters: [{ sectionId: "s1", beat: StoryBeat.SETUP, teaser: "Eight seconds of nothing." }],
        hardCallSectionId: "s1",
      },
      outcomes: null,
      howItPlays: { sittingLength: LandingSittingLength.MEDIUM },
      cast: null,
      xp: { activityXp: 20, hasRoleplays: true },
      contentNotes: { warnings: [{ name: "Self-harm", chapters: [1] }], extraNote: null },
    };

    beforeEach(() => {
      mockUseGetPublicTrackOutlineQuery.mockReturnValue({
        data: { ...outline, story },
        isLoading: false,
        isError: false,
      });
    });

    it("leads with the hook and the persona instead of the classic outline", () => {
      renderLanding();

      expect(screen.getByRole("heading", { level: 1, name: story.hook })).toBeTruthy();
      expect(screen.getByText("Will you know what to say?")).toBeTruthy();
      // Once as the phone's compact strip, once on the wider screens' card;
      // CSS shows one of them.
      expect(screen.getAllByText("Meera, 19")).toHaveLength(2);
      expect(screen.getByTestId("story-persona-strip")).toBeTruthy();
      expect(screen.queryByTestId("course-outline")).toBeNull();
      // Blocks the server sent as null are not drawn at all.
      expect(screen.queryByTestId("story-outcomes")).toBeNull();
      expect(screen.queryByTestId("story-cast")).toBeTruthy();
      expect(screen.getByTestId("story-content-notes")).toBeTruthy();
    });

    it("marks the hard-call chapter and shows its teaser", () => {
      renderLanding();

      const hardCall = screen.getByTestId("story-chapter-hard-call");
      expect(hardCall.textContent).toContain("Orientation");
      expect(hardCall.textContent).toContain("Eight seconds of nothing.");
    });

    it("answers a first-move pick with what the learner did, and records only the reply index", () => {
      renderLanding();

      fireEvent.click(screen.getByRole("button", { name: "“You don't need a reason.”" }));

      expect(screen.getByTestId("first-move-feedback").textContent).toContain("You gave her room");
      expect(screen.getByText("You made space first.")).toBeTruthy();
      expect(mockTrack).toHaveBeenCalledWith("course_landing_first_move_chosen", {
        course_id: TRACK_ID,
        reply_index: 0,
      });

      fireEvent.click(
        screen.getByRole("button", { name: "courseLanding.story.firstMove.tryAnother" }),
      );
      expect(screen.queryByTestId("first-move-feedback")).toBeNull();
    });

    it("runs the same Start flow from the first move's Continue", () => {
      renderLanding();

      fireEvent.click(screen.getByRole("button", { name: "“Can I take your name?”" }));
      fireEvent.click(
        screen.getByRole("button", { name: "courseLanding.story.firstMove.continue" }),
      );

      expect(screen.getByTestId("login-dialog").getAttribute("data-require-terms")).toBe("true");
    });

    it("uses the author's button label when there is one", () => {
      mockUseGetPublicTrackOutlineQuery.mockReturnValue({
        data: { ...outline, story: { ...story, buttonLabel: "Pick up the call" } },
        isLoading: false,
        isError: false,
      });
      renderLanding();

      expect(screen.getAllByRole("button", { name: "Pick up the call" })).toHaveLength(2);
    });

    it("puts the not-available box where Start was, and drops every other Start", async () => {
      localStorage.setItem("accessToken", "token");
      mockUser.current = { email: "learner@example.com" };
      mockCheckAccess.mockReturnValue(
        unwrapping({
          hasAccess: false,
          enrolled: false,
          reason: TrackAccessDenialReason.NOT_IN_GROUP,
        }),
      );
      renderLanding();

      await waitFor(() => expect(screen.getByTestId("course-landing-denied")).toBeTruthy());
      expect(screen.queryByTestId("story-closing")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "“You don't need a reason.”" }));
      expect(
        screen.queryByRole("button", { name: "courseLanding.story.firstMove.continue" }),
      ).toBeNull();
    });
  });
});
