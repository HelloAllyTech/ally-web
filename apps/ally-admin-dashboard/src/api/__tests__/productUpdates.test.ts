import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same isolation as productRoadmap.test.ts: baseApi pulls in the real store for its toasts, and
// "@constants" -> "@components" -> "@api" closes an import cycle back to baseAPI.
vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@components", () => ({
  cellTypes: new Proxy({}, { get: (_target, prop) => prop }),
}));

import { baseAPI } from "../baseApi";
import {
  GetProductUpdatesParams,
  GetProductUpdatesResponse,
  ProductUpdate,
  productUpdatesAPI,
} from "../productUpdates";

const update = (overrides: Partial<ProductUpdate> = {}): ProductUpdate => ({
  id: "u-1",
  slug: "s",
  title: "Video roleplays connect more reliably",
  summary: "s",
  teamNotes: "",
  kind: "fixed",
  audience: "public",
  surfaces: ["web_app"],
  area: "Reliability",
  confidence: 0.9,
  hidden: false,
  isPublic: true,
  editedFields: [],
  firstMergedAt: "2026-09-01T00:00:00Z",
  lastMergedAt: "2026-09-01T00:00:00Z",
  liveAt: "2026-09-02T00:00:00Z",
  publishedAt: "2026-09-02T00:00:00Z",
  decisionReason: null,
  model: "m",
  sourceCount: 1,
  ...overrides,
});

const listArgs: GetProductUpdatesParams = { limit: 25, offset: 0, hidden: false };
const list = (): GetProductUpdatesResponse => ({ updates: [update()], count: 1 });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("updateProductUpdate optimistic patch", () => {
  let store: ReturnType<typeof configureStore>;
  let settlePatch: (response: Response) => void;

  const rowInCache = () =>
    productUpdatesAPI.endpoints.getProductUpdates.select(listArgs)(store.getState() as never).data
      ?.updates[0];

  beforeEach(async () => {
    store = configureStore({
      reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
      middleware: getDefault => getDefault().concat(baseAPI.middleware),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) =>
        request.method === "PATCH"
          ? new Promise<Response>(resolve => {
              settlePatch = resolve;
            })
          : json(list()),
      ),
    );
    // A live subscription, like the table's, so the entry is not dropped on invalidation.
    await store.dispatch(productUpdatesAPI.endpoints.getProductUpdates.initiate(listArgs) as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("moves the row to Internal before the server answers", async () => {
    const saving = store.dispatch(
      productUpdatesAPI.endpoints.updateProductUpdate.initiate({
        id: "u-1",
        data: { audience: "internal" },
        listArgs,
      }) as never,
    );

    await vi.waitFor(() => expect(rowInCache()?.audience).toBe("internal"));
    expect(rowInCache()?.isPublic).toBe(false);

    settlePatch(json(update({ audience: "internal", isPublic: false })));
    await saving;
  });

  it("puts the row back when the save fails", async () => {
    const saving = store.dispatch(
      productUpdatesAPI.endpoints.updateProductUpdate.initiate({
        id: "u-1",
        data: { audience: "internal" },
        listArgs,
      }) as never,
    );
    await vi.waitFor(() => expect(rowInCache()?.audience).toBe("internal"));

    settlePatch(json({ message: "nope" }, 500));
    await saving;

    expect(rowInCache()?.audience).toBe("public");
    expect(rowInCache()?.isPublic).toBe(true);
  });
});
