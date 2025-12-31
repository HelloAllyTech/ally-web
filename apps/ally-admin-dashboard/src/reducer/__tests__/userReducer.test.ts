import { describe, it, expect } from "vitest";

import { CallType, Permissions, UserRole } from "@constants";
import userSlice, {
  authenticate,
  unauthenticate,
  setUser,
  setUserStatus,
  setPermissions,
  setAvailableChatTypes,
} from "@reducer/userReducer";
import { UserAvailabilityStatus } from "@types";

describe("userReducer", () => {
  it("should return the initial state when passed an unknown action", () => {
    const state = userSlice.reducer(undefined as any, { type: "UNKNOWN_ACTION" } as any);

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.userStatus).toBe(UserAvailabilityStatus.OFFLINE);
    expect(state.permissions).toEqual([]);
    expect(state.availableChatTypes).toEqual([]);
  });

  it("should set isAuthenticated to true on authenticate", () => {
    const initialState = userSlice.getInitialState();
    const nextState = userSlice.reducer(initialState, authenticate());

    expect(nextState.isAuthenticated).toBe(true);
  });

  it("should set isAuthenticated to false on unauthenticate", () => {
    const authenticatedState = {
      ...userSlice.getInitialState(),
      isAuthenticated: true,
    };
    const nextState = userSlice.reducer(authenticatedState, unauthenticate());

    expect(nextState.isAuthenticated).toBe(false);
  });

  it("should set the user on setUser", () => {
    const initialState = userSlice.getInitialState();
    const payload = {
      email: "jane.doe@example.com",
      id: 1,
      name: "Jane Doe",
      role: UserRole.ADMIN,
      userId: 1001,
    };

    const nextState = userSlice.reducer(initialState, setUser(payload));

    expect(nextState.user).toEqual(payload);
  });

  it("should set the user status on setUserStatus", () => {
    const initialState = userSlice.getInitialState();
    const nextState = userSlice.reducer(
      initialState,
      setUserStatus(UserAvailabilityStatus.AVAILABLE),
    );

    expect(nextState.userStatus).toBe(UserAvailabilityStatus.AVAILABLE);
  });

  it("should set permissions on setPermissions", () => {
    const initialState = userSlice.getInitialState();
    const permissions = [Permissions.EDIT_SCENARIO, Permissions.EDIT_USER];
    const nextState = userSlice.reducer(initialState, setPermissions(permissions));

    expect(nextState.permissions).toEqual(permissions);
  });

  it("should set available chat types on setAvailableChatTypes", () => {
    const initialState = userSlice.getInitialState();
    const chatTypes = [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT];
    const nextState = userSlice.reducer(initialState, setAvailableChatTypes(chatTypes));

    expect(nextState.availableChatTypes).toEqual(chatTypes);
  });
});
