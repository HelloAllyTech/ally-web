import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const refetchMock = vi.fn();

// Full replacement, not a partial spread of the real module: the `@api` barrel
// pulls in an import graph that reaches store/loggerWithRedux.ts before a test
// store exists, and the store then reads `reducerPath` off an undefined slice.
// Same reason GlossaryAdherenceTab.test.tsx mocks it wholesale. This tab calls
// exactly one hook.
vi.mock("@api", () => {
  // The store needs these two to build its reducer map. Minimal stand-ins,
  // because this tab imports `@constants` (for ROUTES), whose graph reaches
  // store/index.ts — GlossaryAdherenceTab gets away with a bare hook mock only
  // because it never imports @constants.
  const apiStub = (reducerPath: string) => ({
    reducerPath,
    reducer: (state: unknown = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (action: unknown) => next(action),
  });
  return {
    baseAPI: apiStub("baseAPI"),
    evaluatorAPI: apiStub("evaluatorAPI"),
    useGetWeakPerformingMetricsQuery: (args: unknown) => queryMock(args),
  };
});

/**
 * Carbon draws through d3, which captures `window.requestAnimationFrame` at
 * IMPORT time. Its transition callbacks reach into SVG geometry jsdom does not
 * implement and run after the render being asserted on, surfacing as unhandled
 * errors from inside the library.
 *
 * Hoisted, because a `beforeAll` stub lands after d3 has taken its copy. Same
 * approach as testingCharts.render.test.tsx — mocking the chart module instead
 * takes the Redux store down with it, since `@api` is mocked in this file too.
 */
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import { MemoryRouter } from "react-router-dom";

import { WeakMetricGroup, WeakMetricSeries, WeakMetricsResponse } from "@types";

import { WeakPerformingMetricsTab } from "../tabs/WeakPerformingMetricsTab";

/**
 * The worst-scenario table links into session logs, so the tab needs a router
 * in context. Wrapped here rather than in each test.
 */
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const series = (o: Partial<WeakMetricSeries> = {}): WeakMetricSeries => ({
  id: "repetition_turns",
  label: "Turns repeating an earlier turn",
  unit: "percent",
  state: "measured",
  lowerIsBetter: true,
  description: "Actor turns that repeat something the actor already said.",
  caveat: null,
  points: [
    { bucket: "2026-06-01", numerator: 10, denominator: 500, value: 0.02 },
    { bucket: "2026-07-01", numerator: 30, denominator: 500, value: 0.06 },
  ],
  latest: 0.06,
  previous: 0.02,
  ...o,
});

const group = (o: Partial<WeakMetricGroup> = {}): WeakMetricGroup => ({
  id: "progression",
  label: "Conversational progression & resolution",
  description: "Does the session move forward, and does it arrive?",
  state: "partial",
  series: [series()],
  ...o,
});

const response = (o: Partial<WeakMetricsResponse> = {}): WeakMetricsResponse => ({
  metricsVersion: "v1",
  parameters: { loopRunLength: 3 },
  judgeModel: "gemini-2.5-pro",
  judgePromptVersion: "v2",
  judgeVersions: {
    drift: { judgeModel: "gemini-2.5-pro", judgePromptVersion: "v2" },
    language: { judgeModel: "gemini-2.5-pro", judgePromptVersion: "v1" },
    groundedness: null,
  },
  bucket: "month",
  start: "2025-08-01T00:00:00.000Z",
  groups: [group()],
  worstScenarios: [
    {
      scenarioId: 96,
      title: "[v1_4] Help Kamakshi understand",
      language: "ta-IN",
      sessions: 5,
      turns: 71,
      slips: 22,
      rate: 0.3099,
    },
  ],
  scoreLengthCorrelation: 0.704,
  filterOptions: {
    languages: ["en-IN", "ta-IN"],
    models: ["gpt-4o-mini", "gpt-4.1-mini"],
    promptVersions: ["16", "17"],
    scenarios: [{ id: 96, title: "Help Kamakshi understand" }],
  },
  ...o,
});

const filters = {
  query: { range: "12m" },
  language: "",
  onSelectLanguage: vi.fn(),
} as never;

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockReturnValue({
    data: response(),
    isFetching: false,
    isError: false,
    refetch: refetchMock,
  });
});

