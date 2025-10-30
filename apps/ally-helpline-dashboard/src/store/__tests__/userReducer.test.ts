import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach } from "vitest";

import { CallType } from "@constants";
import { Permissions } from "@constants";
import userSlice, {
  setUser,
  authenticate,
  unauthenticate,
  setPermissions,
  setAvailableChatTypes,
} from "@reducer/userReducer";
import { UserRole, User, UserState } from "@types";

describe("User Reducer", () => {
  let testStore: ReturnType<typeof configureStore<{ user: UserState }>>;

  beforeEach(() => {
    testStore = configureStore({
      reducer: {
        user: userSlice.reducer,
      },
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = testStore.getState();

      expect(state.user.isAuthenticated).toBe(false);
      expect(state.user.user).toBeNull();
      expect(state.user.permissions).toEqual([]);
      expect(state.user.availableChatTypes).toEqual([]);
    });
  });

  describe("Authentication Actions", () => {
    it("should handle authenticate action", () => {
      const initialState = testStore.getState();
      expect(initialState.user.isAuthenticated).toBe(false);

      testStore.dispatch(authenticate());

      const newState = testStore.getState();
      expect(newState.user.isAuthenticated).toBe(true);
    });

    it("should handle unauthenticate action", () => {
      // First authenticate
      testStore.dispatch(authenticate());
      expect(testStore.getState().user.isAuthenticated).toBe(true);

      // Then unauthenticate
      testStore.dispatch(unauthenticate());

      const newState = testStore.getState();
      expect(newState.user.isAuthenticated).toBe(false);
    });

    it("should handle multiple authenticate/unauthenticate cycles", () => {
      // Authenticate
      testStore.dispatch(authenticate());
      expect(testStore.getState().user.isAuthenticated).toBe(true);

      // Unauthenticate
      testStore.dispatch(unauthenticate());
      expect(testStore.getState().user.isAuthenticated).toBe(false);

      // Authenticate again
      testStore.dispatch(authenticate());
      expect(testStore.getState().user.isAuthenticated).toBe(true);
    });
  });

  describe("User Data Actions", () => {
    it("should handle setUser with valid user data", () => {
      const mockUser: User = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      testStore.dispatch(setUser(mockUser));

      const newState = testStore.getState();
      expect(newState.user.user).toEqual(mockUser);
    });

    it("should handle setUser with null", () => {
      testStore.dispatch(setUser(null as any));

      const newState = testStore.getState();
      expect(newState.user.user).toBeNull();
    });

    it("should handle setUser with different user roles", () => {
      const adminUser: User = {
        email: "admin@example.com",
        id: 2,
        name: "Admin User",
        role: UserRole.ADMIN,
        userId: 2,
      };

      testStore.dispatch(setUser(adminUser));

      const newState = testStore.getState();
      expect(newState.user.user).toEqual(adminUser);
      expect(newState.user.user?.role).toBe(UserRole.ADMIN);
    });

    it("should handle setUser with learner role", () => {
      const learnerUser: User = {
        email: "learner@example.com",
        id: 3,
        name: "Learner User",
        role: UserRole.LEARNER,
        userId: 3,
      };

      testStore.dispatch(setUser(learnerUser));

      const newState = testStore.getState();
      expect(newState.user.user).toEqual(learnerUser);
      expect(newState.user.user?.role).toBe(UserRole.LEARNER);
    });
  });

  describe("Permissions Actions", () => {
    it("should handle setPermissions with empty array", () => {
      testStore.dispatch(setPermissions([]));

      const newState = testStore.getState();
      expect(newState.user.permissions).toEqual([]);
    });

    it("should handle setPermissions with single permission", () => {
      const permissions = [Permissions.VIEW_CALL_LOGS];

      testStore.dispatch(setPermissions(permissions));

      const newState = testStore.getState();
      expect(newState.user.permissions).toEqual(permissions);
    });

    it("should handle setPermissions with multiple permissions", () => {
      const permissions = [Permissions.VIEW_CALL_LOGS, Permissions.EDIT_SCENARIO_SESSION];

      testStore.dispatch(setPermissions(permissions));

      const newState = testStore.getState();
      expect(newState.user.permissions).toEqual(permissions);
    });

    it("should handle setPermissions with all permissions", () => {
      const allPermissions = Object.values(Permissions) as Permissions[];

      testStore.dispatch(setPermissions(allPermissions));

      const newState = testStore.getState();
      expect(newState.user.permissions).toEqual(allPermissions);
    });
  });

  describe("Available Chat Types Actions", () => {
    it("should handle setAvailableChatTypes with empty array", () => {
      testStore.dispatch(setAvailableChatTypes([]));

      const newState = testStore.getState();
      expect(newState.user.availableChatTypes).toEqual([]);
    });

    it("should handle setAvailableChatTypes with single chat type", () => {
      const chatTypes = [CallType.WEBRTC_CHAT];

      testStore.dispatch(setAvailableChatTypes(chatTypes));

      const newState = testStore.getState();
      expect(newState.user.availableChatTypes).toEqual(chatTypes);
    });

    it("should handle setAvailableChatTypes with multiple chat types", () => {
      const chatTypes = [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT];

      testStore.dispatch(setAvailableChatTypes(chatTypes));

      const newState = testStore.getState();
      expect(newState.user.availableChatTypes).toEqual(chatTypes);
    });

    it("should handle setAvailableChatTypes with all chat types", () => {
      const allChatTypes = Object.values(CallType) as CallType[];

      testStore.dispatch(setAvailableChatTypes(allChatTypes));

      const newState = testStore.getState();
      expect(newState.user.availableChatTypes).toEqual(allChatTypes);
    });
  });

  describe("Combined Actions", () => {
    it("should handle complete user setup", () => {
      const mockUser: User = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      const permissions = [Permissions.VIEW_CALL_LOGS, Permissions.EDIT_SCENARIO_SESSION];
      const chatTypes = [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT];

      // Perform all actions
      testStore.dispatch(authenticate());
      testStore.dispatch(setUser(mockUser));
      testStore.dispatch(setPermissions(permissions));
      testStore.dispatch(setAvailableChatTypes(chatTypes));

      const finalState = testStore.getState();

      expect(finalState.user.isAuthenticated).toBe(true);
      expect(finalState.user.user).toEqual(mockUser);
      expect(finalState.user.permissions).toEqual(permissions);
      expect(finalState.user.availableChatTypes).toEqual(chatTypes);
    });

    it("should handle user logout scenario", () => {
      // Set up authenticated user
      const mockUser: User = {
        email: "test@example.com",
        id: 1,
        name: "Test User",
        role: UserRole.COUNSELLOR,
        userId: 1,
      };

      testStore.dispatch(authenticate());
      testStore.dispatch(setUser(mockUser));
      testStore.dispatch(setPermissions([Permissions.VIEW_CALL_LOGS]));

      // Verify authenticated state
      let state = testStore.getState();
      expect(state.user.isAuthenticated).toBe(true);
      expect(state.user.user).toEqual(mockUser);

      // Logout
      testStore.dispatch(unauthenticate());

      // Verify logout state
      state = testStore.getState();
      expect(state.user.isAuthenticated).toBe(false);
      // Note: User data might remain depending on implementation
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined values gracefully", () => {
      testStore.dispatch(setUser(undefined as any));
      testStore.dispatch(setPermissions(undefined as any));
      testStore.dispatch(setAvailableChatTypes(undefined as any));

      const state = testStore.getState();
      expect(state.user.user).toBeUndefined();
      expect(state.user.permissions).toBeUndefined();
      expect(state.user.availableChatTypes).toBeUndefined();
    });

    it("should handle large permission arrays", () => {
      const largePermissions = Array(1000).fill(Permissions.VIEW_CALL_LOGS);

      testStore.dispatch(setPermissions(largePermissions));

      const newState = testStore.getState();
      expect(newState.user.permissions).toEqual(largePermissions);
    });

    it("should handle large chat type arrays", () => {
      const largeChatTypes = Array(100).fill(CallType.WEBRTC_CHAT);

      testStore.dispatch(setAvailableChatTypes(largeChatTypes));

      const newState = testStore.getState();
      expect(newState.user.availableChatTypes).toEqual(largeChatTypes);
    });
  });
});
