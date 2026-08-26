import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";

import { LOCAL_STORAGE_KEYS, ROUTES, OrgToggle, Permissions } from "@constants";
import reportUploadReducer from "@reducer/reportUploadReducer";

import { PrivateLayout } from "../PrivateLayout";

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
  useGetUserQuery: vi.fn(() => ({ data: { id: 1 }, isLoading: false })),
  useGetPermissionsQuery: () => ({ data: [Permissions.EDIT_USER], isLoading: false }),
  useGetFeatureTogglesQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useGetCharacterLibraryEnabledQuery: vi.fn(() => ({ data: false, isLoading: false })),
  useGetUserPreferencesQuery: () => ({ data: undefined, isLoading: false }),
  useLazyGetUserQuery: () => [vi.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }],
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

  describe("requiredFeature", () => {
    it("grants access when the caller holds the toggle", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

      const { useGetFeatureTogglesQuery } = await import("@api");
      (useGetFeatureTogglesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        data: ["settings"],
        isLoading: false,
      });

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <PrivateLayout requiredFeature="settings">
                    <div>FeatureGrantedContent</div>
                  </PrivateLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText("FeatureGrantedContent")).toBeInTheDocument();
    });

    it("denies access when the caller lacks the toggle", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

      const { useGetFeatureTogglesQuery } = await import("@api");
      (useGetFeatureTogglesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <PrivateLayout requiredFeature="settings">
                    <div>GatedContent</div>
                  </PrivateLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.queryByText("GatedContent")).not.toBeInTheDocument();
      expect(screen.getByText("This page is not accessible")).toBeInTheDocument();
    });
  });

  describe("requiredOrgToggle (a tenant's own admins)", () => {
    const renderCharacterRoute = () =>
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route
                path="/protected"
                element={
                  // The mocked user holds no character_library per-user
                  // toggle, so only the org switch can let them through.
                  <PrivateLayout
                    requiredFeature="character_library"
                    requiredOrgToggle={OrgToggle.CHARACTER_LIBRARY}
                  >
                    <div>OrgGrantedContent</div>
                  </PrivateLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

    it("grants access when the org has the feature on", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      const { useGetCharacterLibraryEnabledQuery } = await import("@api");
      (useGetCharacterLibraryEnabledQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderCharacterRoute();

      expect(screen.getByText("OrgGrantedContent")).toBeInTheDocument();
    });

    it("denies access when the org has the feature off", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      const { useGetCharacterLibraryEnabledQuery } = await import("@api");
      (useGetCharacterLibraryEnabledQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        data: false,
        isLoading: false,
      });

      renderCharacterRoute();

      expect(screen.queryByText("OrgGrantedContent")).not.toBeInTheDocument();
      expect(screen.getByText("This page is not accessible")).toBeInTheDocument();
    });

    it("fails closed while the org read is still in flight", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      const { useGetCharacterLibraryEnabledQuery } = await import("@api");
      (useGetCharacterLibraryEnabledQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderCharacterRoute();

      expect(screen.queryByText("OrgGrantedContent")).not.toBeInTheDocument();
    });
  });

  /**
   * The barrier is deliberately inside the shell. A page that throws during
   * render used to unmount the whole console — blank white screen, no nav, no
   * way back but a manual reload.
   */
  describe("crash barrier around the routed page", () => {
    const Exploding = () => {
      throw new Error("Cannot read properties of undefined (reading 'some')");
    };

    // React and the boundary both log the caught error; keep the run readable.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    afterAll(() => consoleError.mockRestore());

    const renderExplodingRoute = () =>
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <PrivateLayout requiredPermissions={[Permissions.EDIT_USER]}>
                    <Exploding />
                  </PrivateLayout>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );

    it("keeps the shell and explains itself when the page throws", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      const { hasPermissions } = await import("@utils");
      (hasPermissions as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      renderExplodingRoute();

      // The admin still has somewhere to go — that's the whole point.
      expect(screen.getByText("Sidebar")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/this page stopped working/i)).toBeInTheDocument();
      // And the failure is named, not swallowed.
      expect(screen.getByText(/reading 'some'/)).toBeInTheDocument();
    });
  });
});
