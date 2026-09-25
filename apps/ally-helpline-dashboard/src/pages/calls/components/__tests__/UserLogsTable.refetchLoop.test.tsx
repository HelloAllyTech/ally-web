import React from "react";

// `baseAPI` builds its baseUrl from `import.meta.env.VITE_API_BASE_URL` at
// module-evaluation time, and vitest resolves that from `process.env`. Without
// a value the baseUrl is the literal string "undefined/api", every request
// dies in `new Request()` with a FETCH_ERROR before `fetch` is ever called, and
// the table never leaves its spinner. `vi.hoisted` runs before the imports
// below, which is the only window in which setting this still counts.
vi.hoisted(() => {
  process.env.VITE_API_BASE_URL = "http://helpline.test";
});

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { baseAPI } from "@api/baseAPI";
import callsSlice from "@reducer/callsReducer";
import { SessionType } from "@types";

import UserLogsTable from "../UserLogsTable";

// ---------------------------------------------------------------------------
// This suite deliberately keeps `@api` REAL — the whole point is to exercise
// RTK Query's own subscription/refetch machinery against a stubbed `fetch`, so
// a client-side refetch loop shows up as extra network calls. The existing
// UserLogsTable.test.tsx mocks every hook and therefore cannot see one.
// ---------------------------------------------------------------------------

// useAnalytics requires <AnalyticsProvider>, which this suite doesn't render
// (it only wraps UserLogsTable in <Provider>/<MemoryRouter> to exercise RTK
// Query directly). Stub just this hook; every other hook (useCustomFieldsEnabled
// included) stays real so it still hits the fetch stub above.
vi.mock("@hooks", async importOriginal => ({
  ...(await importOriginal<typeof import("@hooks")>()),
  useAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  Loading: () => <div data-testid="loading">Loading...</div>,
  GenericTable: React.forwardRef(({ data, onFilterChange }: any, ref: any) => {
    // Mirror the real GenericTable, whose [filter, sort] effect fires once on
    // mount with the empty initial filter.
    React.useEffect(() => {
      onFilterChange?.({ filter: [], sort: { key: "", value: null } });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div ref={ref} data-testid="generic-table" data-row-count={data?.length ?? 0}>
        {data?.map((row: any) => (
          // The cells the table really renders are covered by
          // UserLogsTable.test.tsx; what this suite needs from a row is proof
          // that an edit reached it at all, so surface the name as an attribute.
          <div key={row.id} data-testid={`row-${row.id}`} data-call-name={row.callName} />
        ))}
      </div>
    );
  }),
}));

// Every icon in @assets is a stub component. The `then` guard matters: a module
// namespace whose `then` is a function looks thenable, and awaiting it hangs the
// import forever.
vi.mock("@assets", () => {
  const Icon = () => <span />;
  return new Proxy(
    {},
    {
      get: (_target, prop) => (typeof prop === "string" && prop !== "then" ? Icon : undefined),
      has: () => true,
    },
  );
});

vi.mock("@components", () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Chip: () => <span />,
  TagGroup: () => <span />,
  FallbackUI: ({ mainMessage }: any) => <div data-testid="fallback">{mainMessage}</div>,
}));

