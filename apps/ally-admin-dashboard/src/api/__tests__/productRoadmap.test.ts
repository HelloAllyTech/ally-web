import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// baseApi.ts pulls in the real store for its 401/403 toasts; every existing api test mocks both
// away rather than let the real store module (which itself imports baseAPI) load during the test.
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// "@constants" pulls in SimulationCreator.ts, which imports "@components" for cellTypes — and
// the components barrel re-exports AppTooltip, which imports the "@api" barrel (for
// useGetActiveTooltipsQuery). That closes a real cycle back to this very file's baseAPI import,
// so it needs breaking here too, same as the @store/sonner mocks above.
vi.mock("@components", () => ({
  cellTypes: new Proxy({}, { get: (_target, prop) => prop }),
}));

// Import the two endpoint files directly rather than through the "@api" barrel: the barrel
// re-exports every api module (including ones with components that import "@api" back), which
// forms a real circular import and crashes with "Cannot read properties of undefined" before the
// mocks above ever get a chance to help.
import { baseAPI } from "../baseApi";
import { productRoadmapAPI } from "../productRoadmap";
import {
  RoadmapBoardGroupBy,
  RoadmapBoardMoveResponse,
  RoadmapBoardQuery,
  RoadmapBoardResponse,
  RoadmapOpportunity,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

const opportunity = (overrides: Partial<RoadmapOpportunity> = {}): RoadmapOpportunity =>
  ({
    id: "opp-1",
    description: "Some opportunity",
    type: RoadmapOpportunityType.IDEA,
    stage: RoadmapOpportunityStage.NEW,
    productGoal: "Scribe",
    owner: null,
    prd: null,
    claudePrompt: null,
    releasedAt: null,
    priorityScore: 1,
    myVotes: 0,
    commentCount: 0,
    source: RoadmapOpportunitySource.STAFF,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    creator: null,
    ...overrides,
  }) as RoadmapOpportunity;

const boardArgs: RoadmapBoardQuery = { groupBy: RoadmapBoardGroupBy.PRODUCT_GOAL };

const board = (): RoadmapBoardResponse => ({
  groupBy: RoadmapBoardGroupBy.PRODUCT_GOAL,
  lanes: [
    { key: "Scribe", items: [opportunity()], total: 1 },
    { key: null, items: [], total: 0 },
  ],
  bounds: { earliest: null, latest: null },
  from: "",
  to: "",
  maxScore: 1,
  periodKey: "2026-08",
  truncated: false,
});

describe("moveRoadmapOpportunity onQueryStarted optimistic patch", () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { [baseAPI.reducerPath]: baseAPI.reducer },
      middleware: getDefault => getDefault().concat(baseAPI.middleware),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const body: RoadmapBoardMoveResponse = {
          opportunityId: "opp-1",
          plannedMonth: null,
          effectiveMonth: null,
          reordered: [],
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Regression: dragging a card onto the "No goal" catch-all lane moved it into the lane
  // visually but the card kept showing its old goal chip until the next real fetch, because
  // the PRODUCT_GOAL branch only wrote moving.productGoal when the lane was non-null.
  it("clears the stale product goal when a card is dropped on the No goal lane", async () => {
    await store.dispatch(
      productRoadmapAPI.util.upsertQueryData("getRoadmapBoard", boardArgs, board()),
    );

    await store.dispatch(
      productRoadmapAPI.endpoints.moveRoadmapOpportunity.initiate({
        opportunityId: "opp-1",
        groupBy: RoadmapBoardGroupBy.PRODUCT_GOAL,
        lane: null,
        boardArgs,
      }),
    );

    const cached = productRoadmapAPI.endpoints.getRoadmapBoard.select(boardArgs)(
      store.getState(),
    ).data;

    const moved = cached?.lanes.find(lane => lane.key === null)?.items[0];
    expect(moved?.productGoal).toBe("");
  });
});
