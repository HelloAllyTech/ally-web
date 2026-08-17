import React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useGetUserQuery, useGetPermissionsQuery, useGetUserPreferencesQuery } from "@api";
import { LOCAL_STORAGE_KEYS, ROUTES, Permissions, SIDEBAR_ITEMS, UserRole } from "@constants";

import { DefaultRedirect } from "../DefaultRedirect";

// Mock the data layer; DefaultRedirect uses the REAL deriveNavigationItems (a
// light, pure helper) so this exercises the full first-tab resolution.
// baseAPI is required because importing @constants transitively pulls @store
// (constants -> @components -> LogViewer -> loggerWithRedux -> @store), and
// store/index.ts reads baseAPI.reducerPath at module-eval time.
vi.mock("@api", () => ({
  useGetUserQuery: vi.fn(),
  useGetPermissionsQuery: vi.fn(),
  useGetUserPreferencesQuery: vi.fn(),
  useGetCharacterLibraryEnabledQuery: vi.fn(() => ({ data: false, isLoading: false })),
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: vi.fn(),
    middleware: vi.fn(),
    util: { resetApiState: vi.fn() },
  },
}));

vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn() },
}));

const mockUserQuery = vi.mocked(useGetUserQuery);
const mockPermsQuery = vi.mocked(useGetPermissionsQuery);
const mockPrefsQuery = vi.mocked(useGetUserPreferencesQuery);

const renderAtRoot = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<DefaultRedirect />} />
        <Route path={ROUTES.LOGIN} element={<div>LoginPage</div>} />
        <Route path={ROUTES.SIMULATION_STUDIO} element={<div>StudioPage</div>} />
        <Route path={ROUTES.MANAGE_EVENTS} element={<div>EventsPage</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("DefaultRedirect", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Defaults: authenticated non-super-admin, everything settled (override per test).
    mockUserQuery.mockReturnValue({ data: { role: UserRole.ADMIN }, isLoading: false } as any);
    mockPermsQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockPrefsQuery.mockReturnValue({
      data: {},
      isLoading: false,
      isUninitialized: false,
    } as any);
  });

  it("redirects to login when not authenticated", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "false");
    renderAtRoot();
    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  it("renders nothing (no premature redirect) while core data is loading", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPermsQuery.mockReturnValue({ data: undefined, isLoading: true } as any);
    renderAtRoot();
    expect(screen.queryByText("StudioPage")).not.toBeInTheDocument();
    expect(screen.queryByText("EventsPage")).not.toBeInTheDocument();
    expect(screen.queryByText("LoginPage")).not.toBeInTheDocument();
  });

  it("renders nothing while preferences are still loading", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPrefsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isUninitialized: false,
    } as any);
    renderAtRoot();
    expect(screen.queryByText("StudioPage")).not.toBeInTheDocument();
    expect(screen.queryByText("EventsPage")).not.toBeInTheDocument();
  });

  it("redirects to the user's first accessible tab", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPermsQuery.mockReturnValue({ data: [Permissions.EDIT_EVENT], isLoading: false } as any);
    renderAtRoot();
    expect(screen.getByText("EventsPage")).toBeInTheDocument();
  });

  it("honors the user's saved order so their chosen tab is the landing page", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPermsQuery.mockReturnValue({
      data: [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT],
      isLoading: false,
    } as any);
    mockPrefsQuery.mockReturnValue({
      data: { admin_sidebar_order: [SIDEBAR_ITEMS.EVENTS] },
      isLoading: false,
      isUninitialized: false,
    } as any);
    renderAtRoot();
    // EVENTS was floated to first by the saved order, ahead of Simulation Studio.
    expect(screen.getByText("EventsPage")).toBeInTheDocument();
  });

  it("falls back to Simulation Studio when the user has no resolvable tabs", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPermsQuery.mockReturnValue({ data: [], isLoading: false } as any);
    renderAtRoot();
    expect(screen.getByText("StudioPage")).toBeInTheDocument();
  });

  it("still resolves the first tab when the preferences query errors (403)", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
    mockPermsQuery.mockReturnValue({ data: [Permissions.EDIT_EVENT], isLoading: false } as any);
    mockPrefsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isUninitialized: false,
      isError: true,
    } as any);
    renderAtRoot();
    expect(screen.getByText("EventsPage")).toBeInTheDocument();
  });
});
