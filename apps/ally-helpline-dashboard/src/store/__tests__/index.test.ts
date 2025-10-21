import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach } from "vitest";

import { CallType } from "@constants";
import { Permissions } from "@constants";
import callsSlice from "@reducer/callsReducer";
import { updatePage, updateFilters } from "@reducer/callsReducer";
import userSlice from "@reducer/userReducer";
import {
  setUser,
  authenticate,
  setUserStatus,
  unauthenticate,
  setPermissions,
  setAvailableChatTypes,
} from "@reducer/userReducer";
import { UserRole, UserStatus, UserState, CallsState } from "@types";

import { store, type RootState, type AppDispatch } from "../index";

describe("Store Configuration", () => {
  let testStore: ReturnType<typeof configureStore<{ user: UserState; calls: CallsState }>>;

  beforeEach(() => {
    // Create a fresh store for each test without baseAPI to avoid mocking issues
    testStore = configureStore({
      reducer: {
        user: userSlice.reducer,
        calls: callsSlice.reducer,
      },
    });
  });

  describe("Store Structure", () => {
    it("should have the correct reducer structure", () => {
      const state = testStore.getState();

      expect(state).toHaveProperty("user");
      expect(state).toHaveProperty("calls");
    });

    it("should have the correct initial state for user slice", () => {
      const state = testStore.getState() as RootState;

      expect(state.user.isAuthenticated).toBe(false);
      expect(state.user.user).toBeNull();
      expect(state.user.userStatus).toBe(UserStatus.OFFLINE);
      expect(state.user.permissions).toEqual([]);
      expect(state.user.availableChatTypes).toEqual([]);
    });

    it("should have the correct initial state for calls slice", () => {
      const state = testStore.getState() as RootState;

      expect(state.calls.filters).toEqual({
        offset: 0,
        limit: 25, // CALL_LOGS_PAGINATION_LIMIT
      });
    });
  });

  describe("User Actions", () => {
    it("should handle authenticate action", () => {
      const initialState = testStore.getState() as RootState;
      expect(initialState.user.isAuthenticated).toBe(false);

      testStore.dispatch(authenticate());

      const newState = testStore.getState() as RootState;
      expect(newState.user.isAuthenticated).toBe(true);
    });

    it("should handle unauthenticate action", () => {
      // First authenticate
      testStore.dispatch(authenticate());
      expect(testStore.getState().user.isAuthenticated).toBe(true);

      // Then unauthenticate
      testStore.dispatch(unauthenticate());

      const newState = testStore.getState() as RootState;
      expect(newState.user.isAuthenticated).toBe(false);
    });

    it("should handle setUser action", () => {
      const mockUser = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      testStore.dispatch(setUser(mockUser));

      const newState = testStore.getState() as RootState;
      expect(newState.user.user).toEqual(mockUser);
    });

    it("should handle setUserStatus action", () => {
      testStore.dispatch(setUserStatus(UserStatus.AVAILABLE));

      const newState = testStore.getState() as RootState;
      expect(newState.user.userStatus).toBe(UserStatus.AVAILABLE);
    });

    it("should handle setPermissions action", () => {
      const mockPermissions = [Permissions.VIEW_NAVBAR_CALLS, Permissions.EDIT_SCENARIO_SESSION];

      testStore.dispatch(setPermissions(mockPermissions));

      const newState = testStore.getState() as RootState;
      expect(newState.user.permissions).toEqual(mockPermissions);
    });

    it("should handle setAvailableChatTypes action", () => {
      const mockChatTypes = [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT];

      testStore.dispatch(setAvailableChatTypes(mockChatTypes));

      const newState = testStore.getState() as RootState;
      expect(newState.user.availableChatTypes).toEqual(mockChatTypes);
    });
  });

  describe("Calls Actions", () => {
    it("should handle updatePage action", () => {
      const pageNumber = 2;

      testStore.dispatch(updatePage(pageNumber));

      const newState = testStore.getState() as RootState;
      expect(newState.calls.filters.page).toBe(pageNumber);
    });

    it("should handle updateFilters action", () => {
      const newFilters = {
        page: 1,
        offset: 10,
        limit: 20,
        sortBy: "createdAt",
        order: "DESC" as const,
        counsellorName: "John Doe",
        clientId: "123",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        minDuration: 60,
        maxDuration: 3600,
        minQualityScore: 1,
        maxQualityScore: 5,
        tags: "urgent,important",
      };

      testStore.dispatch(updateFilters(newFilters));

      const newState = testStore.getState() as RootState;
      expect(newState.calls.filters).toEqual(newFilters);
    });
  });

  describe("Store Integration", () => {
    it("should maintain state consistency across multiple actions", () => {
      const mockUser = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      // Perform multiple actions
      testStore.dispatch(authenticate());
      testStore.dispatch(setUser(mockUser));
      testStore.dispatch(setUserStatus(UserStatus.AVAILABLE));
      testStore.dispatch(setPermissions([Permissions.VIEW_NAVBAR_CALLS]));
      testStore.dispatch(setAvailableChatTypes([CallType.WEBRTC_CHAT]));
      testStore.dispatch(updatePage(2));
      testStore.dispatch(updateFilters({ offset: 20, limit: 10 }));

      const finalState = testStore.getState() as RootState;

      // Check user state
      expect(finalState.user.isAuthenticated).toBe(true);
      expect(finalState.user.user).toEqual(mockUser);
      expect(finalState.user.userStatus).toBe(UserStatus.AVAILABLE);
      expect(finalState.user.permissions).toEqual([Permissions.VIEW_NAVBAR_CALLS]);
      expect(finalState.user.availableChatTypes).toEqual([CallType.WEBRTC_CHAT]);

      // Check calls state (page is lost because updateFilters replaces the entire filters object)
      expect(finalState.calls.filters.page).toBeUndefined();
      expect(finalState.calls.filters.offset).toBe(20);
      expect(finalState.calls.filters.limit).toBe(10);
    });

    it("should handle state reset when unauthenticating", () => {
      // Set up initial state
      const mockUser = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      testStore.dispatch(authenticate());
      testStore.dispatch(setUser(mockUser));
      testStore.dispatch(setUserStatus(UserStatus.AVAILABLE));
      testStore.dispatch(setPermissions([Permissions.VIEW_NAVBAR_CALLS]));

      // Verify state is set
      let state = testStore.getState() as RootState;
      expect(state.user.isAuthenticated).toBe(true);
      expect(state.user.user).toEqual(mockUser);

      // Unauthenticate
      testStore.dispatch(unauthenticate());

      // Verify authentication is false, but other state remains
      state = testStore.getState() as RootState;
      expect(state.user.isAuthenticated).toBe(false);
      // Note: The actual implementation might clear user data on unauthenticate
      // This test reflects the current reducer behavior
    });
  });

  describe("Type Safety", () => {
    it("should have correct RootState type", () => {
      const state = testStore.getState();

      // TypeScript should infer the correct types
      expect(typeof state.user.isAuthenticated).toBe("boolean");
      expect(typeof state.user.userStatus).toBe("string");
      expect(Array.isArray(state.user.permissions)).toBe(true);
      expect(Array.isArray(state.user.availableChatTypes)).toBe(true);
      expect(typeof state.calls.filters).toBe("object");
    });

    it("should have correct AppDispatch type", () => {
      const dispatch: AppDispatch = testStore.dispatch;

      // These should not cause TypeScript errors
      dispatch(authenticate());
      dispatch(setUserStatus(UserStatus.AVAILABLE));
      dispatch(updatePage(1));
      dispatch(updateFilters({ offset: 0 }));
    });
  });
});

