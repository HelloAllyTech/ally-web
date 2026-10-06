import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { permissionsRef } = vi.hoisted(() => ({
  permissionsRef: {
    current: [
      "view:helpline:lobby",
      "view:helpline:chat",
      "edit:helpline:message",
      "edit:helpline:end",
      "view:helpline:copilot",
      "edit:helpline:summary",
      "view:helpline:monitor",
      "edit:helpline:transfer",
      "edit:helpline:whisper",
    ] as string[],
  },
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: [] } }),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

import { HelplineChatView } from "../HelplineChatView";
import { HelplineLayout } from "../HelplineLayout";
import { HelplineLobby } from "../HelplineLobby";
import { HelplineMonitor } from "../HelplineMonitor";
import {
  chatDetail,
  fetchMock,
  fetchRoutes,
  json,
  lastSocket,
  makeStore,
  meDto,
  requests,
  resetKit,
  riskFlag,
  staffChat,
  type TestStore,
} from "./helplineTestKit";

const renderWorkspaceAt = (store: TestStore, url: string) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/helpline" element={<HelplineLayout />}>
            <Route index element={<HelplineLobby />} />
            <Route path="/helpline/chat/:chatId" element={<HelplineChatView />} />
            <Route path="/helpline/monitor" element={<HelplineMonitor />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe("HelplineLayout — switched off with chats still open", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    fetchRoutes["GET /v1/helpline/enabled"] = () =>
      json({ enabled: false, continuingChatIds: ["chat-1"] });
    fetchRoutes["GET /v1/helpline/me"] = () =>
      json({ statusCode: 403, message: "off", errorCode: "HELPLINE_DISABLED" }, 403);
    fetchRoutes["GET /v1/helpline/chats/chat-1"] = () => json(chatDetail());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("the lobby says so and lists only the open chats — not access denied", async () => {
    renderWorkspaceAt(store, "/helpline");

    const lobby = await screen.findByTestId("helpline-restricted-lobby");
    expect(lobby).toHaveTextContent(
      "Helpline is switched off for your organisation — you can finish your open chats",
    );
    expect(await within(lobby).findByTestId("continuing-chat-1")).toHaveTextContent("Ravi");
    expect(within(lobby).getByTestId("continuing-chat-1")).toHaveAttribute(
      "href",
      "/helpline/chat/chat-1",
    );
    // Only the lobby tab; the refused routes are never asked for.
    const nav = screen.getByRole("navigation", { name: "Helpline sections" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map(link => link.textContent),
    ).toEqual(["Lobby"]);
    expect(requests("GET", "/v1/helpline/me")).toHaveLength(0);
    expect(requests("GET", "/v1/helpline/lobby")).toHaveLength(0);
  });

  it("an open chat stays usable: reply box, end, alert a supervisor — no supervision actions", async () => {
    renderWorkspaceAt(store, "/helpline/chat/chat-1");
    expect(await screen.findByRole("textbox", { name: "Reply" })).toBeInTheDocument();
    await act(async () => {
      lastSocket().connect();
    });
    expect(screen.getByRole("button", { name: "End chat" })).toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "Show talker details" }).click();
    });
    expect(screen.getByRole("button", { name: "Alert a supervisor" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request transfer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Block talker" })).not.toBeInTheDocument();
    // Asked for, not skipped — this server refuses it (HELPLINE_DISABLED), so the stand-in served.
    expect(requests("GET", "/v1/helpline/me")).toHaveLength(1);
  });

  it("the rest of the workspace explains it's unavailable", async () => {
    renderWorkspaceAt(store, "/helpline/monitor");
    expect(
      await screen.findByText(
        "This part of the helpline is unavailable while it's switched off. Finish your open chats from the Lobby.",
      ),
    ).toBeInTheDocument();
    expect(requests("GET", "/v1/helpline/monitor")).toHaveLength(0);
  });

  it("with nothing left open it's the plain 'switched off' screen", async () => {
    fetchRoutes["GET /v1/helpline/enabled"] = () => json({ enabled: false, continuingChatIds: [] });
    renderWorkspaceAt(store, "/helpline");
    expect(await screen.findByText("The text helpline isn't turned on")).toBeInTheDocument();
  });

  it("switched on, it's the normal workspace", async () => {
    fetchRoutes["GET /v1/helpline/enabled"] = () => json({ enabled: true, continuingChatIds: [] });
    fetchRoutes["GET /v1/helpline/me"] = () => json(meDto());
    fetchRoutes["GET /v1/helpline/lobby"] = () =>
      json({ waiting: [], myChats: [], counts: { waiting: 0, active: 0, listenersAvailable: 1 } });
    renderWorkspaceAt(store, "/helpline");
    expect(await screen.findByTestId("lobby-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("helpline-restricted-lobby")).not.toBeInTheDocument();
  });
});

describe("HelplineChatView — the listener's profile while the helpline is switched off", () => {
  let store: TestStore;
  const openFlagChat = () =>
    json(chatDetail({ chat: staffChat({ riskLevel: "HIGH" }), riskFlags: [riskFlag()] }));

  beforeEach(() => {
    resetKit();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    fetchRoutes["GET /v1/helpline/enabled"] = () =>
      json({ enabled: false, continuingChatIds: ["chat-1"] });
    fetchRoutes["GET /v1/helpline/chats/chat-1"] = openFlagChat;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(toast.warning).mockClear();
  });

  it("is the real GET /me when the server serves it: the escalation checklist and support contact are there", async () => {
    fetchRoutes["GET /v1/helpline/me"] = () => json(meDto());
    fetchRoutes["POST /v1/helpline/chats/chat-1/alert-supervisor"] = () =>
      json({ alertedCount: 0 });
    renderWorkspaceAt(store, "/helpline/chat/chat-1");

    const banner = await screen.findByTestId("risk-banner-flag-1");
    expect(requests("GET", "/v1/helpline/me")).toHaveLength(1);
    // The org's checklist, from /me — the stand-in has none.
    expect(
      within(banner).getByLabelText("Ask directly about thoughts of suicide"),
    ).toBeInTheDocument();
    expect(within(banner).getByLabelText("Tell a supervisor now")).toBeInTheDocument();

    // And the org's support contact, for when nobody could be alerted.
    fireEvent.click(within(banner).getByRole("button", { name: "Alert a supervisor" }));
    fireEvent.click(within(banner).getByRole("button", { name: "Send alert" }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(vi.mocked(toast.warning).mock.calls[0][0]).toContain("Wellbeing line: 1800-000-000");
  });

  it("falls back to the stand-in only when GET /me fails — the chat is still usable, without the checklist", async () => {
    fetchRoutes["GET /v1/helpline/me"] = () =>
      json({ statusCode: 403, message: "off", errorCode: "HELPLINE_DISABLED" }, 403);
    renderWorkspaceAt(store, "/helpline/chat/chat-1");

    expect(await screen.findByRole("textbox", { name: "Reply" })).toBeInTheDocument();
    const banner = screen.getByTestId("risk-banner-flag-1");
    expect(requests("GET", "/v1/helpline/me")).toHaveLength(1);
    expect(
      within(banner).queryByLabelText("Ask directly about thoughts of suicide"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("We couldn't load this chat.")).not.toBeInTheDocument();
  });

  it("falls back the same way on a server error, rather than blocking a chat that has to be finished", async () => {
    fetchRoutes["GET /v1/helpline/me"] = () => json({ statusCode: 500, message: "boom" }, 500);
    renderWorkspaceAt(store, "/helpline/chat/chat-1");

    expect(await screen.findByRole("textbox", { name: "Reply" })).toBeInTheDocument();
    expect(screen.queryByText("We couldn't load this chat.")).not.toBeInTheDocument();
  });

  it("waits for the profile instead of flashing the stand-in or an error", async () => {
    let answerMe: (response: Response) => void = () => undefined;
    fetchRoutes["GET /v1/helpline/me"] = () =>
      new Promise<Response>(resolve => {
        answerMe = resolve;
      });
    renderWorkspaceAt(store, "/helpline/chat/chat-1");

    expect(await screen.findByText("Loading chat…")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByText("We couldn't load this chat.")).not.toBeInTheDocument();

    await act(async () => {
      answerMe(json(meDto()));
    });
    const banner = await screen.findByTestId("risk-banner-flag-1");
    expect(
      within(banner).getByLabelText("Ask directly about thoughts of suicide"),
    ).toBeInTheDocument();
  });
});
