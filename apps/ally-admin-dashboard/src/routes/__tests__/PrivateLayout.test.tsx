import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { LOCAL_STORAGE_KEYS, ROUTES, Permissions, UserRole } from "@constants";
import reportUploadReducer from "@reducer/reportUploadReducer";

import { PrivateLayout } from "../PrivateLayout";

// The signed-in user the @api mock reports. Hoisted so the vi.mock factory
// below (which vitest lifts above the imports) can close over it, and mutable
// so individual tests can vary the role.
const userState = vi.hoisted(() => ({
  current: { id: 1, role: "SUPER_ADMIN" } as { id: number; role?: string },
}));

vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    Sidebar: () => <div>Sidebar</div>,
    AccessDenied: () => <div>This page is not accessible</div>,
  };
});

// Mock ReportUploadProgressDialog to avoid API dependency
vi.mock("@components/report-upload-progress-dialog/ReportUploadProgressDialog", () => ({
  default: () => null,
}));

// Mock ScenarioReportsSocketProvider so it doesn't use the real store (getState().reportUpload)
vi.mock("@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider", () => ({
  ScenarioReportsSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock("@api", () => ({
  useGetUserQuery: () => ({ data: userState.current, isLoading: false }),
  useGetPermissionsQuery: () => ({ data: [Permissions.EDIT_USER], isLoading: false }),
  useGetUserPreferencesQuery: () => ({ data: undefined, isLoading: false }),
  useLazyGetUserQuery: () => [
    vi.fn().mockResolvedValue({ data: userState.current }),
    { isLoading: false },
  ],
  useLazyGetPermissionsQuery: () => [
    vi.fn().mockResolvedValue({ data: [Permissions.EDIT_USER] }),
    { isLoading: false },
  ],
  useCancelReportGenerationMutation: () => [
    (params: any) => ({
      unwrap: async () => Promise.resolve(),
    }),
    { isLoading: false },
  ],
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: vi.fn(),
    middleware: vi.fn(),
    util: { resetApiState: vi.fn() },
  },
}));

vi.mock("@utils", async importOriginal => {
  const actual = await importOriginal<typeof import("@utils")>();
  return {
    ...actual,
    hasPermissions: vi.fn(() => true),
  };
});

describe("PrivateLayout", () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    userState.current = { id: 1, role: UserRole.SUPER_ADMIN };

    // Create a mock store for each test
    mockStore = configureStore({
      reducer: {
        user: () => ({
          isAuthenticated: false,
          user: null,
          userStatus: "offline",
          permissions: [Permissions.EDIT_USER],
          availableChatTypes: [],
        }),
        reportUpload: reportUploadReducer.reducer,
      },
      preloadedState: {
        reportUpload: {
          uploads: [],
          currentScenarioId: undefined,
        },
      },
    });
  });

  it("redirects to login when not authenticated", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "false");

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div>LoginPage</div>} />
            <Route
              path="/protected"
              element={
                <PrivateLayout>
                  <div>ProtectedContent</div>
                </PrivateLayout>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  it("renders children when authenticated and has permissions", () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route
              path="/protected"
              element={
                <PrivateLayout requiredPermissions={[Permissions.EDIT_USER]}>
                  <div>AllowedContent</div>
                </PrivateLayout>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("AllowedContent")).toBeInTheDocument();
  });

  it("renders AccessDenied when lacking permissions", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

    const { hasPermissions } = await import("@utils");
    (hasPermissions as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route
              path="/protected"
              element={
                <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
                  <div>BlockedContent</div>
                </PrivateLayout>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByText("BlockedContent")).not.toBeInTheDocument();
    expect(screen.getByText("This page is not accessible")).toBeInTheDocument();
  });

  it("returns children directly in preview mode when permitted", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

    const { hasPermissions } = await import("@utils");
    (hasPermissions as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={["/preview"]}>
          <Routes>
            <Route
              path="/preview"
              element={
                <PrivateLayout isPreview requiredPermissions={[Permissions.VIEW_ADMIN_SCENARIO]}>
                  <div>PreviewContent</div>
                </PrivateLayout>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("PreviewContent")).toBeInTheDocument();
  });

  // The whole-console gate. On the embedded surface any signed-in consumer user
  // can reach the shell by way of the adopted consumer session, so a role this
  // deployment does not serve has to be turned away even on a route that asks
  // for nothing in particular.
  describe("surface gate", () => {
    const renderUngatedRoute = () =>
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <PrivateLayout>
                    <div>ConsoleContent</div>
                  </PrivateLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

    it("denies a consumer-only role even on a route with no gates", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      userState.current = { id: 1, role: UserRole.LEARNER };

      renderUngatedRoute();

      expect(screen.queryByText("ConsoleContent")).not.toBeInTheDocument();
      expect(screen.getByText("This page is not accessible")).toBeInTheDocument();
    });

    it("denies INTERNAL on the standalone surface", () => {
      // The default build is standalone (BASE_URL "/"), where INTERNAL is not
      // an accepted role — its way in is the copy mounted at /admin.
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      userState.current = { id: 1, role: UserRole.INTERNAL };

      renderUngatedRoute();

      expect(screen.queryByText("ConsoleContent")).not.toBeInTheDocument();
      expect(screen.getByText("This page is not accessible")).toBeInTheDocument();
    });

    it("admits a super admin", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      userState.current = { id: 1, role: UserRole.SUPER_ADMIN };

      renderUngatedRoute();

      expect(screen.getByText("ConsoleContent")).toBeInTheDocument();
    });
  });
});
