
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect } from "vitest";

import { useVerifyMagicLinkMutation } from "../auth";
import { baseAPI } from "../baseAPI";

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseAPI.middleware),
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={testStore}>{children}</Provider>
);

describe("auth API regression tests", () => {
  it("should not throw when triggering verifyMagicLink", () => {
    const { result } = renderHook(() => useVerifyMagicLinkMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() => trigger({ token: "test-token" })).not.toThrow();
  });
});
