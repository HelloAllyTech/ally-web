import React from "react";

import { render, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SocketConnectionTypes } from "@constants";
import { store } from "@store";
import { SocketEvent, UserRole } from "@types";

import { useSessionManager } from "../useSessionManager";
import * as socketHook from "../useSocket";

vi.mock("@lifeline-ui-mono/ui-shared/logger", () => ({ logger: { info: vi.fn() } }));

vi.mock("@api", () => ({
  useLazyGetCounsellorChatQuery: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@utils", () => ({
  isProviderCloudTelephony: vi.fn(() => true),
  getPathForConnectionType: vi.fn(() => "ws"),
}));

vi.mock("react-redux", async actual => {
  const real = await actual<typeof import("react-redux")>();
  return {
    ...real,
    useSelector: vi.fn((fn: any) => fn({ user: { user: { role: UserRole.COUNSELLOR } } })),
  };
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter>{children}</MemoryRouter>
  </Provider>
);

const Harness = ({ onReady }: { onReady: (api: ReturnType<typeof useSessionManager>) => void }) => {
  const api = useSessionManager({ autoConnect: false });
  React.useEffect(() => {
    onReady(api);
    return () => {};
  }, [api, onReady]);
  return null;
};

describe("useSessionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setSession and clearSession update activeSession", async () => {
    let api!: ReturnType<typeof useSessionManager>;
    render(
      <Wrapper>
        <Harness onReady={a => (api = a)} />
      </Wrapper>,
    );

    expect(api.activeSession).toBeNull();
    await act(async () => {
      api.setSession({ chatId: 1 }, SocketConnectionTypes.MICROPHONE_MODE);
    });
    await waitFor(() =>
      expect(api.activeSession).toEqual({ chatId: 1, type: SocketConnectionTypes.MICROPHONE_MODE }),
    );

    await act(async () => {
      api.clearSession();
    });
    await waitFor(() => expect(api.activeSession).toBeNull());
  });

  it("disconnectAll calls both socket disconnectors", () => {
    const disconnectCloud = vi.fn();
    const disconnectMic = vi.fn();

    vi.spyOn(socketHook, "useSocket").mockImplementation(({ connectionType }: any) => {
      return connectionType === SocketConnectionTypes.CLOUD_TELEPHONY_CHAT
        ? ({ connect: vi.fn(), disconnect: disconnectCloud } as any)
        : ({ connect: vi.fn(), disconnect: disconnectMic } as any);
    });

    let api!: ReturnType<typeof useSessionManager>;
    render(
      <Wrapper>
        <Harness onReady={a => (api = a)} />
      </Wrapper>,
    );

    api.disconnectAll();
    expect(disconnectCloud).toHaveBeenCalled();
    expect(disconnectMic).toHaveBeenCalled();
  });
});
