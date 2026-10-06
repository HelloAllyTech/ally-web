import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const LISTENER = ["view:helpline:lobby", "view:helpline:chat"];
const SUPERVISOR = [...LISTENER, "view:helpline:monitor", "view:helpline:qa"];

const { trackMock, permissionsRef } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  permissionsRef: { current: [] as string[] },
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: [] } }),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";
import type { QaDetailDto, QaListItemDto, QaSkillDto } from "@types";

import { HelplineHistory } from "../HelplineHistory";
import { HelplineQa } from "../HelplineQa";
import { HelplineQaDetail, qaFeedbackSections } from "../HelplineQaDetail";
import {
  fetchMock,
  fetchRoutes,
  json,
  makeStore,
  meDto,
  requests,
  resetKit,
  renderWorkspace,
  seed,
  type TestStore,
} from "./helplineTestKit";

const listItem = (overrides: Partial<QaListItemDto> = {}): QaListItemDto => ({
  chatId: "chat-1",
  listenerId: 42,
  listenerName: "Asha",
  endedAt: "2026-10-05T11:00:00.000Z",
  compositeScore: 2.75,
  hasUnhelpfulBehaviour: true,
  rubricVersion: "v2",
  ...overrides,
});

const skill = (overrides: Partial<QaSkillDto>): QaSkillDto => ({
  key: "rapport",
  label: "Build rapport",
  tier: "Engage",
  level: 3,
  unhelpful: [],
  basicMet: [],
  basicMissing: [],
  advanced: [],
  evidence: [],
  ...overrides,
});

/** Deliberately out of order: the page must sort strengths/improvements and tiers itself. */
const detail = (overrides: Partial<QaDetailDto> = {}): QaDetailDto => ({
  ...listItem(),
  skills: [
    skill({
      key: "coping",
      label: "Coping",
      tier: "Support",
      level: 1,
      basicMissing: ["Asks what has helped before"],
      unhelpful: ["Tells the talker what they should do"],
    }),
    skill({
      key: "feelings",
      label: "Explore feelings",
      tier: "Understand",
      level: 4,
      basicMet: ["Names the feeling they heard"],
      advanced: ["Links the feeling to what happened"],
      evidence: [{ messageId: 12, quote: "It sounds like you felt really alone" }],
    }),
    skill({
      key: "rapport",
      label: "Build rapport",
      tier: "Engage",
      level: 3,
      basicMet: ["Greets warmly and gives their name"],
    }),
    skill({
      key: "goals",
      label: "Set goals together",
      tier: "Support",
      level: 2,
      basicMissing: ["Agrees one small next step"],
    }),
    skill({
      key: "harm",
      label: "Ask about safety",
      tier: "Understand",
      level: 2,
      unhelpful: ["Moves on quickly after a mention of harm"],
    }),
  ],
  ...overrides,
});

