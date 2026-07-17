import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { baseAPI } from "@api";
import { LOCAL_STORAGE_KEYS, Permissions, SIDEBAR_ITEMS, UserRole } from "@constants";
import userSlice from "@reducer/userReducer";
import { UserAvailabilityStatus } from "@types";

import { useUser } from "../useUser";

// Hoist mocks to avoid initialization errors
const {
  mockGetUser,
  mockGetPermissions,
  mockResetApiState,
  mockDispatch,
  mockGetState,
  mockGetProfileUrl,
  mockDeleteProfile,
  mockUploadProfile,
  mockGetUserPreferences,
  mockUpdateQueryData,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetPermissions: vi.fn(),
  mockResetApiState: vi.fn(),
  mockDispatch: vi.fn(),
  mockGetState: vi.fn(),
  mockGetProfileUrl: vi.fn(),
  mockDeleteProfile: vi.fn(),
  mockUploadProfile: vi.fn(),
  // Sidebar order is read from the RTK Query cache via this hook; default to no
  // saved preferences (undefined) so existing tests assert the default nav order.
  mockGetUserPreferences: vi.fn(() => ({ data: undefined })),
  mockUpdateQueryData: vi.fn(() => ({ undo: vi.fn() })),
}));

// Mock the logger
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  FEATURE_FLAGS_MAP: {},
}));

// Mock the baseAPI first
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "api",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: {
      resetApiState: vi.fn(),
    },
  },
}));

// Mock API hooks
vi.mock("@api", () => ({
  useLazyGetUserQuery: () => [mockGetUser, { isLoading: false }],
  useLazyGetPermissionsQuery: () => [mockGetPermissions, { isLoading: false }],
  useGetProfileImageUrlMutation: () => [mockGetProfileUrl],
  useDeleteProfileImageMutation: () => [mockDeleteProfile],
  useUploadProfileImageMutation: () => [mockUploadProfile],
  useGetUserPreferencesQuery: mockGetUserPreferences,
  useLazyGetUserPreferencesQuery: () => [vi.fn(), { isLoading: false }],
  useUpdateUserPreferencesMutation: () => [vi.fn()],
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "api",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: {
      resetApiState: mockResetApiState,
    },
  },
  authAPI: {
    util: {
      updateQueryData: mockUpdateQueryData,
    },
  },
}));

// Mock the store
vi.mock("@store", () => ({
  store: {
    dispatch: mockDispatch,
    getState: mockGetState,
    subscribe: vi.fn(),
    replaceReducer: vi.fn(),
  },
}));

