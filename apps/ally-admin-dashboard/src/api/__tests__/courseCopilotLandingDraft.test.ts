import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same isolation as productRoadmap.test.ts: baseApi.ts pulls in the real store for its 401/403
// toasts, and "@constants" reaches "@components", whose barrel imports the "@api" barrel back.
vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@components", () => ({
  cellTypes: new Proxy({}, { get: (_target, prop) => prop }),
}));

import { baseAPI } from "../baseApi";
import { courseCopilotAPI } from "../courseCopilot";

const TRACK_ID = "96d570f0-14b6-42d7-8e78-79d7520c7f69";

describe("draftTrackLandingPage", () => {
  let store: ReturnType<typeof configureStore>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = configureStore({
      reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
      middleware: getDefault => getDefault().concat(baseAPI.middleware),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubResponse = (status: number, body: unknown) => {
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
  };

  it("POSTs to the course's landing-page-draft endpoint with no body and returns the draft", async () => {
    stubResponse(200, { draft: { version: 1, hero: { hook: "Draft hook" } } });

    const result = await store.dispatch(
      courseCopilotAPI.endpoints.draftTrackLandingPage.initiate(TRACK_ID),
    );

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    // The API base URL adds its own prefix (`/api`), so the path is checked from the right.
    expect(
      new URL(request.url).pathname.endsWith(
        `/v1/course-copilot/tracks/${TRACK_ID}/landing-page-draft`,
      ),
    ).toBe(true);
    expect("data" in result && result.data).toEqual({
      draft: { version: 1, hero: { hook: "Draft hook" } },
    });
  });

  it("hands the server's message through on a failure, for the toast to show", async () => {
    stubResponse(502, { message: "The model's answer could not be read." });

    const result = await store.dispatch(
      courseCopilotAPI.endpoints.draftTrackLandingPage.initiate(TRACK_ID),
    );

    expect("error" in result && result.error).toMatchObject({
      status: 502,
      data: { message: "The model's answer could not be read." },
    });
  });
});