vi.mock("../CallSummarySidebar", () => ({ default: () => <div data-testid="call-sidebar" /> }));
vi.mock("../SimulationSummarySidebar", () => ({
  default: () => <div data-testid="sim-sidebar" />,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ---------------------------------------------------------------------------
// fetch stub
// ---------------------------------------------------------------------------

const CALL_LOGS_PATH = "/v1/chats/call-logs";
const RENAMED = "Renamed by the counsellor";

let requestLog: string[] = [];

const callLogRow = (id: number) => ({
  id,
  startedAt: "2026-09-15T10:00:00Z",
  endedAt: "2026-09-15T10:05:00Z",
  summaryStatus: "SUCCESS",
  details: {
    callDuration: 300,
    callInfo: { summaryName: `Call ${id}`, provider: "MICROPHONE", mode: "SCRIBE" },
    summary: { callQuality: 80, tags: [] },
    transcript: "",
  },
});

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const installFetchStub = () => {
  const stub = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : ((input as Request).url ?? String(input));
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    requestLog.push(path);

    if (path.endsWith(CALL_LOGS_PATH)) {
      // A stable payload: identical JSON on every call, so RTK Query's
      // structural sharing keeps `data`'s identity and any extra render is
      // the component's own doing.
      return jsonResponse({ data: [1, 2, 3].map(callLogRow), count: 3 });
    }
    // Both writes answer with the updated chat (ally-be returns `getChat`), which
    // is what lets the client patch the row instead of re-reading the page.
    const callDetailsMatch = path.match(/\/v1\/chats\/(\d+)\/call-details$/);
    if (callDetailsMatch) {
      return jsonResponse({
        ...callLogRow(Number(callDetailsMatch[1])),
        details: {
          ...callLogRow(Number(callDetailsMatch[1])).details,
          summary: { callQuality: 80, tags: [{ tag: "escalated", positivity_rating: 1 }] },
        },
      });
    }
    const callInfoMatch = path.match(/\/v1\/chats\/(\d+)\/call-info$/);
    if (callInfoMatch) {
      const row = callLogRow(Number(callInfoMatch[1]));
      return jsonResponse({
        ...row,
        details: { ...row.details, callInfo: { ...row.details.callInfo, summaryName: RENAMED } },
      });
    }
    if (/\/v1\/custom-fields\/values\/\d+$/.test(path)) return jsonResponse({ success: true });
    if (/\/v1\/chats\/call-logs\/\d+\/archive$/.test(path)) return jsonResponse({ success: true });
    if (path.endsWith("/v1/chats/tags")) return jsonResponse({ data: [], count: 0 });
    if (path.endsWith("/v1/custom-fields/definitions")) return jsonResponse([]);
    if (path.endsWith("/v1/settings/custom-fields-enabled")) return jsonResponse(false);
    if (path.endsWith("/v1/learn/scenario-sessions")) return jsonResponse({ data: [], count: 0 });
    return jsonResponse({ data: [], count: 0 });
  });
  global.fetch = stub as unknown as typeof fetch;
  return stub;
};

const callLogsCallCount = () => requestLog.filter(p => p.endsWith(CALL_LOGS_PATH)).length;

const makeStore = () =>
  configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
      calls: callsSlice.reducer,
      user: () => ({
        isAuthenticated: true,
        user: { id: 1, name: "Test Counsellor", role: "COUNSELLOR" },
        permissions: [],
        availableChatTypes: [],
      }),
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  });

const renderTable = (options: { initialEntry?: any } = {}) => {
  const store = makeStore();
  // The app calls setupListeners at store creation; without it `refetchOnFocus`
  // is inert and a focus-driven loop would be invisible here.
  const teardownListeners = setupListeners(store.dispatch);
  const entry = options.initialEntry ?? { pathname: "/scribe-logs" };
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <UserLogsTable sessionType={SessionType.CALL} />
      </MemoryRouter>
    </Provider>,
  );
  return { store, teardownListeners, ...utils };
};

