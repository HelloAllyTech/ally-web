import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import { useVerifyMagicLinkMutation } from "../auth";
import { baseAPI } from "../baseAPI";

vi.mock("@constants", () => ({
  ApiEndpoints: {
    AUTH: {
      MAGIC_LINK_VERIFY: "/auth/magic-link/verify",
    },
  },
  HttpMethod: {
    POST: "POST",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
    SIMULATION_CREDITS: "SimulationCredits",
    USER: "User",
    SCENARIO_PATHWAY_DETAILS: "ScenarioPathwayDetails",
  },
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
  },
}));

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={testStore}>{children}</Provider>
);

describe("Auth API Regression", () => {
  it("should not throw an error when verifying a magic link", () => {
    const { result } = renderHook(() => useVerifyMagicLinkMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() => trigger({ token: "test-magic-link-token" })).not.toThrow();
  });
});
