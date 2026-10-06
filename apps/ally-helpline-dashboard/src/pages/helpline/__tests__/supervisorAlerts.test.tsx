import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const SUPERVISOR = ["view:helpline:lobby", "view:helpline:monitor", "edit:helpline:transfer"];

const { permissionsRef, toastMock } = vi.hoisted(() => ({
  permissionsRef: { current: [] as string[] },
  toastMock: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: [] } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ALERT_DEDUPE_MS, alertTarget, createAlertDeduper } from "../supervisorAlerts";
import {
  fetchMock,
  lastSocket,
  makeStore,
  meDto,
  resetKit,
  renderWorkspace,
  seed,
  type TestStore,
} from "./helplineTestKit";

describe("supervisor alert rules", () => {
  it("drops a repeat for the same chat and type inside 10 minutes, not a different type", () => {
    const accept = createAlertDeduper();
    const t0 = Date.parse("2026-10-06T10:00:00Z");
    expect(accept("RISK_HIGH:chat-1", t0)).toBe(true);
    expect(accept("RISK_HIGH:chat-1", t0 + 60_000)).toBe(false);
    expect(accept("LISTENER_REQUESTED_HELP:chat-1", t0 + 60_000)).toBe(true);
    expect(accept("RISK_HIGH:chat-2", t0 + 60_000)).toBe(true);
    expect(accept("RISK_HIGH:chat-1", t0 + ALERT_DEDUPE_MS)).toBe(true);
  });

  it("opens the chat, except a waiting talker, who is assigned from the Monitor", () => {
    expect(alertTarget("RISK_HIGH", "chat-1")).toBe("/helpline/chat/chat-1");
    expect(alertTarget("LISTENER_REQUESTED_HELP", "chat-1")).toBe("/helpline/chat/chat-1");
    expect(alertTarget("HIGH_RISK_WAITING", "chat-1")).toBe("/helpline/monitor");
  });
});

describe("supervisor alerts in the workspace", () => {
  let store: TestStore;
  const notifications: { title: string; options: NotificationOptions }[] = [];

  class FakeNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    onclick: (() => void) | null = null;
    constructor(title: string, options: NotificationOptions) {
      notifications.push({ title, options });
    }
    close() {}
  }

  beforeEach(() => {
    resetKit();
    notifications.length = 0;
    toastMock.mockReset();
    toastMock.warning.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Notification", FakeNotification);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    store = makeStore();
    seed(store, { me: meDto() });
    permissionsRef.current = SUPERVISOR;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  const mount = async () => {
    renderWorkspace(store, <div data-testid="somewhere">workspace</div>, {
      path: "/helpline/history",
      url: "/helpline/history",
    });
    await act(async () => {
      lastSocket().connect();
    });
  };

  const fireAlert = async (payload: Record<string, unknown>) => {
    await act(async () => {
      lastSocket().fire("ALERT", payload);
    });
  };

  it("a persistent toast with Open, a tone and a content-free notification — once per chat", async () => {
    await mount();
    const alert = {
      type: "RISK_HIGH",
      chatId: "chat-1",
      level: "HIGH",
      at: "2026-10-06T10:00:00Z",
      // Anything extra a payload might carry must never reach the screen or the OS.
      content: "I want to end it all",
      talkerName: "Ravi",
    };
    await fireAlert(alert);
    await fireAlert({ ...alert, at: "2026-10-06T10:01:00Z" });

    expect(toastMock.warning).toHaveBeenCalledTimes(1);
    const [text, options] = toastMock.warning.mock.calls[0];
    expect(text).toBe("A talker may be at high risk.");
    expect(options).toMatchObject({
      id: "RISK_HIGH:chat-1",
      duration: Number.POSITIVE_INFINITY,
      action: { label: "Open" },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("Helpline alert");
    expect(notifications[0].options.body).toBe("A talker may be at high risk.");
    const shown = JSON.stringify(notifications[0]) + JSON.stringify(toastMock.warning.mock.calls);
    expect(shown).not.toContain("end it all");
    expect(shown).not.toContain("Ravi");

    // Open goes to the chat (read-only for a supervisor, with the whisper composer).
    await act(async () => {
      options.action.onClick();
    });
    expect(await screen.findByTestId("chat-route")).toBeInTheDocument();
  });

  it("a listener asking for help on an already-flagged chat still gets through", async () => {
    await mount();
    await fireAlert({ type: "RISK_HIGH", chatId: "chat-1", at: "2026-10-06T10:00:00Z" });
    await fireAlert({
      type: "LISTENER_REQUESTED_HELP",
      chatId: "chat-1",
      at: "2026-10-06T10:00:30Z",
    });
    expect(toastMock.warning).toHaveBeenCalledTimes(2);
    expect(toastMock.warning.mock.calls[1][0]).toBe("A listener is asking for a supervisor.");
  });

  it("no notification while the tab is in view — the toast is enough", async () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await mount();
    await fireAlert({
      type: "LISTENER_DISCONNECTED",
      chatId: "chat-3",
      at: "2026-10-06T10:00:00Z",
    });
    expect(toastMock.warning).toHaveBeenCalledTimes(1);
    expect(notifications).toHaveLength(0);
  });

  it("a listener without the monitor permission doesn't get supervisor alerts", async () => {
    permissionsRef.current = ["view:helpline:lobby"];
    await mount();
    await fireAlert({ type: "RISK_HIGH", chatId: "chat-1", at: "2026-10-06T10:00:00Z" });
    await fireAlert({
      type: "LISTENER_REQUESTED_HELP",
      chatId: "chat-1",
      at: "2026-10-06T10:00:00Z",
    });
    expect(toastMock.warning).not.toHaveBeenCalled();
    expect(notifications).toHaveLength(0);
  });
});
