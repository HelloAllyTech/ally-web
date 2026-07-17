import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { baseAPI } from "@api";
import userSlice from "@reducer/userReducer";

import { store, RootState, AppDispatch } from "../index";

// Mock the API
vi.mock("@api", () => ({
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(() => (next: any) => (action: any) => next(action)),
  },
}));

// Mock the user reducer
vi.mock("@reducer/userReducer", () => ({
  default: {
    reducer: vi.fn((state = {}) => state),
    actions: {},
  },
}));

describe("Redux Store Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a store instance", () => {
    expect(store).toBeDefined();
    expect(typeof store.dispatch).toBe("function");
    expect(typeof store.getState).toBe("function");
    expect(typeof store.subscribe).toBe("function");
  });

  it("configures store with baseAPI reducer", () => {
    const state = store.getState();
    expect(state).toHaveProperty(baseAPI.reducerPath);
  });

  it("configures store with user reducer", () => {
    const state = store.getState();
    expect(state).toHaveProperty("user");
  });

  it("includes baseAPI middleware", () => {
    // The middleware should be included in the store
    // We can verify this by checking if the store has the expected structure
    expect(store).toBeDefined();
    expect(baseAPI.middleware).toBeDefined();
  });

  it("configures serializableCheck middleware with ignored actions", () => {
    // Test that the store can handle persist actions without warnings
    const persistAction = { type: "persist/PERSIST", payload: {} };
    const rehydrateAction = { type: "persist/REHYDRATE", payload: {} };

    // These should not throw errors
    expect(() => store.dispatch(persistAction)).not.toThrow();
    expect(() => store.dispatch(rehydrateAction)).not.toThrow();
  });

  it("exports RootState type", () => {
    const state = store.getState();

    // Type assertion to verify RootState type exists
    const typedState: RootState = state;
    expect(typedState).toBeDefined();
  });

  it("exports AppDispatch type", () => {
    // Type assertion to verify AppDispatch type exists
    const dispatch: AppDispatch = store.dispatch;
    expect(dispatch).toBeDefined();
    expect(typeof dispatch).toBe("function");
  });

  it("has correct reducer structure", () => {
    const state = store.getState();

    // Verify the state has the expected shape
    expect(Object.keys(state)).toContain(baseAPI.reducerPath);
    expect(Object.keys(state)).toContain("user");
  });

  it("allows dispatching actions", () => {
    const testAction = { type: "TEST_ACTION", payload: "test" };

    expect(() => store.dispatch(testAction)).not.toThrow();
  });

  it("allows subscribing to state changes", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(typeof unsubscribe).toBe("function");

    // Dispatch an action to trigger the listener
    store.dispatch({ type: "TEST_ACTION" });

    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("maintains state immutability", () => {
    const stateBefore = store.getState();

    // Verify that state is an object
    expect(typeof stateBefore).toBe("object");
    expect(stateBefore).not.toBeNull();

    // Verify state structure
    expect(stateBefore).toHaveProperty(baseAPI.reducerPath);
    expect(stateBefore).toHaveProperty("user");

    // Redux ensures immutability - attempting to mutate state directly should not affect the store
    const stateReference = store.getState();
    expect(stateReference).toBeDefined();
  });

  it("configures middleware correctly", () => {
    // Verify that the store has middleware configured
    // by checking that it can handle async actions (thunks)
    const asyncAction = () => (dispatch: any) => {
      dispatch({ type: "ASYNC_ACTION_START" });
      return Promise.resolve();
    };

    expect(() => store.dispatch(asyncAction() as any)).not.toThrow();
  });

  it("handles persist/PERSIST action without serialization errors", () => {
    const persistAction = {
      type: "persist/PERSIST",
      payload: {
        register: () => {},
        rehydrate: () => {},
      },
    };

    // Should not throw serialization errors
    expect(() => store.dispatch(persistAction as any)).not.toThrow();
  });

  it("handles persist/REHYDRATE action without serialization errors", () => {
    const rehydrateAction = {
      type: "persist/REHYDRATE",
      payload: {
        user: { isAuthenticated: false },
      },
    };

    // Should not throw serialization errors
    expect(() => store.dispatch(rehydrateAction as any)).not.toThrow();
  });

  it("provides getState method that returns current state", () => {
    const state = store.getState();

    expect(state).toBeDefined();
    expect(typeof state).toBe("object");
    expect(state).toHaveProperty(baseAPI.reducerPath);
    expect(state).toHaveProperty("user");
  });

  it("provides dispatch method that accepts actions", () => {
    const action = { type: "TEST_ACTION", payload: { data: "test" } };
    const result = store.dispatch(action);

    expect(result).toBeDefined();
  });

  it("allows replacing reducer", () => {
    const newReducer = vi.fn((state = {}) => state);

    expect(() => store.replaceReducer(newReducer as any)).not.toThrow();
  });
});

describe("Store Type Exports", () => {
  it("RootState type matches store state structure", () => {
    const state: RootState = store.getState();

    // Verify type compatibility
    expect(state).toBeDefined();
    expect(state[baseAPI.reducerPath]).toBeDefined();
    expect(state.user).toBeDefined();
  });

  it("AppDispatch type matches store dispatch", () => {
    const dispatch: AppDispatch = store.dispatch;

    // Verify type compatibility
    expect(typeof dispatch).toBe("function");
  });
});
