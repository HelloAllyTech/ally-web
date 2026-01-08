import React from "react";

import { render, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { store } from "@store";

import { useUser } from "../useUser";

vi.mock("@ally-ui-mono/ui-shared", () => ({ logger: { info: vi.fn() } }));

const apiMocks = {
  getUser: vi.fn(),
  getPermissions: vi.fn(),
};

vi.mock("@api", async () => {
  return {
    useLazyGetUserQuery: () => [apiMocks.getUser, { isLoading: false }],
    useLazyGetPermissionsQuery: () => [apiMocks.getPermissions, { isLoading: false }],
    useGetProfileImageUrlMutation: () => [vi.fn()],
    useDeleteProfileImageMutation: () => [vi.fn()],
    useUploadProfileImageMutation: () => [vi.fn()],
    useGetLogoUrlQuery: () => ({ data: null }),
  } as any;
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>{children}</Provider>
);

const Harness = ({ onReady }: { onReady: (api: ReturnType<typeof useUser>) => void }) => {
  const api = useUser();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
};

describe("useUser", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("checkAuth authenticates and stores user/permissions when token exists", async () => {
    localStorage.setItem("accessToken", "t");
    apiMocks.getUser.mockResolvedValueOnce({ data: { id: 1 } });
    apiMocks.getPermissions.mockResolvedValueOnce({ data: ["X"] });

    let api!: ReturnType<typeof useUser>;
    render(
      <Wrapper>
        <Harness onReady={a => (api = a)} />
      </Wrapper>,
    );

    let result: any;
    await act(async () => {
      result = await api.checkAuth();
    });

    expect(result).toEqual({ id: 1 });
    // Assert against Redux store to avoid timing on hook object refresh
    expect(store.getState().user.isAuthenticated).toBe(true);
    expect(store.getState().user.permissions).toEqual(["X"]);
  });

  it("checkAuth logs out on error or missing token", async () => {
    // Missing token path
    let api!: ReturnType<typeof useUser>;
    render(
      <Wrapper>
        <Harness onReady={a => (api = a)} />
      </Wrapper>,
    );

    let result: any;
    await act(async () => {
      result = await api.checkAuth();
    });
    expect(result).toBeNull();

    // With token but backend fails
    localStorage.setItem("accessToken", "t");
    apiMocks.getUser.mockRejectedValueOnce(new Error("fail"));

    await act(async () => {
      result = await api.checkAuth();
    });
    expect(result).toBeNull();
  });

  it("logout clears tokens and unauthenticates", () => {
    localStorage.setItem("accessToken", "t");
    localStorage.setItem("refreshToken", "r");

    let api!: ReturnType<typeof useUser>;
    render(
      <Wrapper>
        <Harness onReady={a => (api = a)} />
      </Wrapper>,
    );

    act(() => {
      api.logout();
    });

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(store.getState().user.isAuthenticated).toBe(false);
  });
});