describe("helping-skills feedback (QA)", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    trackMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    seed(store, { me: meDto() });
    permissionsRef.current = LISTENER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits strengths (score 3–4) from things to work on (score 1–2), each in tier order", () => {
    const { strengths, improvements } = qaFeedbackSections(detail());
    expect(strengths.map(item => item.key)).toEqual(["rapport", "feelings"]);
    expect(improvements.map(item => item.key)).toEqual(["harm", "coping", "goals"]);
  });

  it("reads strengths → improvements with a way to practise → a warm close, never L1–L4", async () => {
    fetchRoutes["GET /v1/helpline/qa/chat-1"] = () => json(detail());
    renderWorkspace(store, <HelplineQaDetail />, {
      path: "/helpline/qa/:chatId",
      url: "/helpline/qa/chat-1",
    });

    const page = await screen.findByTestId("helpline-qa-detail");
    const strengths = screen.getByTestId("qa-section-strengths");
    const improvements = screen.getByTestId("qa-section-improvements");
    const closing = screen.getByTestId("qa-closing");
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(strengths, improvements)).toBe(true);
    expect(follows(improvements, closing)).toBe(true);
    expect(closing).toHaveTextContent("Thank you for being there for someone who reached out.");

    // Strengths: tier order (Engage before Understand), behaviours and evidence linking to the message.
    const strengthCards = within(strengths).getAllByTestId(/^qa-strength-/);
    expect(strengthCards.map(card => card.dataset.testid)).toEqual([
      "qa-strength-rapport",
      "qa-strength-feelings",
    ]);
    const feelings = within(strengths).getByTestId("qa-strength-feelings");
    expect(feelings).toHaveTextContent("score 4 of 4");
    expect(feelings).toHaveTextContent("Names the feeling they heard");
    expect(feelings).toHaveTextContent("Links the feeling to what happened");
    expect(within(feelings).getByRole("link", { name: /felt really alone/ })).toHaveAttribute(
      "href",
      "/helpline/chat/chat-1#message-12",
    );

    // Moderate doses: two skills to work on at first, tier-ordered; the rest on request.
    let workOn = within(improvements).getAllByTestId(/^qa-improvement-/);
    expect(workOn.map(card => card.dataset.testid)).toEqual([
      "qa-improvement-harm",
      "qa-improvement-coping",
    ]);
    fireEvent.click(within(improvements).getByRole("button", { name: "Show 1 more skill" }));
    workOn = within(improvements).getAllByTestId(/^qa-improvement-/);
    expect(workOn).toHaveLength(3);

    // Within a skill: what got in the way first, then the missing step — each with a practice line.
    const coping = within(improvements).getByTestId("qa-improvement-coping");
    const [unhelpful] = within(coping).getAllByTestId("qa-unhelpful");
    const [missing] = within(coping).getAllByTestId("qa-missing");
    expect(follows(unhelpful, missing)).toBe(true);
    expect(unhelpful).toHaveTextContent("Tells the talker what they should do");
    expect(unhelpful).toHaveTextContent(
      "Practise: in your next chat or roleplay, notice the moment before “Tells the talker what they should do”",
    );
    expect(missing).toHaveTextContent(
      "Practise: make “Asks what has helped before” a deliberate step",
    );
    expect(coping).toHaveTextContent("score 1 of 4");

    // No levels, pass/fail or ranking language anywhere.
    expect(page.textContent).not.toMatch(/\bL[1-4]\b/);
    expect(page.textContent).not.toMatch(/\b(pass|passed|fail|failed|rank)\b/i);
    expect(page).toHaveTextContent("Your feedback");
    expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_QA_VIEWED, {
      chat_id: "chat-1",
      viewer: "self",
    });
  });

  it("a supervisor sees the same feedback, addressed to them", async () => {
    permissionsRef.current = SUPERVISOR;
    fetchRoutes["GET /v1/helpline/qa/chat-1"] = () =>
      json(detail({ listenerId: 7, listenerName: "Meera" }));
    renderWorkspace(store, <HelplineQaDetail />, {
      path: "/helpline/qa/:chatId",
      url: "/helpline/qa/chat-1",
    });
    const page = await screen.findByTestId("helpline-qa-detail");
    expect(page).toHaveTextContent("Feedback for Meera");
    expect(page).toHaveTextContent("Meera sees exactly this.");
    expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_QA_VIEWED, {
      chat_id: "chat-1",
      viewer: "supervisor",
    });
  });

  it("a listener sees only their own, from qa/mine", async () => {
    fetchRoutes["GET /v1/helpline/qa/mine"] = () => json({ items: [listItem()] });
    renderWorkspace(store, <HelplineQa />, { path: "/helpline/qa", url: "/helpline/qa" });

    const list = await screen.findByTestId("qa-mine-list");
    expect(screen.getByRole("heading", { name: "My feedback" })).toBeInTheDocument();
    expect(within(list).getByRole("link")).toHaveAttribute("href", "/helpline/qa/chat-1");
    expect(requests("GET", "/v1/helpline/qa")).toHaveLength(0);
    // No score in a listener's own list — the detail explains it skill by skill.
    expect(list).not.toHaveTextContent("of 4");
  });

  it("supervisors get every scored chat, filterable by listener, never ranked", async () => {
    permissionsRef.current = SUPERVISOR;
    fetchRoutes["GET /v1/helpline/monitor"] = () =>
      json({
        tiles: { waiting: 0, active: 0, listenersAvailable: 0, openHighFlags: 0 },
        activeChats: [],
        waiting: [],
        listeners: [
          {
            userId: 7,
            displayName: "Meera",
            presence: "AWAY",
            activeChatCount: 0,
            maxConcurrentChats: 2,
            languages: [],
          },
        ],
      });
    fetchRoutes["GET /v1/helpline/qa"] = request => {
      const listenerId = new URL(request.url).searchParams.get("listenerId");
      return json(
        listenerId === "7"
          ? {
              items: [
                listItem({
                  chatId: "chat-2",
                  listenerId: 7,
                  listenerName: "Meera",
                  hasUnhelpfulBehaviour: false,
                }),
              ],
              total: 1,
            }
          : {
              items: [
                listItem(),
                listItem({
                  chatId: "chat-2",
                  listenerId: 7,
                  listenerName: "Meera",
                  compositeScore: 3.5,
                  hasUnhelpfulBehaviour: false,
                }),
              ],
              total: 2,
            },
      );
    };
    renderWorkspace(store, <HelplineQa />, { path: "/helpline/qa", url: "/helpline/qa" });

    const table = await screen.findByTestId("qa-table");
    expect(screen.getByRole("heading", { name: "Quality" })).toBeInTheDocument();
    const rows = within(table).getAllByRole("row").slice(1);
    // Server order (newest first) — not re-sorted by score.
    expect(rows[0]).toHaveTextContent("Asha");
    expect(rows[0]).toHaveTextContent("score 2.8 of 4");
    expect(within(rows[0]).getByTestId("qa-unhelpful-marker")).toHaveTextContent(
      "Unhelpful behaviour noted",
    );
    expect(rows[1]).toHaveTextContent("score 3.5 of 4");
    expect(requests("GET", "/v1/helpline/qa/mine")).toHaveLength(0);

    const filter = screen.getByRole("combobox", { name: "Listener" });
    await waitFor(() =>
      expect(
        within(filter)
          .getAllByRole("option")
          .map(option => option.textContent),
      ).toEqual(["All listeners", "Asha", "Meera"]),
    );
    fireEvent.change(filter, { target: { value: "7" } });
    await waitFor(() =>
      expect(within(screen.getByTestId("qa-table")).getAllByRole("row")).toHaveLength(2),
    );
    const lastCall = requests("GET", "/v1/helpline/qa").at(-1)?.[0] as Request;
    expect(new URL(lastCall.url).searchParams.get("listenerId")).toBe("7");
  });

  it("History links a chat with feedback to it", async () => {
    fetchRoutes["GET /v1/helpline/chats"] = () =>
      json({
        items: [
          {
            id: "chat-1",
            status: "ENDED",
            talkerName: "Ravi",
            language: "en",
            listener: { id: 42, displayName: "Asha" },
            riskLevel: "NONE",
            waitStartedAt: "2026-10-05T10:00:00.000Z",
            claimedAt: "2026-10-05T10:01:00.000Z",
            endedAt: "2026-10-05T10:30:00.000Z",
            endedReason: "LISTENER_ENDED",
            lastMessageAt: null,
            messageCount: 10,
            erased: false,
          },
          {
            id: "chat-9",
            status: "ENDED",
            talkerName: "Kiran",
            language: "en",
            listener: { id: 42, displayName: "Asha" },
            riskLevel: "NONE",
            waitStartedAt: "2026-10-05T09:00:00.000Z",
            claimedAt: "2026-10-05T09:01:00.000Z",
            endedAt: "2026-10-05T09:05:00.000Z",
            endedReason: "TALKER_ENDED",
            lastMessageAt: null,
            messageCount: 2,
            erased: false,
          },
        ],
        total: 2,
      });
    fetchRoutes["GET /v1/helpline/qa/mine"] = () => json({ items: [listItem()] });
    renderWorkspace(store, <HelplineHistory />, {
      path: "/helpline/history",
      url: "/helpline/history",
    });
    expect(await screen.findByTestId("history-feedback-chat-1")).toHaveAttribute(
      "href",
      "/helpline/qa/chat-1",
    );
    expect(screen.queryByTestId("history-feedback-chat-9")).not.toBeInTheDocument();
  });
});
