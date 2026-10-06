/**
 * Shared fixtures for the listener-workspace tests: DTO builders, a fake
 * socket.io client that records emits and acks them, a routed fetch mock, and
 * a store with the real baseAPI so the realtime provider's cache patches run
 * for real. Not a test file (no `.test.`), so vitest doesn't collect it.
 */
import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import { baseAPI } from "@api/baseAPI";
import { helplineAPI } from "@api/helpline";
import type {
  ChatDetailDto,
  HelplineMeDto,
  LobbyDto,
  LobbyEntryDto,
  RiskFlagDto,
  StaffChatDto,
  StaffMessageDto,
} from "@types";

import { ackOverrides, fakeSockets } from "./fakeSocket";
import { HelplineRealtimeProvider } from "../realtime/HelplineRealtimeProvider";

// ─── Fake socket (its own module: the socket.io-client mock factory imports it,
// and anything that imported app code from there would deadlock module loading)
export { ackOverrides, allEmits, createFakeIo, fakeSockets, lastSocket } from "./fakeSocket";
export type { FakeSocket } from "./fakeSocket";

// ─── Fetch ──────────────────────────────────────────────────────────────────

type Handler = (request: Request) => Response | Promise<Response>;
export const fetchRoutes: Record<string, Handler> = {};
export const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : new Request(String(input), init);
  const key = `${request.method} ${new URL(request.url).pathname.replace(/^\/api/, "")}`;
  const handler = fetchRoutes[key];
  return handler ? handler(request) : json({ statusCode: 404, message: "Not found" }, 404);
});

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const requests = (method: string, path: string) =>
  fetchMock.mock.calls.filter(([input]) => {
    const request = input as Request;
    return request.method === method && new URL(request.url).pathname === `/api${path}`;
  });

export const resetKit = () => {
  fakeSockets.length = 0;
  // The staff socket reads the user's access token at connect time.
  localStorage.setItem("accessToken", "staff-access-token");
  fetchMock.mockClear();
  for (const key of Object.keys(fetchRoutes)) delete fetchRoutes[key];
  for (const key of Object.keys(ackOverrides)) delete ackOverrides[key];
};

// ─── DTO builders ───────────────────────────────────────────────────────────

export const meDto = (overrides: Partial<HelplineMeDto> = {}): HelplineMeDto => ({
  userId: 42,
  profile: {
    displayName: "Asha",
    maxConcurrentChats: 2,
    languages: ["en"],
    notificationsEnabled: true,
  },
  presence: "AVAILABLE",
  activeChatCount: 0,
  orgMaxConcurrentPerListener: 3,
  settings: {
    escalationChecklist: ["Ask directly about thoughts of suicide", "Tell a supervisor now"],
    listenerSupportContact: "Wellbeing line: 1800-000-000",
    summaryFields: [
      { key: "presenting_concern", label: "What they came to talk about", description: "" },
      { key: "next_step", label: "Agreed next step", description: "" },
    ],
    copilot: { suggestions: true, nudges: true, riskClassifier: true },
    languages: ["en", "hi"],
    idleEndMinutes: 15,
  },
  ...overrides,
});

export const staffChat = (overrides: Partial<StaffChatDto> = {}): StaffChatDto => ({
  id: "chat-1",
  status: "ACTIVE",
  channel: "TEXT_WEB",
  talker: {
    id: "t-1",
    displayName: "Ravi",
    language: "en",
    consentVersion: "v3",
    connected: true,
    blocked: false,
  },
  listener: { id: 42, displayName: "Asha" },
  myAccess: "LISTENER",
  priority: 0,
  riskLevel: "NONE",
  waitStartedAt: "2026-10-05T10:00:00.000Z",
  claimedAt: "2026-10-05T10:03:00.000Z",
  endedAt: null,
  endedReason: null,
  lastTalkerMessageAt: null,
  lastListenerMessageAt: null,
  transferPending: false,
  resourcesSentAt: null,
  listenerConnected: true,
  erased: false,
  ...overrides,
});

