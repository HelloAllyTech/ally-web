import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import {
  useLoginMutation,
  useSignupMutation,
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  useGenerateOTPMutation,
  useVerifyOTPMutation,
} from "../auth";
import { baseAPI } from "../baseAPI";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    AUTH: {
      LOGIN: "/auth/login",
      SIGNUP: "/auth/signup",
      GET_USER: "/auth/user",
      GENERATE_OTP: "/auth/generate-otp",
      VERIFY_OTP: "/auth/verify-otp",
    },
    AUTHORIZATION: {
      GET_PERMISSIONS: "/authorization/permissions",
    },
  },
  HttpMethod: {
    POST: "POST",
    GET: "GET",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
}));

// Mock types
vi.mock("@types", () => ({
  User: {},
  VerifyOTPRequest: {},
  VerifyOTPResponse: {},
  GenerateOTPRequest: {},
  GenerateOTPResponse: {},
  UserRole: {
    COUNSELLOR: "COUNSELOR",
    ADMIN: "ADMIN",
    LEARNER: "LEARNER",
  },
}));

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  });
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

describe("auth API", () => {
  it("should export correct hooks", () => {
    expect(useLoginMutation).toBeDefined();
    expect(useSignupMutation).toBeDefined();
    expect(useLazyGetUserQuery).toBeDefined();
    expect(useLazyGetPermissionsQuery).toBeDefined();
    expect(useGenerateOTPMutation).toBeDefined();
    expect(useVerifyOTPMutation).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useLoginMutation).toBe("function");
    expect(typeof useSignupMutation).toBe("function");
    expect(typeof useLazyGetUserQuery).toBe("function");
    expect(typeof useLazyGetPermissionsQuery).toBe("function");
    expect(typeof useGenerateOTPMutation).toBe("function");
    expect(typeof useVerifyOTPMutation).toBe("function");
  });

  it("should render login mutation hook without errors", () => {
    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render signup mutation hook without errors", () => {
    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render user query hook without errors", () => {
    const { result } = renderHook(() => useLazyGetUserQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render permissions query hook without errors", () => {
    const { result } = renderHook(() => useLazyGetPermissionsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render generate OTP mutation hook without errors", () => {
    const { result } = renderHook(() => useGenerateOTPMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render verify OTP mutation hook without errors", () => {
    const { result } = renderHook(() => useVerifyOTPMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should handle login trigger", () => {
    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ email: "test@example.com", password: "password" })).not.toThrow();
  });

  it("should handle signup trigger", () => {
    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        email: "test@example.com",
        password: "password",
        name: "Test User",
      }),
    ).not.toThrow();
  });

  it("should handle user query trigger", () => {
    const { result } = renderHook(() => useLazyGetUserQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger()).not.toThrow();
  });

  it("should handle permissions query trigger", () => {
    const { result } = renderHook(() => useLazyGetPermissionsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger()).not.toThrow();
  });

  it("should handle generate OTP trigger", () => {
    const { result } = renderHook(() => useGenerateOTPMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ phone: "1234567890" })).not.toThrow();
  });

  it("should handle verify OTP trigger", () => {
    const { result } = renderHook(() => useVerifyOTPMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ phone: "1234567890", otp: "123456" })).not.toThrow();
  });

  it("should handle verify OTP with email", () => {
    const { result } = renderHook(() => useVerifyOTPMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() =>
      trigger({
        phone: "1234567890",
        otp: "123456",
        email: "test@example.com",
      }),
    ).not.toThrow();
  });
});
