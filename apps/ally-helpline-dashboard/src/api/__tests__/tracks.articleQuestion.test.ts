import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { baseAPI } from "../baseAPI";
import { tracksAPI } from "../tracks";

/** Every action the store saw, so cache invalidation is observable. */
const actions: { type: string }[] = [];

const makeStore = () =>
  configureStore({
    reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .concat(baseAPI.middleware)
        .concat(() => next => action => {
          actions.push(action as { type: string });
          return next(action);
        }),
  });

const respondWith = (body: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );

const result = (over: Record<string, unknown> = {}) => ({
  correct: true,
  selectedOptionId: "a",
  correctOptionId: "a",
  explanation: null,
  answeredQuestionCount: 1,
  totalQuestionCount: 2,
  completion: null,
  ...over,
});

describe("tracksAPI.submitArticleQuestionAnswer", () => {
  beforeEach(() => {
    actions.length = 0;
    vi.stubGlobal("fetch", respondWith(result()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the chosen option to the question's own URL", async () => {
    const store = makeStore();
    await store.dispatch(
      tracksAPI.endpoints.submitArticleQuestionAnswer.initiate({
        itemId: "item-1",
        questionId: "q1",
        selectedOptionId: "a",
      }),
    );

    const [request] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(request.url).toContain("/v1/learn/tracks/items/item-1/article-questions/q1/answer");
    expect(request.method).toBe("POST");
    await expect(request.json()).resolves.toEqual({ selectedOptionId: "a" });
  });

  it("returns the server's verdict, correct option included", async () => {
    const store = makeStore();
    const response = await store.dispatch(
      tracksAPI.endpoints.submitArticleQuestionAnswer.initiate({
        itemId: "item-1",
        questionId: "q1",
        selectedOptionId: "b",
      }),
    );

    expect(response.data).toMatchObject({ correct: true, correctOptionId: "a" });
  });

  /**
   * Answering mid-article moves nothing the outline shows, and this fires on
   * every question — blanket-invalidating each time would refetch the whole
   * course for nothing.
   */
  it("invalidates nothing when the answer did not complete the article", async () => {
    const store = makeStore();
    await store.dispatch(
      tracksAPI.endpoints.submitArticleQuestionAnswer.initiate({
        itemId: "item-1",
        questionId: "q1",
        selectedOptionId: "a",
      }),
    );

    expect(actions.some(action => action.type === "baseAPI/invalidateTags")).toBe(false);
  });

  it("invalidates the track caches when the answer completed the article", async () => {
    vi.stubGlobal(
      "fetch",
      respondWith(
        result({
          completion: {
            completed: true,
            unlockedItemIds: ["item-2"],
            sectionCompleted: false,
            trackCompleted: false,
          },
        }),
      ),
    );
    const store = makeStore();
    await store.dispatch(
      tracksAPI.endpoints.submitArticleQuestionAnswer.initiate({
        itemId: "item-1",
        questionId: "q1",
        selectedOptionId: "a",
      }),
    );

    expect(actions.some(action => action.type === "baseAPI/invalidateTags")).toBe(true);
  });
});
