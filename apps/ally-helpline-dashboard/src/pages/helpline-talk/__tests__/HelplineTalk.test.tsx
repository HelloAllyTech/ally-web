import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { helplineGuestAPI } from "@api/helplineGuest";
import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";
import { getGuestTokenStorageKey, HELPLINE_QUICK_EXIT_URL } from "@constants/helpline";
import type { GuestChatDto, PublicStatusEnabled } from "@types";

import { HelplineTalk } from "../HelplineTalk";

const { sockets, trackMock } = vi.hoisted(() => ({
  sockets: [] as any[],
  trackMock: vi.fn(),
}));

vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));

// A socket that never connects unless a test says so, and acks every emit.
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => {
    const handlers: Record<string, ((payload?: unknown) => void)[]> = {};
    const socket: any = {
      connected: false,
      acks: [] as { event: string; payload: any }[],
      on: vi.fn((event: string, cb: (payload?: unknown) => void) => {
        (handlers[event] ||= []).push(cb);
        return socket;
      }),
      emit: vi.fn(),
      timeout: vi.fn(() => ({
        emit: vi.fn(
          (event: string, payload: any, cb: (err: Error | null, res?: unknown) => void) => {
            socket.acks.push({ event, payload });
            if (event === "SEND_MESSAGE") {
              cb(null, {
                ok: true,
                message: {
                  id: 100 + socket.acks.length,
                  clientMessageId: payload.clientMessageId,
                  from: "ME",
                  type: "TEXT",
                  systemKind: null,
                  content: payload.content,
                  createdAt: new Date().toISOString(),
                },
              });
            } else {
              cb(null, { ok: true, messages: [] });
            }
          },
        ),
      })),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      fire(event: string, payload?: unknown) {
        handlers[event]?.forEach(cb => cb(payload));
      },
    };
    sockets.push(socket);
    return socket;
  }),
}));

const TENANT = "acme";
const STORAGE_KEY = getGuestTokenStorageKey(TENANT);

const status: PublicStatusEnabled = {
  enabled: true,
  open: true,
  closedReason: null,
  org: { name: "Acme Care", logoUrl: null },
  languages: ["en", "hi"],
  hours: null,
  estimatedWaitMinutes: null,
  resources: { en: "Call 112, or Tele-MANAS on 14416." },
  consent: { version: "v3", retentionDays: 30, ageNotice: null },
};

const activeChat: GuestChatDto = {
  id: "chat-1",
  status: "ACTIVE",
  endedReason: null,
  language: "en",
  displayName: "Anonymous",
  listenerName: "Asha",
  queuePosition: null,
  waitStartedAt: "2026-10-05T10:00:00.000Z",
  claimedAt: "2026-10-05T10:02:00.000Z",
  endedAt: null,
  feedbackSubmitted: false,
  org: { name: "Acme Care", logoUrl: null },
};

type Handler = (request: Request) => Response | Promise<Response>;
let routes: Record<string, Handler> = {};
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown, statusCode = 200) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });

const requestsTo = (method: string, pathEnd: string) =>
  fetchMock.mock.calls.filter(([input, init]) => {
    const url = input instanceof Request ? input.url : String(input);
    const verb = input instanceof Request ? input.method : (init?.method ?? "GET");
    return verb === method && new URL(url).pathname.endsWith(pathEnd);
  });

