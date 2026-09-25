import React from "react";

import { render, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Permissions, SocketConnectionTypes } from "@constants";
import { store } from "@store";
import { SocketEvent, UserRole } from "@types";

import { useSessionManager } from "../useSessionManager";
import * as socketHook from "../useSocket";

// Mutable slice the mocked `useSelector` reads from, so a test can change
// `permissions` between renders without touching `user.role`.
const userSlice = vi.hoisted(() => ({
  current: { user: { role: "" as string }, permissions: [] as string[] },
}));

const getCounsellorChat = vi.hoisted(() => vi.fn());
const hasCallPermission = vi.hoisted(() => vi.fn());

vi.mock("@ally-ui-mono/ui-shared/logger", () => ({ logger: { info: vi.fn() } }));

vi.mock("@api", () => ({
  useLazyGetCounsellorChatQuery: () => [getCounsellorChat, { isLoading: false }],
}));

vi.mock("@utils", () => ({
  isProviderCloudTelephony: vi.fn(() => true),
  getPathForConnectionType: vi.fn(() => "ws"),
  hasCallPermission,
}));

vi.mock("react-redux", async actual => {
  const real = await actual<typeof import("react-redux")>();
  return {
    ...real,
    useSelector: vi.fn((fn: any) => fn({ user: userSlice.current })),
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
    userSlice.current = { user: { role: UserRole.COUNSELLOR }, permissions: [] };
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

  // Regression: the active-chat effect gates on `hasCallPermission(permissions)`
  // but used to key only on `user?.role`. `role` is a lossy legacy collapse of
  // the real group memberships, so it can already be set (from the persisted
  // store) while `permissions` is still empty and only arrives with the
  // GET /users/me response. With `permissions` missing from the dependency
  // array the effect kept the stale empty array and never refetched, so a
  // counsellor with a call already in progress was never reconnected to it.
  it("refetches the active chat when permissions arrive after role is already set", async () => {
    const cloudSocket = { connect: vi.fn(), disconnect: vi.fn() };
    const micSocket = { connect: vi.fn(), disconnect: vi.fn() };
    vi.spyOn(socketHook, "useSocket").mockImplementation(({ connectionType }: any) =>
      connectionType === SocketConnectionTypes.CLOUD_TELEPHONY_CHAT
        ? (cloudSocket as any)
        : (micSocket as any),
    );
    hasCallPermission.mockImplementation((permissions: string[]) =>
      (permissions ?? []).includes(Permissions.START_MICROPHONE_CHAT),
    );
    getCounsellorChat.mockResolvedValue({ data: { chatId: "chat-1", provider: "twilio" } });

    // The active-chat fetch only runs while the connection is enabled.
    const ConnectedHarness = () => {
      useSessionManager();
      return null;
    };

    // First render: the persisted role is there, the permissions are not yet.
    userSlice.current = { user: { role: UserRole.COUNSELLOR }, permissions: [] };
    const { rerender } = render(
      <Wrapper>
        <ConnectedHarness />
      </Wrapper>,
    );
    await waitFor(() => expect(hasCallPermission).toHaveBeenCalled());
    expect(getCounsellorChat).not.toHaveBeenCalled();

    // GET /users/me resolves: permissions change, `role` does not.
    await act(async () => {
      userSlice.current = {
        user: { role: UserRole.COUNSELLOR },
        permissions: [Permissions.START_MICROPHONE_CHAT],
      };
      rerender(
        <Wrapper>
          <ConnectedHarness />
        </Wrapper>,
      );
    });

    await waitFor(() => expect(getCounsellorChat).toHaveBeenCalled());
  });
});