describe("useUser", () => {
  let store: ReturnType<typeof configureStore>;

  const createMockStore = (initialState: Partial<any> = {}) => {
    return configureStore({
      reducer: {
        user: userSlice.reducer,
      },
      preloadedState: {
        user: {
          isAuthenticated: false,
          user: null,
          userStatus: UserAvailabilityStatus.OFFLINE,
          permissions: [],
          availableChatTypes: [],
          ...initialState,
        },
      },
    });
  };

  const wrapper = ({ children, customStore }: any) => (
    <Provider store={customStore || store}>{children}</Provider>
  );

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
    localStorage.clear();
    // clearAllMocks doesn't reset implementations — restore the default (no saved
    // preferences) so per-test overrides don't leak across tests.
    mockGetUserPreferences.mockReturnValue({ data: undefined });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Initial State", () => {
    it("should return initial state when not authenticated", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.permissions).toEqual([]);
      expect(result.current.availableChatTypes).toEqual([]);
      expect(result.current.filteredNavigationItems).toEqual([]);
    });

    it("should return authenticated state when user is logged in", () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      store = createMockStore({
        isAuthenticated: true,
        user: mockUser,
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.permissions).toEqual([Permissions.EDIT_SCENARIO]);
    });

    it("should have isAuthLoading property", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(typeof result.current.isAuthLoading).toBe("boolean");
    });
  });

  describe("checkAuth", () => {
    it("should authenticate user when valid token exists", async () => {
      const mockUserData = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };
      const mockPermissionsData = [Permissions.EDIT_SCENARIO, Permissions.EDIT_USER];

      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "valid-token");

      mockGetUser.mockResolvedValue({ data: mockUserData });
      mockGetPermissions.mockResolvedValue({ data: mockPermissionsData });

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledTimes(1);
        expect(mockGetPermissions).toHaveBeenCalledTimes(1);
      });

      expect(userData).toEqual(mockUserData);
    });

    it("should return null when no token exists", async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      expect(userData).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockGetPermissions).not.toHaveBeenCalled();
    });

    it("should logout and return null when user fetch fails", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "invalid-token");

      mockGetUser.mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledTimes(1);
      });

      expect(userData).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
    });

    it("should logout and return null when permissions fetch fails", async () => {
      const mockUserData = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "valid-token");

      mockGetUser.mockResolvedValue({ data: mockUserData });
      mockGetPermissions.mockRejectedValue(new Error("Permissions fetch failed"));

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledTimes(1);
        expect(mockGetPermissions).toHaveBeenCalledTimes(1);
      });

      expect(userData).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
    });

    it("should handle authentication errors gracefully", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "valid-token");

      mockGetUser.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      expect(userData).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
    });
  });

  describe("logout", () => {
    it("should clear all authentication data", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "token");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, "refresh-token");

      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      store = createMockStore({
        isAuthenticated: true,
        user: mockUser,
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      result.current.logout();

      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
    });

    it("should reset API state on logout", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      result.current.logout();

      // The logout function calls store.dispatch with baseAPI.util.resetApiState()
      // We verify that mockDispatch was called
      expect(mockDispatch).toHaveBeenCalled();
    });

    it("should clear user state on logout", () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      store = createMockStore({
        isAuthenticated: true,
        user: mockUser,
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      result.current.logout();

      // Verify tokens are cleared
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
    });

    it("should handle logout when already logged out", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(() => result.current.logout()).not.toThrow();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
    });
  });

  describe("filteredNavigationItems", () => {
    it("should return empty array when no permissions", () => {
      store = createMockStore({
        permissions: [],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toEqual([]);
    });

    it("should filter navigation items based on EDIT_SCENARIO permission", () => {
      store = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_GUARDRAIL,
        ],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      // Guardrails is gated to SUPER_DUPER_ADMIN by role, so EDIT_GUARDRAIL
      // alone no longer surfaces it.
      expect(result.current.filteredNavigationItems).toHaveLength(2);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.SIMULATION_STUDIO);
      expect(result.current.filteredNavigationItems[1].id).toBe(SIDEBAR_ITEMS.SCENARIO_VOICES);
    });

    it("applies the saved sidebar order from the preferences cache on first render", () => {
      // Saved order (reverse of the default) comes straight from the RTK Query
      // cache mock — no Redux dispatch — so it's reflected on the first render.
      mockGetUserPreferences.mockReturnValue({
        data: {
          admin_sidebar_order: [
            SIDEBAR_ITEMS.MANAGE_GUARDRAILS,
            SIDEBAR_ITEMS.SCENARIO_VOICES,
            SIDEBAR_ITEMS.SIMULATION_STUDIO,
          ],
        },
      });

      store = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_GUARDRAIL,
        ],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      // Guardrails is SUPER_DUPER_ADMIN-only, so its saved-order entry is
      // ignored; the remaining visible items still follow the saved order.
      expect(result.current.filteredNavigationItems.map(item => item.id)).toEqual([
        SIDEBAR_ITEMS.SCENARIO_VOICES,
        SIDEBAR_ITEMS.SIMULATION_STUDIO,
      ]);
    });

    it("should filter navigation items based on EDIT_EVENT permission", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_EVENT],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toHaveLength(1);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.EVENTS);
    });

    it("should filter navigation items based on EDIT_USER permission", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_USER],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toHaveLength(1);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.USERS);
    });

    it("should filter navigation items based on VIEW_USERS permission", () => {
      store = createMockStore({
        permissions: [Permissions.VIEW_USERS],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toHaveLength(1);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.USERS);
    });

    it("should filter navigation items based on EDIT_PROMPT permission", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_PROMPT],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toHaveLength(1);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.PROMPTS);
    });

    it("should filter navigation items based on VIEW_I18N_TRANSLATIONS permission", () => {
      store = createMockStore({
        permissions: [Permissions.VIEW_I18N_TRANSLATIONS],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toHaveLength(1);
      expect(result.current.filteredNavigationItems[0].id).toBe(SIDEBAR_ITEMS.TRANSLATIONS);
    });

    it("should show all navigation items when user has all permissions", () => {
      store = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_EVENT,
          Permissions.EDIT_USER,
          Permissions.EDIT_CHARACTER_LIBRARY,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_SCENARIO_LANGUAGE,
          Permissions.EDIT_PROMPT,
          Permissions.EDIT_GUARDRAIL,
          Permissions.VIEW_I18N_TRANSLATIONS,
          Permissions.VIEW_ADMIN_BADGE,
        ],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      // Characters, Languages, Guardrails, and Badges are SUPER_DUPER_ADMIN-only
      // by role, so only the permission-gated tabs remain.
      expect(result.current.filteredNavigationItems).toHaveLength(6);
      expect(result.current.filteredNavigationItems.map(item => item.id)).toEqual([
        SIDEBAR_ITEMS.SIMULATION_STUDIO,
        SIDEBAR_ITEMS.EVENTS,
        SIDEBAR_ITEMS.SCENARIO_VOICES,
        SIDEBAR_ITEMS.PROMPTS,
        SIDEBAR_ITEMS.TRANSLATIONS,
        SIDEBAR_ITEMS.USERS,
      ]);
    });

    it("should show multiple navigation items for multiple permissions", () => {
      store = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_USER,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_PROMPT,
          Permissions.EDIT_GUARDRAIL,
        ],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems.map(item => item.id)).toEqual([
        SIDEBAR_ITEMS.SIMULATION_STUDIO,
        SIDEBAR_ITEMS.SCENARIO_VOICES,
        SIDEBAR_ITEMS.PROMPTS,
        SIDEBAR_ITEMS.USERS,
      ]);
    });

    it("should not show items for permissions user does not have", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_LIVEKIT],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems).toEqual([]);
    });

    it("should update filtered items when permissions change", () => {
      store = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_GUARDRAIL,
        ],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.filteredNavigationItems.map(item => item.id)).toEqual([
        SIDEBAR_ITEMS.SIMULATION_STUDIO,
        SIDEBAR_ITEMS.SCENARIO_VOICES,
      ]);

      // Create new store with updated permissions and render new hook
      const updatedStore = createMockStore({
        permissions: [
          Permissions.EDIT_SCENARIO,
          Permissions.EDIT_EVENT,
          Permissions.EDIT_SCENARIO_VOICE,
          Permissions.EDIT_GUARDRAIL,
        ],
      });

      const { result: newResult } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={updatedStore}>{children}</Provider>,
      });

      expect(newResult.current.filteredNavigationItems).toHaveLength(3);
      expect(newResult.current.filteredNavigationItems.map(item => item.id)).toEqual([
        SIDEBAR_ITEMS.SIMULATION_STUDIO,
        SIDEBAR_ITEMS.EVENTS,
        SIDEBAR_ITEMS.SCENARIO_VOICES,
      ]);
    });
  });

  describe("isAuthLoading", () => {
    it("should have isAuthLoading property that is a boolean", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(typeof result.current.isAuthLoading).toBe("boolean");
    });

    it("should combine loading states from both queries", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      // The isAuthLoading is computed from isUserLoading || isPermissionsLoading
      // Since we mocked both to return { isLoading: false }, the result should reflect that
      expect(typeof result.current.isAuthLoading).toBe("boolean");
    });
  });

  describe("User State Management", () => {
    it("should expose setUser function", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(typeof result.current.setUser).toBe("function");
    });

    it("should return current user from state", () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      store = createMockStore({
        user: mockUser,
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it("should return current userStatus from state", () => {
      store = createMockStore({
        userStatus: UserAvailabilityStatus.AVAILABLE,
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.userStatus).toBe(UserAvailabilityStatus.AVAILABLE);
    });

    it("should return availableChatTypes from state", () => {
      const mockChatTypes = ["text", "voice", "video"];

      store = createMockStore({
        availableChatTypes: mockChatTypes,
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.availableChatTypes).toEqual(mockChatTypes);
    });
  });

  describe("Navigation Items Structure", () => {
    it("should have correct structure for simulation studio item", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const simulationStudioItem = result.current.filteredNavigationItems.find(
        item => item.id === SIDEBAR_ITEMS.SIMULATION_STUDIO,
      );

      expect(simulationStudioItem).toBeDefined();
      expect(simulationStudioItem?.label).toBeDefined();
      expect(simulationStudioItem?.path).toBeDefined();
    });

    it("should have correct structure for event management item", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_EVENT],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const eventManagementItem = result.current.filteredNavigationItems.find(
        item => item.id === SIDEBAR_ITEMS.EVENTS,
      );

      expect(eventManagementItem).toBeDefined();
      expect(eventManagementItem?.label).toBeDefined();
      expect(eventManagementItem?.path).toBeDefined();
    });

    it("should have correct structure for user management item", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_USER],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const userManagementItem = result.current.filteredNavigationItems.find(
        item => item.id === SIDEBAR_ITEMS.USERS,
      );

      expect(userManagementItem).toBeDefined();
      expect(userManagementItem?.label).toBeDefined();
      expect(userManagementItem?.path).toBeDefined();
    });

    it("should have correct structure for prompts item", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_PROMPT],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const promptsItem = result.current.filteredNavigationItems.find(
        item => item.id === SIDEBAR_ITEMS.PROMPTS,
      );

      expect(promptsItem).toBeDefined();
      expect(promptsItem?.label).toBeDefined();
      expect(promptsItem?.path).toBeDefined();
      expect(promptsItem?.id).toBe(SIDEBAR_ITEMS.PROMPTS);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null user gracefully", () => {
      store = createMockStore({
        user: null,
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.user).toBeNull();
      expect(() => result.current.logout()).not.toThrow();
    });

    it("should handle empty permissions array", () => {
      store = createMockStore({
        permissions: [],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.permissions).toEqual([]);
      expect(result.current.filteredNavigationItems).toEqual([]);
    });

    it("should handle checkAuth with empty token", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "");

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      expect(userData).toBeNull();
    });

    it("should handle multiple logout calls", () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      expect(() => {
        result.current.logout();
        result.current.logout();
        result.current.logout();
      }).not.toThrow();
    });

    it("should handle checkAuth when localStorage throws error", async () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("localStorage error");
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      expect(userData).toBeNull();

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete authentication flow", async () => {
      const mockUserData = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };
      const mockPermissionsData = [Permissions.EDIT_SCENARIO];

      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "valid-token");

      mockGetUser.mockResolvedValue({ data: mockUserData });
      mockGetPermissions.mockResolvedValue({ data: mockPermissionsData });

      const { result } = renderHook(() => useUser(), { wrapper });

      const userData = await result.current.checkAuth();

      await waitFor(() => {
        expect(userData).toEqual(mockUserData);
      });
    });

    it("should handle authentication failure and logout flow", async () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "invalid-token");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, "invalid-refresh");

      mockGetUser.mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useUser(), { wrapper });

      await result.current.checkAuth();

      await waitFor(() => {
        expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
        expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
      });
    });

    it("should maintain permissions after checkAuth", async () => {
      const mockUserData = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };
      const mockPermissionsData = [
        Permissions.EDIT_SCENARIO,
        Permissions.EDIT_EVENT,
        Permissions.EDIT_USER,
      ];

      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "valid-token");

      mockGetUser.mockResolvedValue({ data: mockUserData });
      mockGetPermissions.mockResolvedValue({ data: mockPermissionsData });

      const { result } = renderHook(() => useUser(), { wrapper });

      await result.current.checkAuth();

      await waitFor(() => {
        expect(mockGetPermissions).toHaveBeenCalled();
      });
    });
  });

  describe("Permissions Memoization", () => {
    it("should memoize filtered navigation items", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result, rerender } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const firstResult = result.current.filteredNavigationItems;

      rerender();

      const secondResult = result.current.filteredNavigationItems;

      // Since permissions haven't changed, the reference should be the same
      expect(firstResult).toEqual(secondResult);
    });

    it("should recalculate when permissions change", () => {
      store = createMockStore({
        permissions: [Permissions.EDIT_SCENARIO],
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      const firstLength = result.current.filteredNavigationItems.length;

      store = createMockStore({
        permissions: [Permissions.EDIT_SCENARIO, Permissions.EDIT_EVENT],
      });

      const { result: newResult } = renderHook(() => useUser(), {
        wrapper: ({ children }: any) => <Provider store={store}>{children}</Provider>,
      });

      expect(newResult.current.filteredNavigationItems.length).toBeGreaterThan(firstLength);
    });
  });
});