const renderPage = () => {
  const store = configureStore({
    reducer: { [helplineGuestAPI.reducerPath]: helplineGuestAPI.reducer },
    middleware: getDefault => getDefault().concat(helplineGuestAPI.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/talk/${TENANT}`]}>
        <Routes>
          <Route path="/talk/:tenantCode" element={<HelplineTalk />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const originalLocation = window.location;

describe("HelplineTalk — the anonymous talker page", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    sessionStorage.clear();
    sockets.length = 0;
    trackMock.mockReset();
    routes = {
      [`GET /api/v1/helpline/public/${TENANT}/status`]: () => json(status),
    };
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(String(input), init);
      const key = `${request.method} ${new URL(request.url).pathname}`;
      const handler = routes[key];
      return handler ? handler(request) : json({ statusCode: 404, message: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("shows the consent points, with confidentiality limits and emergency numbers before any way to write", async () => {
    const { container } = renderPage();

    expect(
      await screen.findByRole("heading", { name: "Talk to someone at Acme Care" }),
    ).toBeInTheDocument();
    // Emergency numbers right on the consent screen, from the org's resources.
    expect(screen.getByText("Call 112, or Tele-MANAS on 14416.")).toBeInTheDocument();
    // AI disclosure (§7.3) — and the promise that a person writes every message.
    expect(screen.getByTestId("consent-ai")).toHaveTextContent(
      "Every message you receive is written by a person.",
    );
    // Confidentiality is never unconditional.
    expect(screen.getByTestId("consent-privacy")).toHaveTextContent(
      "the team may follow its safety procedure",
    );
    expect(screen.getByTestId("consent-retention")).toHaveTextContent("kept for 30 days");
    expect(screen.getByTestId("consent-device")).toHaveTextContent("Quick exit");

    // No message box on consent: nothing can be disclosed before the limits are read.
    expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument();
    const nameInput = screen.getByLabelText("What should we call you? (optional)");
    expect(
      screen.getByTestId("consent-privacy").compareDocumentPosition(nameInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Session replay and autocapture skip the whole page.
    expect(container.querySelector("[data-testid=helpline-talk-page]")).toHaveClass(
      "ph-no-capture",
    );
  });

  it("starts a session with the consent version, stores the guest token, and shows the waiting screen", async () => {
    routes[`POST /api/v1/helpline/public/${TENANT}/session`] = async request => {
      expect(await request.clone().json()).toEqual({
        language: "en",
        consentVersion: "v3",
        displayName: "Sam",
      });
      return json(
        {
          guestToken: "guest-token-1",
          expiresAt: "2099-01-01T00:00:00.000Z",
          chat: {
            ...activeChat,
            status: "WAITING",
            listenerName: null,
            queuePosition: 3,
            claimedAt: null,
          },
          messages: [],
        },
        201,
      );
    };
    renderPage();

    fireEvent.change(await screen.findByLabelText("What should we call you? (optional)"), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));

    expect(await screen.findByRole("heading", { name: "You're in line" })).toBeInTheDocument();
    expect(screen.getByTestId("queue-position")).toHaveTextContent("You're 3rd in line");
    // No estimate from the server → none shown (never invent a number).
    expect(screen.queryByTestId("queue-estimate")).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}").token).toBe("guest-token-1");
    expect(trackMock).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.TALKER_SESSION_STARTED,
      expect.not.objectContaining({ display_name: expect.anything() }),
    );
  });

  it("sends a message typed in the queue over the socket and shows it as the talker's own, sent", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "guest-token-1", expiresAt: "2099-01-01T00:00:00.000Z" }),
    );
    routes["GET /api/v1/helpline/guest/chat"] = () =>
      json({
        chat: {
          ...activeChat,
          status: "WAITING",
          listenerName: null,
          queuePosition: 1,
          claimedAt: null,
        },
        messages: [],
      });
    renderPage();

    expect(await screen.findByTestId("queue-position")).toHaveTextContent("You're next in line");
    const socket = sockets[sockets.length - 1];
    expect(socket).toBeDefined();
    await act(async () => {
      socket.connected = true;
      socket.fire("connect");
    });

    const box = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "I can't sleep" } });
    fireEvent.keyDown(box, { key: "Enter" });

    expect(await screen.findByText("I can't sleep")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sent")).toBeInTheDocument());
    const send = socket.acks.find((ack: any) => ack.event === "SEND_MESSAGE");
    expect(send.payload).toMatchObject({ chatId: "chat-1", content: "I can't sleep" });
    expect(send.payload.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(box).toHaveValue("");
  });

  it("does not send on Enter while an input method is composing (Indic keyboards)", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "guest-token-1", expiresAt: "2099-01-01T00:00:00.000Z" }),
    );
    routes["GET /api/v1/helpline/guest/chat"] = () => json({ chat: activeChat, messages: [] });
    renderPage();

    const box = await screen.findByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "नमस्ते" } });
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(box).toHaveValue("नमस्ते");
  });

  it("Quick exit clears the guest token, ends the chat with a keepalive request and replaces the page", async () => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, replace },
      writable: true,
    });
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "guest-token-1", expiresAt: "2099-01-01T00:00:00.000Z" }),
    );
    routes["GET /api/v1/helpline/guest/chat"] = () => json({ chat: activeChat, messages: [] });
    routes["POST /api/v1/helpline/guest/end"] = () =>
      json({ chat: { ...activeChat, status: "ENDED" } });
    renderPage();

    await screen.findByRole("textbox", { name: "Message" });
    fireEvent.click(screen.getByTestId("helpline-quick-exit"));

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith(HELPLINE_QUICK_EXIT_URL);
    const [endCall] = requestsTo("POST", "/guest/end");
    expect(endCall[1]).toMatchObject({ keepalive: true });
    expect(endCall[1].headers).toMatchObject({ Authorization: "Bearer guest-token-1" });
    expect(trackMock).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.TALKER_QUICK_EXIT_USED,
      expect.objectContaining({ screen: "chat" }),
    );
  });

  it("Delete my conversation confirms, calls erase, clears the token and shows the deleted screen", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "guest-token-1", expiresAt: "2099-01-01T00:00:00.000Z" }),
    );
    routes["GET /api/v1/helpline/guest/chat"] = () => json({ chat: activeChat, messages: [] });
    routes["POST /api/v1/helpline/guest/erase"] = () => new Response(null, { status: 204 });
    renderPage();

    await screen.findByRole("textbox", { name: "Message" });
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete my conversation" }));

    const dialog = screen.getByRole("dialog", { name: "Delete your conversation?" });
    expect(dialog).toHaveTextContent("This can't be undone.");
    // Nothing is erased until the talker confirms.
    expect(requestsTo("POST", "/guest/erase")).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByRole("heading", { name: "Your conversation has been deleted" }),
    ).toBeInTheDocument();
    const [eraseCall] = requestsTo("POST", "/guest/erase");
    expect((eraseCall[0] as Request).headers.get("Authorization")).toBe("Bearer guest-token-1");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("helpline-resources")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.TALKER_CONVERSATION_DELETED,
      expect.objectContaining({ chat_id: "chat-1" }),
    );
  });

  it("drops an expired guest token and shows consent with a notice instead of a login page", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: "stale", expiresAt: "2020-01-01T00:00:00.000Z" }),
    );
    routes["GET /api/v1/helpline/guest/chat"] = () =>
      json(
        { statusCode: 401, message: "Unauthorized", errorCode: "HELPLINE_GUEST_TOKEN_INVALID" },
        401,
      );
    renderPage();

    expect(
      await screen.findByText("Your earlier chat on this device has ended."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Talk to someone at Acme Care" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("shows the closed screen with resources and Try again when nobody is available", async () => {
    routes[`GET /api/v1/helpline/public/${TENANT}/status`] = () =>
      json({ ...status, open: false, closedReason: "NO_LISTENERS" });
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Nobody is available right now" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("helpline-resources")).toHaveTextContent("Tele-MANAS on 14416");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(requestsTo("GET", `/public/${TENANT}/status`).length).toBeGreaterThan(1),
    );
  });

  it("shows not-available with the static emergency line when the helpline is off", async () => {
    routes[`GET /api/v1/helpline/public/${TENANT}/status`] = () => json({ enabled: false });
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "This helpline isn't available" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("helpline-resources")).toHaveTextContent("call 112");
    expect(screen.getByTestId("helpline-resources")).toHaveTextContent("14416");
  });
});