export const staffMessage = (overrides: Partial<StaffMessageDto> = {}): StaffMessageDto => ({
  id: 1,
  chatId: "chat-1",
  clientMessageId: null,
  type: "TEXT",
  senderRole: "TALKER",
  senderUserId: null,
  senderName: null,
  systemKind: null,
  content: "I haven't been sleeping",
  parentMessageId: null,
  visibleToTalker: true,
  metadata: null,
  createdAt: "2026-10-05T10:04:00.000Z",
  erased: false,
  ...overrides,
});

export const riskFlag = (overrides: Partial<RiskFlagDto> = {}): RiskFlagDto => ({
  id: "flag-1",
  messageId: 1,
  level: "HIGH",
  source: "KEYWORD",
  confidence: null,
  subject: "SELF",
  signal: "end it all",
  resourcesSent: true,
  acknowledgedAt: null,
  acknowledgedByName: null,
  outcome: "UNREVIEWED",
  outcomeNote: null,
  createdAt: "2026-10-05T10:05:00.000Z",
  ...overrides,
});

export const chatDetail = (overrides: Partial<ChatDetailDto> = {}): ChatDetailDto => ({
  chat: staffChat(),
  messages: [staffMessage()],
  riskFlags: [],
  summaries: { rolling: null, handoff: null, final: null },
  copilot: { status: "OK", stage: "Understand" },
  events: [],
  ...overrides,
});

export const lobbyEntry = (overrides: Partial<LobbyEntryDto> = {}): LobbyEntryDto => ({
  chatId: "wait-1",
  kind: "NEW",
  displayName: "Anonymous",
  language: "en",
  waitStartedAt: "2026-10-05T10:00:00.000Z",
  priority: 0,
  riskLevel: "NONE",
  preview: "Can I talk to someone?",
  transferFromName: null,
  targetListenerId: null,
  ...overrides,
});

export const lobbyDto = (overrides: Partial<LobbyDto> = {}): LobbyDto => ({
  waiting: [],
  myChats: [],
  counts: { waiting: 0, active: 0, listenersAvailable: 1 },
  ...overrides,
});

// ─── Render ─────────────────────────────────────────────────────────────────

export const makeStore = () =>
  configureStore({
    reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
    middleware: getDefault =>
      getDefault({ serializableCheck: false, immutableCheck: false }).concat(baseAPI.middleware),
  });

export type TestStore = ReturnType<typeof makeStore>;

export const seed = (
  store: TestStore,
  { me, lobby, chat }: { me?: HelplineMeDto; lobby?: LobbyDto; chat?: ChatDetailDto },
) => {
  // upsertQueryEntries is synchronous (upsertQueryData resolves a tick later,
  // so the first render would still see a pending entry).
  store.dispatch(
    helplineAPI.util.upsertQueryEntries([
      ...(me ? [{ endpointName: "getHelplineMe" as const, arg: undefined, value: me }] : []),
      ...(lobby
        ? [{ endpointName: "getHelplineLobby" as const, arg: undefined, value: lobby }]
        : []),
      ...(chat
        ? [{ endpointName: "getHelplineChat" as const, arg: chat.chat.id, value: chat }]
        : []),
    ]),
  );
};

/** Render `element` at `path` inside the realtime provider, with a lobby route to land on. */
export const renderWorkspace = (
  store: TestStore,
  element: React.ReactElement,
  { path, url }: { path: string; url: string },
) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <HelplineRealtimeProvider enabled>
          <Routes>
            <Route path={path} element={element} />
            {path !== "/helpline" && (
              <Route path="/helpline" element={<div data-testid="lobby-route">lobby</div>} />
            )}
            {path !== "/helpline/chat/:chatId" && (
              <Route
                path="/helpline/chat/:chatId"
                element={<div data-testid="chat-route">chat</div>}
              />
            )}
          </Routes>
        </HelplineRealtimeProvider>
      </MemoryRouter>
    </Provider>,
  );