describe("Store Edge Cases", () => {
  it("should handle undefined/null values in actions", () => {
    const testStore = configureStore({
      reducer: {
        user: userSlice.reducer,
        calls: callsSlice.reducer,
      },
    });

    // Test with null user
    testStore.dispatch(setUser(null as any));
    expect(testStore.getState().user.user).toBeNull();

    // Test with empty permissions
    testStore.dispatch(setPermissions([]));
    expect(testStore.getState().user.permissions).toEqual([]);

    // Test with empty chat types
    testStore.dispatch(setAvailableChatTypes([]));
    expect(testStore.getState().user.availableChatTypes).toEqual([]);
  });

  it("should handle large filter objects", () => {
    const testStore = configureStore({
      reducer: {
        user: userSlice.reducer,
        calls: callsSlice.reducer,
      },
    });

    const largeFilters = {
      page: 1,
      offset: 0,
      limit: 100,
      sortBy: "createdAt",
      order: "DESC" as const,
      counsellorName: "A".repeat(1000),
      clientId: "123",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      minDuration: 0,
      maxDuration: 999999,
      minQualityScore: 0,
      maxQualityScore: 10,
      tags: "tag1,tag2,tag3,tag4,tag5",
    };

    testStore.dispatch(updateFilters(largeFilters));

    const state = testStore.getState() as RootState;
    expect(state.calls.filters).toEqual(largeFilters);
  });
});