describe("WeakPerformingMetricsTab", () => {
  it("renders each group with its series", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText("Conversational progression & resolution")).toBeInTheDocument();
    expect(screen.getByText("Turns repeating an earlier turn")).toBeInTheDocument();
    // The chart itself renders through Carbon; asserting the card's presence is
    // the meaningful check — chart internals belong to the library.
    expect(screen.getByText(/judge labels/i)).toBeInTheDocument();
  });

  it("scales a percent series for display", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    // 0.06 is stored as a fraction; the reader sees 6%. It appears twice on a
    // few-bucket card — once as the headline, once in the per-bucket list.
    expect(screen.getAllByText("6.00%").length).toBeGreaterThan(0);
  });

  it("labels a rising bad metric as worsening, not just as an increase", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    // 2% -> 6% on a lowerIsBetter series. An arrow alone would leave the reader
    // to work out which direction is good.
    expect(screen.getByText(/worsening/)).toBeInTheDocument();
  });

  it("says improving when a lowerIsBetter series falls", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [series({ latest: 0.01, previous: 0.05 })],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/improving/)).toBeInTheDocument();
  });

  it("keeps the caveat reachable without putting it in the reader's way", () => {
    // This test previously asserted the opposite — that the caveat rendered as
    // body text on the card. That was the original intent and it did not
    // survive contact with the live tab: four lines of weighting rules sat
    // above a two-bar chart on every one of 22 cards. The rule it protected
    // still holds — a reader must be able to find out how a number is
    // weighted — so the caveat moved behind an affordance rather than away.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                label: "Repeated turns",
                caveat: "Segment by model or this misleads.",
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    // Carbon names the trigger from the tooltip's own content, so the caveat is
    // what a screen reader announces on the help control.
    expect(
      screen.getByRole("button", { name: /Segment by model or this misleads/ }),
    ).toBeInTheDocument();
  });

  it("marks a not-measured series so an empty line is not read as good news", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            state: "none",
            series: [
              series({
                id: "barge_in",
                label: "Turns interrupted by the learner",
                state: "none",
                points: [],
                latest: null,
                previous: null,
                caveat: "Not instrumented.",
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    // Two badges: the group and the series. A zero-valued chart with no label
    // would read as "nobody interrupts", which is the opposite of the truth.
    expect(screen.getAllByText("Not measured").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Not instrumented/).length).toBeGreaterThan(0);
  });

  it("does not draw a trend line from only two buckets", () => {
    // The language judge started in July, so its series have exactly two
    // monthly buckets. A line through two points reads as a direction.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                id: "register",
                label: "Too formal for spoken register, per 100 turns",
                unit: "per100turns",
                points: [
                  { bucket: "2026-07-01", numerator: 20, denominator: 100, value: 0.2 },
                  { bucket: "2026-08-01", numerator: 10, denominator: 100, value: 0.1 },
                ],
                latest: 0.1,
                previous: 0.2,
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    // Columns, with a caption that says what the reader may and may not infer.
    expect(screen.getByText(/compared, not trended/i)).toBeInTheDocument();
  });

  it("draws a line once there are five or more buckets", () => {
    const pts = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"].map((m, i) => ({
      bucket: `${m}-01`,
      numerator: i,
      denominator: 100,
      value: i / 100,
    }));
    queryMock.mockReturnValue({
      data: response({
        groups: [group({ series: [series({ points: pts, latest: 0.04, previous: 0.03 })] })],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.queryByText(/compared, not trended/i)).not.toBeInTheDocument();
  });

  it("says so when only one bucket has been measured", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                points: [{ bucket: "2026-08-01", numerator: 5, denominator: 100, value: 0.05 }],
                latest: 0.05,
                previous: null,
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/One measured bucket/i)).toBeInTheDocument();
  });

  it("plots nothing for a not-measured series, even when rows exist", () => {
    // Regression: barge-in drew a 4.3% column beside a "—" headline. The flag
    // is never written, so any bar is an artefact of the denominator moving.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                id: "barge_in",
                state: "none",
                caveat: "Not instrumented.",
                points: [
                  { bucket: "2026-07-01", numerator: 4, denominator: 93, value: 0.043 },
                  { bucket: "2026-08-01", numerator: 0, denominator: 97, value: 0 },
                ],
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.queryByText(/compared, not trended/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Not instrumented/)).toBeInTheDocument();
  });

  it("reports no direction for an uninstrumented metric", () => {
    // Regression: barge-in rendered "0.00% ↓ 4.3% vs previous bucket —
    // improving". Nothing writes that flag, so the denominator moving between
    // buckets produced a confident verdict about a signal nobody records.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                id: "barge_in",
                state: "none",
                latest: 0,
                previous: 0.043,
                caveat: "Not instrumented.",
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.queryByText(/improving/)).not.toBeInTheDocument();
    expect(screen.queryByText(/worsening/)).not.toBeInTheDocument();
    // and no value either — a rate nobody measures is not 0%
    expect(screen.queryByText("0.00%")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows an em dash, never 0, when a series has no value yet", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [group({ series: [series({ latest: null, previous: null })] })],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("lists the worst scenarios with a link into session logs", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    const row = screen.getByText(/Help Kamakshi understand/).closest("a");
    expect(row).toHaveAttribute("href", expect.stringContaining("96"));
    expect(screen.getByText("30.99%")).toBeInTheDocument();
  });

  it("surfaces the score-length correlation as a discrimination warning", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/r = 0.704/)).toBeInTheDocument();
    expect(screen.getByText(/substantially session length/)).toBeInTheDocument();
  });

  it("pins the judge and parameter versions on the page", () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    // A threshold change moves every historical point, so the version a chart
    // was cut with has to be visible next to it.
    expect(screen.getByText(/gemini-2.5-pro/)).toBeInTheDocument();
    expect(screen.getByText(/v2/)).toBeInTheDocument();
  });

  it("refetches with the chosen model so a metric can be segmented", async () => {
    render(<WeakPerformingMetricsTab {...filters} />);
    const dropdown = screen.getByText("All models");
    await userEvent.click(dropdown);
    await userEvent.click(await screen.findByText("gpt-4.1-mini"));
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ llmModel: "gpt-4.1-mini" }),
    );
  });

  it("renders an error state with a retry rather than an empty page", async () => {
    queryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/Could not load weak performing metrics/)).toBeInTheDocument();
  });

  it("renders a loading state before the first response", () => {
    queryMock.mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      refetch: refetchMock,
    });
    const { container } = render(<WeakPerformingMetricsTab {...filters} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("does not crash when the API returns no groups", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [],
        worstScenarios: [],
        filterOptions: {
          languages: [],
          models: [],
          promptVersions: [],
          scenarios: [],
        },
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/No scenario has enough judged turns/)).toBeInTheDocument();
  });

  it("renders a ratio series without a percent sign", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            id: "feedback_groundedness",
            label: "Feedback groundedness",
            series: [
              series({
                id: "criticism_ratio",
                label: "Criticisms per compliment",
                unit: "ratio",
                latest: 1.31,
                previous: 1.24,
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    // A ratio must not be multiplied by 100 like a percent.
    expect(screen.getByText("Criticisms per compliment")).toBeInTheDocument();
    // A ratio must not be multiplied by 100 the way a percent is.
    expect(screen.getByText("1.31×")).toBeInTheDocument();
    expect(screen.queryByText("131.00%")).not.toBeInTheDocument();
  });

  /**
   * Prompt version is the hypothesis slice: it is how "did the prompt change
   * fix it?" gets asked. Two things have to hold — the versions on offer come
   * from the API rather than a hard-coded list, and picking one actually
   * reaches the query. A control that renders but never changes the request is
   * the worst outcome here, because the numbers stay put and read as evidence
   * the prompt made no difference.
   */
  it("offers the prompt versions the API reports and sends the pick to the query", async () => {
    queryMock.mockReturnValue({
      data: response({}),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(queryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptVersion: undefined }),
    );

    await userEvent.click(screen.getByRole("combobox", { name: /prompt version/i }));
    expect(screen.getByRole("option", { name: "Prompt v16" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Prompt v17" }));

    expect(queryMock).toHaveBeenLastCalledWith(expect.objectContaining({ promptVersion: "17" }));
  });

  /**
   * A single judge version on screen was how the language series came to be
   * read through the drift judge's pin. The tab must name each family, and must
   * say "not run" rather than silently omitting one that has no rows yet.
   */
  it("names the judge version of every family, including one not yet run", () => {
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText(/drift gemini-2\.5-pro\/v2/)).toBeInTheDocument();
    expect(screen.getByText(/language gemini-2\.5-pro\/v1/)).toBeInTheDocument();
    expect(screen.getByText(/groundedness not run/)).toBeInTheDocument();
  });

  /**
   * Two readability failures this pins, both reported from the live tab.
   *
   * The caveat was the card's caption — three or four lines of weighting rules
   * above a two-bar chart, crowding out the number it qualified. And direction
   * only ever appeared inside the delta sentence, which needs two buckets, so a
   * single-bucket card said nothing about whether a rise was good or bad.
   */
  it("captions the card with what it counts, not with the caveat", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                description: "Actor turns that repeat something the actor already said.",
                caveat: "Segment by model or this misleads: repetition differs 6.6x.",
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    // The caption is the one plain line saying what is counted.
    const caption = screen.getByText(
      "Actor turns that repeat something the actor already said.",
    );
    expect(caption.tagName).toBe("P");

    // The caveat is still in the document — Carbon renders tooltip content
    // inline — but inside the popover rather than as the card's caption.
    const caveat = screen.getByText(/Segment by model or this misleads/);
    expect(caveat.className).toContain("tooltip-content");
  });

  it("says which direction is good, without needing two buckets", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                // One bucket: no delta sentence, so this is the ONLY thing on
                // the card that can tell the reader which way is good.
                points: [{ bucket: "2026-07-01", numerator: 3, denominator: 100, value: 0.03 }],
                latest: 0.03,
                previous: null,
              }),
            ],
          }),
        ],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText("lower is better")).toBeInTheDocument();
    expect(screen.queryByText(/vs previous bucket/)).not.toBeInTheDocument();
  });

  it("says higher is better where that is true", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [group({ series: [series({ lowerIsBetter: false })] })],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText("higher is better")).toBeInTheDocument();
  });
});
