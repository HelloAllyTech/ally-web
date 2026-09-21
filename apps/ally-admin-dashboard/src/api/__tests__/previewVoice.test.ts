import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same cycle-breaking mocks every api test needs: baseApi pulls in the real
// store for its 401/403 toasts, and the store imports baseAPI back.
vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@components", () => ({
  cellTypes: new Proxy({}, { get: (_target, prop) => prop }),
}));

import { baseAPI } from "../baseApi";
import { previewVoiceAPI } from "../previewVoice";

/**
 * The audition line. `/voice-preview/generate` has accepted `?text=` since it
 * shipped and nothing ever sent it, so every preview across the product said
 * "Hi this is a preview of my voice." These pin both directions: the line is
 * sent when there is one, and omitted (not sent empty) when there is not, so
 * the backend keeps choosing its per-language sample.
 */

let store: ReturnType<typeof configureStore>;
const requestedUrls: string[] = [];

/** The `text` the request actually carried, decoded. */
const sentText = (): string | null => new URL(requestedUrls[0]).searchParams.get("text");

beforeEach(() => {
  requestedUrls.length = 0;
  store = configureStore({
    reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
    middleware: getDefault => getDefault({ serializableCheck: false }).concat(baseAPI.middleware),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(typeof input === "string" ? input : (input as Request).url);
      return new Response(new ArrayBuffer(8), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPreviewVoice", () => {
  it("sends the audition line as ?text=", async () => {
    await store.dispatch(
      previewVoiceAPI.endpoints.getPreviewVoice.initiate({
        voiceId: "voice-1",
        text: "I'm managing fine.",
      }),
    );

    expect(requestedUrls[0]).toContain("/voice-preview/generate/voice-1");
    expect(sentText()).toBe("I'm managing fine.");
  });

  it("omits text entirely when there is no line to say", async () => {
    await store.dispatch(
      previewVoiceAPI.endpoints.getPreviewVoice.initiate({ voiceId: "voice-1" }),
    );

    expect(requestedUrls[0]).not.toContain("text=");
  });

  it("omits a whitespace-only line rather than sending it empty", async () => {
    await store.dispatch(
      previewVoiceAPI.endpoints.getPreviewVoice.initiate({ voiceId: "voice-1", text: "   " }),
    );

    // An empty `text` would make the voice say nothing at all.
    expect(requestedUrls[0]).not.toContain("text=");
  });

  it("trims the line, since the cap is server-side and counted after trimming", async () => {
    await store.dispatch(
      previewVoiceAPI.endpoints.getPreviewVoice.initiate({
        voiceId: "voice-1",
        text: "  Hello there.  ",
      }),
    );

    expect(sentText()).toBe("Hello there.");
  });
});