beforeEach(() => {
  requestLog = [];
  installFetchStub();
  localStorage.setItem("accessToken", "test-token");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserLogsTable — call-logs request volume", () => {
  it("fetches call-logs exactly once per mount and then goes quiet", async () => {
    const { teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());

    // Let every effect / state update settle well past the point a feedback
    // loop would have fired again.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    expect(callLogsCallCount()).toBe(1);
    teardownListeners();
  });

  it("does not re-fetch in a loop when arriving with location.state.refetch", async () => {
    const { teardownListeners } = renderTable({
      initialEntry: { pathname: "/scribe-logs", state: { refetch: true } },
    });

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    // One initial subscription fetch + at most the single explicit refetch the
    // navigation asked for. Anything beyond that is the loop.
    expect(callLogsCallCount()).toBeLessThanOrEqual(2);
    teardownListeners();
  });

  // The production symptom: the Scribe Logs page issued a `call-logs` request
  // every few seconds in bursts lasting minutes — 325 of them in under four
  // hours on 2026-09-15, in runs of ~45 at a constant page size. It is not a
  // render loop. It is `updateCallSummary` invalidating the coarse CallLogs
  // tag, once per 800ms `useFieldAutosave` debounce, while a counsellor types
  // up a scribe note. (The *notes* autosave in CallSummary.tsx is a different
  // endpoint and invalidates nothing — it was never the trigger.) One write-up
  // was ~45 full-page refetches, each re-decrypting every row on the page.
  it("does not refetch the whole page for each scribe-note autosave", async () => {
    const { store, teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    const afterMount = callLogsCallCount();
    expect(afterMount).toBe(1);

    // Five autosave writes — a counsellor typing for a handful of seconds.
    const updateCallSummary = (baseAPI.endpoints as any).updateCallSummary;
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await store
          .dispatch(
            updateCallSummary.initiate({ chatId: 1, data: { summary: { notes: `n${i}` } } }),
          )
          .unwrap();
        await new Promise(resolve => setTimeout(resolve, 50));
      });
    }

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(callLogsCallCount()).toBe(afterMount);
    teardownListeners();
  });

  // The flip side of the test above: not refetching must not mean going stale.
  // A rename answers with the updated chat, and the row has to show it.
  it("shows a renamed session on the row without re-reading the page", async () => {
    const { store, teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    const afterMount = callLogsCallCount();

    const updateCallInfo = (baseAPI.endpoints as any).updateCallInfo;
    await act(async () => {
      await store.dispatch(updateCallInfo.initiate({ chatId: 1, callInfo: { name: RENAMED } }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await waitFor(() =>
      expect(screen.getByTestId("row-1")).toHaveAttribute("data-call-name", RENAMED),
    );
    expect(callLogsCallCount()).toBe(afterMount);
    // The row that wasn't edited keeps its own name.
    expect(screen.getByTestId("row-2")).toHaveAttribute("data-call-name", "Call 2");
    teardownListeners();
  });

  it("writes a saved custom-field value onto the cached row instead of refetching", async () => {
    const { store, teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    const afterMount = callLogsCallCount();

    const upsertCustomFieldValues = (baseAPI.endpoints as any).upsertCustomFieldValues;
    await act(async () => {
      await store
        .dispatch(
          upsertCustomFieldValues.initiate({
            chatId: 2,
            values: [{ fieldDefinitionId: "risk", value: "high" }],
          }),
        )
        .unwrap();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const cachedRows = (
      Object.values((store.getState() as any).baseAPI.queries).find(
        (entry: any) => entry?.endpointName === "getCallLogs",
      ) as any
    )?.data?.data;
    expect(cachedRows?.find((row: any) => row.id === 2)?.customFieldValues).toEqual([
      { fieldDefinitionId: "risk", value: "high" },
    ]);
    expect(cachedRows?.find((row: any) => row.id === 1)?.customFieldValues).toBeUndefined();
    expect(callLogsCallCount()).toBe(afterMount);
    teardownListeners();
  });

  // Fine-grained tags must not silence the writes that genuinely change which
  // rows belong on the page — those still have to re-read it.
  it("still re-reads the page when a session is archived", async () => {
    const { store, teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    const afterMount = callLogsCallCount();

    const archiveCallLog = (baseAPI.endpoints as any).archiveCallLog;
    await act(async () => {
      await store.dispatch(archiveCallLog.initiate({ chatId: 1, archive: true })).unwrap();
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(callLogsCallCount()).toBe(afterMount + 1);
    teardownListeners();
  });

  it("fetches once per window focus event, not once per render", async () => {
    const { teardownListeners } = renderTable();

    await waitFor(() => expect(screen.getByTestId("row-1")).toBeInTheDocument());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
    const afterMount = callLogsCallCount();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    expect(callLogsCallCount() - afterMount).toBeLessThanOrEqual(1);
    teardownListeners();
  });
});
