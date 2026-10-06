import { act, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
    expect(requests("GET", "/v1/helpline/me")).toHaveLength(0);
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
