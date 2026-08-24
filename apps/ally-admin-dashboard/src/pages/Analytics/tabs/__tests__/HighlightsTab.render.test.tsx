import { configureStore } from "@reduxjs/toolkit";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at import
// time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

/**
 * Every `@api` export, faked: RTK Query hooks return an idle result, and the two
 * slices the store builds its reducer map from get minimal stand-ins.
 *
 * A Proxy rather than a list of hook names. This tab reaches two dozen endpoints
 * across eight sub-tabs, and a hand-maintained list would have to be extended by
 * whoever adds the next chart — the person who would otherwise learn about it
 * from a red suite that means nothing to their change. Wholesale rather than a
 * partial spread for the reason WeakPerformingMetricsTab.test.tsx gives: the
 * real `@api` barrel reaches store/loggerWithRedux.ts before a test store
 * exists, and the store then reads `reducerPath` off an undefined slice.
 */
vi.mock("@api", () => {
  const idle = {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isUninitialized: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  };
  const apiStub = (reducerPath: string) => ({
    reducerPath,
    reducer: (state: unknown = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (action: unknown) => next(action),
  });
  const explicit: Record<string, unknown> = {
    baseAPI: apiStub("baseAPI"),
    evaluatorAPI: apiStub("evaluatorAPI"),
  };
  return new Proxy(explicit, {
    // Every name is an export as far as the importer is concerned; without this
    // Vitest rejects the mock for not declaring the one it was asked for.
    has: () => true,
    get: (target, name) => {
      // `then` must stay undefined: a namespace object with a callable `then`
      // is a thenable, so awaiting the mocked module calls it as a promise
      // resolver and hangs the run rather than failing it.
      if (typeof name !== "string" || name === "then" || name === "__esModule") return undefined;
      if (Object.prototype.hasOwnProperty.call(target, name)) return target[name];
      return name.endsWith("Mutation") ? () => [vi.fn(), idle] : () => idle;
    },
  });
});

// One panel reaches past the barrel for its hook (`@api/analytics`), so the
// same fake is registered for that specifier too — otherwise a real RTK hook
// runs against a store that has no middleware for it.
vi.mock("@api/analytics", () => ({
  useGetSkillGrowthLearnerSeriesQuery: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isUninitialized: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

import { HighlightsTab } from "../HighlightsTab";

/** Label, and one heading or card title that only that sub-tab renders. */
const SUB_TABS: [label: string, marker: RegExp][] = [
  ["Platform", /North star/i],
  ["Usage levels", /Activation — getting to a first session/i],
  ["Skill growth", /Competency map/i],
  ["Curriculum", /Track drop-off by item format/i],
  ["Quality & sentiment", /Roleplay quality — median and spread/i],
  ["Coaching & support", /Sessions shared for review/i],
  ["Orgs", /Orgs by avg practice minutes per learner/i],
  ["Unit economics", /Where the spend goes/i],
];

const filters = { query: { range: "all" as const }, language: "", onSelectLanguage: vi.fn() };

/**
 * A store that only has to exist. Nothing asserted here reads from it — the
 * panels that reach for a selector need a Provider above them, not a
 * particular state — so one identity reducer keeps the fixture honest about
 * that rather than implying the tab depends on a shape.
 */
const store = configureStore({
  reducer: (state = { user: { user: null, features: [] } }) => state,
});

const render = (ui: React.ReactElement) =>
  rtlRender(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );

/**
 * A mount check, not an assertion about any number.
 *
 * The charts each have their own tests; what this covers is the thing those
 * cannot — that every panel registered in the sub-tab list actually renders with
 * no data behind it. Eight sub-tabs' worth of hooks only run when their panel is
 * selected, so a hook-order or missing-export mistake in one of them is
 * invisible until someone clicks that tab.
 */
describe("HighlightsTab", () => {
  it("mounts every sub-tab with no data behind it", async () => {
    render(<HighlightsTab {...filters} />);

    for (const [label, marker] of SUB_TABS) {
      await userEvent.click(screen.getByRole("tab", { name: label }));
      // findAll, not find: a marker phrase may legitimately appear in both a
      // heading and a caption on the same panel, and this asserts the panel
      // rendered — not how many times it said its own name.
      expect((await screen.findAllByText(marker)).length).toBeGreaterThan(0);
    }
  });
});
