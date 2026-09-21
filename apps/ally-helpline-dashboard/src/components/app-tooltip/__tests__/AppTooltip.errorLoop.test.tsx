import React from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TooltipLocation } from "@constants";

vi.mock("@constants", () => ({
  TooltipLocation: { LOGIN_BUTTON: "login_button" },
}));

// Stands in for the real getActiveTooltips endpoint (see ../../../api/tooltips.ts)
// with a query that always errors, built with the real `createApi` machinery
// rather than a mocked hook — so the test exercises RTK Query's actual
// mount/refetch decision instead of a stand-in for it. Exposes the attempt
// spy and a Provider so the test below never has to touch RTK Query
// internals directly.
vi.mock("@api", async () => {
  const React = await import("react");
  const { configureStore } = await import("@reduxjs/toolkit");
  const { createApi, fakeBaseQuery } = await import("@reduxjs/toolkit/query/react");
  const { Provider } = await import("react-redux");
  const { vi: vitestVi } = await import("vitest");

  const attempt = vitestVi.fn(async () => ({ error: { status: 500, data: "boom" } }));

  const testTooltipsApi = createApi({
    reducerPath: "testTooltipsApi",
    baseQuery: fakeBaseQuery(),
    endpoints: (builder: any) => ({
      getActiveTooltips: builder.query({ queryFn: attempt }),
    }),
  });

  const store = configureStore({
    reducer: { [testTooltipsApi.reducerPath]: testTooltipsApi.reducer },
    middleware: (getDefaultMiddleware: any) =>
      getDefaultMiddleware().concat(testTooltipsApi.middleware),
  });

  return {
    useGetActiveTooltipsQuery: testTooltipsApi.useGetActiveTooltipsQuery,
    __attempt: attempt,
    __TestProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children),
  };
});

import * as api from "@api";
import AppTooltip from "../AppTooltip";

const attempt = (api as any).__attempt as ReturnType<typeof vi.fn>;
const TestProvider = (api as any).__TestProvider as React.FC<{ children: React.ReactNode }>;

describe("AppTooltip while getActiveTooltips is persistently failing", () => {
  it("does not re-hit getActiveTooltips on every remount, e.g. on ordinary page navigation", async () => {
    // Each iteration simulates AppTooltip mounting fresh on a newly routed
    // page, seconds apart — the scenario telemetry showed hitting the
    // endpoint 66 times in under 5 minutes.
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <TestProvider>
          <AppTooltip location={TooltipLocation.LOGIN_BUTTON}>
            <button>Click me</button>
          </AppTooltip>
        </TestProvider>,
      );
      await screen.findByText("Click me");
      await waitFor(() => expect(attempt).toHaveBeenCalled());
      unmount();
    }

    // A persistently failing endpoint should be retried on a cooldown, not
    // once per remount.
    expect(attempt.mock.calls.length).toBeLessThan(5);
  });
});
