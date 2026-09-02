import { render as rtlRender, screen, waitFor } from "@testing-library/react";
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

import {
  WeakMetricGroup,
  WeakMetricSeries,
  WeakMetricTurnFactor,
  WeakMetricsResponse,
} from "@types";

import { AnalyticsTabFilters } from "../analyticsFilters";
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
    { bucket: "2026-06-01", numerator: 10, denominator: 500, value: 0.02, sparse: false },
    { bucket: "2026-07-01", numerator: 30, denominator: 500, value: 0.06, sparse: false },
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
  // Null by default: these fixtures describe windows that ended in the past,
  // so nothing is still accruing and no point is withheld from the plot.
  inProgressBucket: null,
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
  turnConditions: { totalTurns: 0, baselineRate: null, factors: [] },
  scoreLengthCorrelation: 0.704,
  filterOptions: {
    languages: ["en-IN", "ta-IN"],
    models: ["gpt-4o-mini", "gpt-4.1-mini"],
    promptVersions: ["16", "17"],
    scenarios: [{ id: 96, title: "Help Kamakshi understand" }],
  },
  ...o,
});

// Typed rather than `as never`: spreading a `never` into JSX made every
// `render(<Tab {...filters} />)` in this file a TS2698, so the cast hid nothing
// and cost the file its type checking on the props it passes.
const filters: AnalyticsTabFilters = {
  query: { range: "12m" },
  language: "",
  onSelectLanguage: vi.fn(),
};

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
  describe("thin buckets", () => {
    // Traffic per language is lumpy: Tamil ran 97 real sessions in the week of
    // 2026-05-25 and 2 in the week of 07-06. Both were drawn with the same
    // weight, so a swing in traffic read as a swing in quality — and the delta
    // arrow reported "worsening" off the least reliable point on the card.
    const withThin = () =>
      response({
        bucket: "week",
        inProgressBucket: null,
        groups: [
          group({
            series: [
              series({
                points: [
                  {
                    bucket: "2026-07-20",
                    numerator: 50,
                    denominator: 500,
                    value: 0.1,
                    sparse: false,
                  },
                  {
                    bucket: "2026-07-27",
                    numerator: 80,
                    denominator: 800,
                    value: 0.1,
                    sparse: false,
                  },
                  {
                    bucket: "2026-08-03",
                    numerator: 5,
                    denominator: 2,
                    value: 2.5,
                    sparse: true,
                  },
                ],
              }),
            ],
          }),
        ],
      });

    const renderThin = () => {
      queryMock.mockReturnValue({
        data: withThin(),
        isFetching: false,
        isError: false,
        refetch: refetchMock,
      });
      render(<WeakPerformingMetricsTab {...filters} />);
    };

    it("leaves a thin bucket off the plot", () => {
      renderThin();
      expect(screen.getAllByText(/2026-07-27/).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/2026-08-03/)).toHaveLength(0);
    });

    it("says how many buckets were withheld and why", () => {
      // Silently dropping them means a reader comparing this against the raw
      // counts finds buckets missing with no reason given.
      renderThin();
      expect(screen.getByText(/too few turns to read as a rate/i)).toBeInTheDocument();
    });

    it("says nothing when every bucket is thick enough", () => {
      render(<WeakPerformingMetricsTab {...filters} />);
      expect(screen.queryByText(/too few turns to read as a rate/i)).not.toBeInTheDocument();
    });
  });

  describe("the still-accruing bucket", () => {
    // Three days of the current week charted beside seven-day weeks reads as
    // quality collapsing, and the reader explains that fall to themselves. It
    // is also what made the axis look like it stopped days early. Every other
    // tab already withholds this bucket; this one plots it.
    const withPartial = () =>
      response({
        bucket: "week",
        inProgressBucket: "2026-08-17",
        groups: [
          group({
            series: [
              series({
                points: [
                  {
                    bucket: "2026-08-03",
                    numerator: 20,
                    denominator: 500,
                    value: 0.04,
                    sparse: false,
                  },
                  {
                    bucket: "2026-08-10",
                    numerator: 25,
                    denominator: 500,
                    value: 0.05,
                    sparse: false,
                  },
                  // 3 of 7 days in — a real value over a partial denominator.
                  {
                    bucket: "2026-08-17",
                    numerator: 1,
                    denominator: 20,
                    value: 0.05,
                    sparse: false,
                  },
                ],
              }),
            ],
          }),
        ],
      });

    it("keeps the partial bucket out of the plotted series", () => {
      queryMock.mockReturnValue({
        data: withPartial(),
        isFetching: false,
        isError: false,
        refetch: refetchMock,
      });
      render(<WeakPerformingMetricsTab {...filters} />);

      // The completed weeks are still listed; the accruing one is not. The
      // bucket key renders in more than one place per card, so count rather
      // than assume a single node.
      expect(screen.getAllByText(/2026-08-10/).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/2026-08-17/)).toHaveLength(0);
    });

    it("says the current week was left off, rather than silently dropping it", () => {
      queryMock.mockReturnValue({
        data: withPartial(),
        isFetching: false,
        isError: false,
        refetch: refetchMock,
      });
      render(<WeakPerformingMetricsTab {...filters} />);

      // Without this a screenshot reader cannot tell a deliberate omission from
      // missing data — which is the confusion the plotted version caused.
      expect(screen.getByText(/still accruing/i)).toBeInTheDocument();
    });

    it("plots every bucket when nothing is accruing", () => {
      // A window that ended in the past withholds nothing.
      render(<WeakPerformingMetricsTab {...filters} />);
      expect(screen.queryByText(/still accruing/i)).not.toBeInTheDocument();
    });

    it("says the headline covers the part-period it came from", () => {
      // The backend picks `latest` from every readable point INCLUDING the
      // accruing one, while the plot drops it. The card led with "6.37 —
      // worsening" over a chart whose last bar was July: a number on no bar the
      // reader could find, so the tab read as a month behind while actually
      // reporting today. This is that exact case.
      queryMock.mockReturnValue({
        data: response({
          bucket: "month",
          inProgressBucket: "2026-08-01",
          groups: [
            group({
              series: [
                series({
                  points: [
                    {
                      bucket: "2026-06-01",
                      numerator: 10,
                      denominator: 500,
                      value: 0.02,
                      sparse: false,
                    },
                    {
                      bucket: "2026-07-01",
                      numerator: 30,
                      denominator: 500,
                      value: 0.06,
                      sparse: false,
                    },
                    // Two-thirds of the month in — real, and not on the plot.
                    {
                      bucket: "2026-08-01",
                      numerator: 21,
                      denominator: 300,
                      value: 0.07,
                      sparse: false,
                    },
                  ],
                  latest: 0.07,
                  previous: 0.06,
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

      expect(screen.getByText("this month so far")).toBeInTheDocument();
    });

    it("does not qualify a headline that came from a complete period", () => {
      render(<WeakPerformingMetricsTab {...filters} />);
      expect(screen.queryByText(/so far$/)).not.toBeInTheDocument();
    });
  });

  describe("granularity the range can actually support", () => {
    /**
     * A monthly bucket over a 30-day window can only produce the month
     * containing today, which is the bucket every chart here drops — so the
     * whole tab rendered "No data in this window" on all 21 series while the
     * data behind them was fine. The combination must not be offerable.
     */
    it("does not ask the API for months when the range is 30 days", () => {
      render(<WeakPerformingMetricsTab {...filters} query={{ range: "30d" }} />);
      expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ bucket: "week" }));
      expect(queryMock).not.toHaveBeenCalledWith(expect.objectContaining({ bucket: "month" }));
    });

    it("keeps months on offer for a range that can fill one", () => {
      render(<WeakPerformingMetricsTab {...filters} query={{ range: "12m" }} />);
      expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ bucket: "month" }));
    });

    /**
     * 90 days is the page default, and 90 days of months holds at most two
     * complete buckets — the window spans three and the newest is always
     * accruing. That is the default view of the whole tab, and no line
     * threshold can rescue two points. Weeks make the same window about twelve
     * buckets.
     */
    it("opens 90 days on weeks, which the window can actually fill", () => {
      render(<WeakPerformingMetricsTab {...filters} query={{ range: "90d" }} />);
      expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ bucket: "week" }));
    });

    it("still offers months on 90 days, and honours the pick", async () => {
      const user = userEvent.setup();
      render(<WeakPerformingMetricsTab {...filters} query={{ range: "90d" }} />);

      await user.click(screen.getByRole("combobox", { name: /granularity/i }));
      await user.click(screen.getByRole("option", { name: "By month" }));

      // See the model picker test: the pick reaches the query args through an
      // effect, one flush after the click resolves.
      await waitFor(() =>
        expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ bucket: "month" })),
      );
    });
  });

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
                  {
                    bucket: "2026-07-01",
                    numerator: 20,
                    denominator: 100,
                    value: 0.2,
                    sparse: false,
                  },
                  {
                    bucket: "2026-08-01",
                    numerator: 10,
                    denominator: 100,
                    value: 0.1,
                    sparse: false,
                  },
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
    expect(screen.getByText(/widen the time range to see a trend/i)).toBeInTheDocument();
  });

  /**
   * Boundary of MIN_BUCKETS_FOR_A_LINE, which moved 5 -> 4.
   *
   * The rule exists to stop a single slope being drawn as a trend; it was
   * denying a line to the drift-derived series, which is the densest data on
   * the tab and had four complete months behind it.
   */
  it("still draws columns at three buckets", () => {
    const pts = ["2026-05", "2026-06", "2026-07"].map((m, i) => ({
      bucket: `${m}-01`,
      numerator: i,
      denominator: 100,
      value: i / 100,
      sparse: false,
    }));
    queryMock.mockReturnValue({
      data: response({
        groups: [group({ series: [series({ points: pts, latest: 0.02, previous: 0.01 })] })],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/widen the time range to see a trend/i)).toBeInTheDocument();
  });

  it("draws a line at four buckets", () => {
    const pts = ["2026-04", "2026-05", "2026-06", "2026-07"].map((m, i) => ({
      bucket: `${m}-01`,
      numerator: i,
      denominator: 100,
      value: i / 100,
      sparse: false,
    }));
    queryMock.mockReturnValue({
      data: response({
        groups: [group({ series: [series({ points: pts, latest: 0.03, previous: 0.02 })] })],
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
    render(<WeakPerformingMetricsTab {...filters} />);
    // The "not a trend" caption belongs to the columns form; a line must not
    // carry it.
    expect(screen.queryByText(/widen the time range to see a trend/i)).not.toBeInTheDocument();
  });

  it("draws a line once there are five or more buckets", () => {
    const pts = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"].map((m, i) => ({
      bucket: `${m}-01`,
      numerator: i,
      denominator: 100,
      value: i / 100,
      sparse: false,
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
                points: [
                  {
                    bucket: "2026-08-01",
                    numerator: 5,
                    denominator: 100,
                    value: 0.05,
                    sparse: false,
                  },
                ],
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
    expect(screen.getByText(/One complete month in this window/i)).toBeInTheDocument();
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
                  {
                    bucket: "2026-07-01",
                    numerator: 4,
                    denominator: 93,
                    value: 0.043,
                    sparse: false,
                  },
                  { bucket: "2026-08-01", numerator: 0, denominator: 97, value: 0, sparse: false },
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
    // Twice over: this fixture's caveat is itself "Not instrumented.", and the
    // suppressed plot now says so in the plot area as well.
    expect(screen.getAllByText(/Not instrumented/).length).toBeGreaterThan(0);
  });

  /**
   * The card above only ever looked right because its fixture caveat happened
   * to read "Not instrumented." too, and a caveat renders as the caption. With
   * any other caveat the visual field went blank: a not-measured series is
   * suppressed from plotting, but the card's empty state was decided from the
   * row count, which is not zero here. The explanation has to come from the
   * same decision that suppressed the plot.
   */
  it("explains the instrumentation gap in the plot area, not just in the caption", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                id: "barge_in",
                state: "none",
                caveat: "Segment by model or this misleads.",
                points: [
                  {
                    bucket: "2026-07-01",
                    numerator: 4,
                    denominator: 93,
                    value: 0.043,
                    sparse: false,
                  },
                  { bucket: "2026-08-01", numerator: 0, denominator: 97, value: 0, sparse: false },
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
    expect(screen.getByText(/nothing is being recorded for this metric yet/i)).toBeInTheDocument();
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
    const user = userEvent.setup();
    render(<WeakPerformingMetricsTab {...filters} />);

    // The picker is addressed by role and label, not by its "All models" text.
    // That string is on the trigger AND on the "" item, so a text query becomes
    // ambiguous the moment the menu opens — and `findByText` for an option
    // returns the inner text <div>, while Carbon puts Downshift's click handler
    // on the <li role="option"> around it.
    await user.click(screen.getByRole("combobox", { name: /model/i }));
    await user.click(await screen.findByRole("option", { name: "gpt-4.1-mini" }));

    // waitFor, not a bare assertion: Carbon does not call `onChange` from the
    // click handler. Downshift raises it from the effect in its enhanced
    // reducer, so `setLlmModel` — and the refetch on the new args — lands an
    // effect flush after the click promise resolves. Asserting synchronously
    // reads whichever call happened to be last, which on a loaded machine is
    // the unfiltered first render.
    await waitFor(() =>
      expect(queryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ llmModel: "gpt-4.1-mini" }),
      ),
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
    expect(screen.getByText(/Could not load actor quality metrics/)).toBeInTheDocument();
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

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: /prompt version/i }));
    expect(screen.getByRole("option", { name: "Prompt v16" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Prompt v17" }));

    // See the model picker test: the pick reaches the query args through an
    // effect, one flush after the click resolves.
    await waitFor(() =>
      expect(queryMock).toHaveBeenLastCalledWith(expect.objectContaining({ promptVersion: "17" })),
    );
  });

  /**
   * A single judge version on screen was how the language series came to be
   * read through the drift judge's pin. The tab must name each family, and must
   * say "not run" rather than silently omitting one that has no rows yet.
   */
  it("names the judge version of every family, including one not yet run", () => {
    render(<WeakPerformingMetricsTab {...filters} />);

    // The versions moved out of the header and into the provenance tooltip —
    // still one per family, still saying "not run" rather than omitting one.
    const provenance = screen.getByRole("button", { name: /Judge \(drift\)/ });
    expect(provenance).toHaveAccessibleName(/Judge \(drift\): gemini-2\.5-pro\/v2/);
    expect(provenance).toHaveAccessibleName(/Judge \(language\): gemini-2\.5-pro\/v1/);
    expect(provenance).toHaveAccessibleName(/Judge \(groundedness\): not run/);
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
    const caption = screen.getByText("Actor turns that repeat something the actor already said.");
    expect(caption.tagName).toBe("P");

    // The caveat is still in the document — Carbon renders tooltip content
    // inline — but inside the popover rather than as the card's caption.
    const caveat = screen.getByText(/Segment by model or this misleads/);
    expect(caveat.className).toContain("tooltip-content");
  });

  /**
   * Direction is carried by the metric's NAME, not by a caption repeating it.
   * "Comprehension errors" is plainly a thing you want less of; printing
   * "lower is better" underneath restated the title on all 22 cards. What still
   * has to work is the delta, which describes the movement that happened.
   */
  it("does not caption cards with a standing direction rule", () => {
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.queryByText("lower is better")).not.toBeInTheDocument();
    expect(screen.queryByText("higher is better")).not.toBeInTheDocument();
    // The movement is still described, using lowerIsBetter under the hood.
    expect(screen.getByText(/worsening/)).toBeInTheDocument();
  });

  it("blames the window for a short series, not the data", () => {
    // Was: "2 measured buckets — compared, not trended: too few points to read
    // a direction." Reported as not understandable, and it is jargon twice over.
    // Then "2 months of data so far", which was understandable and WRONG: on the
    // default 90-day range every healthy series says it, and readers took it to
    // mean the metric had only just started being collected. The reader's next
    // move is the range picker, so the sentence has to point there.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                points: [
                  {
                    bucket: "2026-06-01",
                    numerator: 10,
                    denominator: 500,
                    value: 0.02,
                    sparse: false,
                  },
                  {
                    bucket: "2026-07-01",
                    numerator: 30,
                    denominator: 500,
                    value: 0.06,
                    sparse: false,
                  },
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

    expect(
      screen.getByText("2 complete months in this window — widen the time range to see a trend."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/compared, not trended/)).not.toBeInTheDocument();
  });

  it("carries no banner, and keeps provenance at the foot", () => {
    // The header was six lines: mix warning, parameter version, the reasoning
    // for pinning it, and three judge versions — above the numbers.
    render(<WeakPerformingMetricsTab {...filters} />);

    // No standing banner at all now: the mix warning it carried lives on the
    // repetition card's own caveat, where it is actionable rather than furniture.
    expect(screen.queryByText(/Segment before reading/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Thresholds define these metrics/)).not.toBeInTheDocument();
    // Provenance stays reachable, at the foot rather than above the numbers.
    expect(screen.getByRole("button", { name: /Parameters v1/ })).toBeInTheDocument();
  });

  /**
   * A metric with no good direction must report the movement and stop.
   *
   * Barge-in is the case that forced this. Interruption is ordinary
   * conversation, and its rate turned out flat at 2.5-2.8% across every actor
   * turn length above 100 characters, dropping only on turns too short to
   * interrupt — so it measures the opportunity to cut in, not whether the actor
   * deserved it. Calling a rise "worsening" there is a verdict we cannot
   * support.
   */
  it("reports movement without a verdict when there is no good direction", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                id: "barge_in",
                label: "Barge-ins",
                lowerIsBetter: null,
                latest: 0.03,
                previous: 0.02,
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

    expect(screen.getByText("↑ 1.0%")).toBeInTheDocument();
    expect(screen.queryByText(/worsening/)).not.toBeInTheDocument();
    expect(screen.queryByText(/improving/)).not.toBeInTheDocument();
  });

  /**
   * The state that sent us hunting for a bug that was not there.
   *
   * Filtering to Hindi blanked the whole Language realism group. It had 437
   * judged turns behind it and had found zero register, translationese and
   * lexicon errors — but zero-height bars look exactly like no bars, so a real
   * clean result read as a broken chart. "Not measured" and "measured, nothing
   * found" must never render the same, which is the rule the rest of this tab
   * already follows.
   */
  it("says nothing was found rather than drawing invisible zero bars", () => {
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                label: "Over-formal speech",
                unit: "per100turns",
                points: [
                  { bucket: "2026-07-01", numerator: 0, denominator: 297, value: 0, sparse: false },
                  { bucket: "2026-08-01", numerator: 0, denominator: 140, value: 0, sparse: false },
                ],
                latest: 0,
                previous: 0,
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

    expect(screen.getByText(/None found across 437 turns judged/)).toBeInTheDocument();
    // Still measured, and still showing the zero as its headline.
    expect(screen.getAllByText("Measured").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Not instrumented — nothing is being recorded for this metric yet."),
    ).not.toBeInTheDocument();
  });

  it("keeps drawing a chart when a zero sits alongside real values", () => {
    // Only an ALL-zero series is a "nothing found" result. One empty month
    // among real ones is part of a trend and must still plot.
    queryMock.mockReturnValue({
      data: response({
        groups: [
          group({
            series: [
              series({
                points: [
                  { bucket: "2026-06-01", numerator: 0, denominator: 500, value: 0, sparse: false },
                  {
                    bucket: "2026-07-01",
                    numerator: 30,
                    denominator: 500,
                    value: 0.06,
                    sparse: false,
                  },
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

    expect(screen.queryByText(/None found across/)).not.toBeInTheDocument();
  });
});

/**
 * The turn-conditions panel is the only place on this tab that compares turns
 * against other turns rather than one population against another. Its whole
 * value is that a reader can scan it — so what it must get right is the order,
 * the units, and never showing a raw key where a person expects a word.
 */
describe("WeakPerformingMetricsTab turn conditions", () => {
  const factor = (o: Partial<WeakMetricTurnFactor> = {}): WeakMetricTurnFactor => ({
    id: "responseLatencyMs",
    label: "How long the actor took to reply",
    description: "Wall-clock time from the learner finishing to the reply starting.",
    unit: "ms",
    spread: 0.33,
    bands: [
      { band: "q1", lo: 467, hi: 2979, turns: 694, faults: 197, rate: 0.284 },
      { band: "q2", lo: 2983, hi: 5348, turns: 693, faults: 116, rate: 0.167 },
      { band: "q4", lo: 8690, hi: 44331, turns: 693, faults: 345, rate: 0.498 },
    ],
    ...o,
  });

  const withConditions = (o: Partial<WeakMetricsResponse["turnConditions"]>) => {
    queryMock.mockReturnValue({
      data: response({
        turnConditions: { totalTurns: 2080, baselineRate: 0.316, factors: [factor()], ...o },
      }),
      isFetching: false,
      isError: false,
      refetch: refetchMock,
    });
  };

  it("reads milliseconds back as seconds once they pass a second", () => {
    // "5.8s" is a duration a person holds in their head; "5842ms" is a
    // measurement they have to convert before it means anything.
    withConditions({});
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText("3.0s – 5.3s")).toBeInTheDocument();
    // Below a second it stays in milliseconds rather than reading "0.5s".
    expect(screen.getByText("467ms – 3.0s")).toBeInTheDocument();
  });

  it("names a yes/no band instead of showing its key", () => {
    withConditions({
      factors: [
        factor({
          id: "knowledgeRetrieval",
          unit: "flag",
          bands: [
            { band: "skipped", lo: null, hi: null, turns: 859, faults: 129, rate: 0.15 },
            { band: "fired", lo: null, hi: null, turns: 1819, faults: 709, rate: 0.39 },
          ],
        }),
      ],
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText("Did not run")).toBeInTheDocument();
    expect(screen.getByText("Ran")).toBeInTheDocument();
    expect(screen.queryByText("fired")).not.toBeInTheDocument();
  });

  it("states the separation as a ratio a reader can repeat", () => {
    withConditions({});
    render(<WeakPerformingMetricsTab {...filters} />);
    // 0.498 / 0.167
    expect(screen.getByText(/faults 3.0× as often as the best/)).toBeInTheDocument();
  });

  it("falls back to percentage points rather than reporting an infinite ratio", () => {
    // A band with no faults at all is a real and common result — dividing by it
    // would put "Infinity×" on the page.
    withConditions({
      factors: [
        factor({
          bands: [
            { band: "q1", lo: 100, hi: 200, turns: 300, faults: 0, rate: 0 },
            { band: "q2", lo: 201, hi: 400, turns: 300, faults: 60, rate: 0.2 },
          ],
        }),
      ],
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText(/20.0 points between the worst band and the best/)).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
  });

  it("keeps the server's ordering rather than re-sorting in the client", () => {
    // The sort IS the finding — the backend ranks by how much each condition
    // separates its bands. A client that re-sorted would quietly bury it.
    withConditions({
      factors: [
        factor({ id: "a", label: "First by spread", spread: 0.4 }),
        factor({ id: "b", label: "Second by spread", spread: 0.1 }),
      ],
    });
    render(<WeakPerformingMetricsTab {...filters} />);

    const body = document.body.textContent ?? "";
    expect(body.indexOf("First by spread")).toBeLessThan(body.indexOf("Second by spread"));
  });

  it("explains an empty panel instead of rendering a blank section", () => {
    withConditions({ totalTurns: 0, baselineRate: null, factors: [] });
    render(<WeakPerformingMetricsTab {...filters} />);

    expect(screen.getByText(/Turn metrics start on 10 June 2026/)).toBeInTheDocument();
  });

  it("shows the baseline the bands are read against", () => {
    withConditions({});
    render(<WeakPerformingMetricsTab {...filters} />);
    expect(screen.getByText(/2,080 judged turns/)).toBeInTheDocument();
    expect(screen.getByText(/31.6% carried a judge fault/)).toBeInTheDocument();
  });
});
