import { LineChart, ScatterChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Carbon draws through d3, which captures `window.requestAnimationFrame` at
 * IMPORT time and then uses the captured reference for every transition. Those
 * transition callbacks reach into SVG geometry (`.baseVal`) that jsdom does not
 * implement, and they run after the render this file is asserting on — so they
 * surface as unhandled errors from inside the library and fail the run.
 *
 * Hoisted, because a `beforeAll` stub is installed after d3 has already taken its
 * copy. Suppressing the frame keeps the first synchronous render — the part that
 * throws on a malformed options object, which is the whole point of this file —
 * and drops only the animation, which cannot run in jsdom regardless.
 */
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import { barOpts, hBarOpts, lineOpts, scatterOpts, stackedBarOpts, timeBarOpts } from "../chartKit";
import {
  COMPETENCY_SCALE,
  COMPLETION_SCALE,
  PCT_DOMAIN,
  PRACTISING_SCALE,
  RATING_BAND_SCALE,
  SCORE_DOMAIN,
  SCRIBE_ORGS_SCALE,
  SHARED_SCALE,
  SKILL_GROWTH_SCALE,
  TESTING_GROUPS,
  buildCompetencyScatter,
  buildCompletionRateSeries,
  buildItemTypeBars,
  buildItemTypeScale,
  buildLanguageMixScale,
  buildLanguageMixSeries,
  buildPractisingLearnersSeries,
  buildQualityBandSeries,
  buildRankedBarScale,
  buildSatisfactionMixSeries,
  buildScribeOrgsSeries,
  buildSharedSessionsSeries,
  buildSkillGrowthSeries,
  buildTimeToFirstBars,
  buildTimeToFirstScale,
} from "../testingChart";

/**
 * Mounts every chart on the Testing tab with data shaped exactly as the server
 * returns it.
 *
 * The typechecker cannot see inside a Carbon options object — `axes.bottom.mapsTo`
 * and the scale types are plain strings to it — so a chart can typecheck and still
 * throw on render. That matters most for the two shapes this tab introduces: a
 * scatter with two measured axes (the only chart here whose x-axis is a quantity)
 * and a 100%-stacked bar built from client-computed shares.
 *
 * The series come from the real builders rather than hand-written literals, so a
 * builder that starts emitting a field Carbon does not understand fails here.
 */

describe("Testing tab charts render with server-shaped data", () => {
  it("plots the north-star line", () => {
    const series = buildPractisingLearnersSeries([
      { bucket: "2026-06-08", learners: 0, sessions: 0 },
      { bucket: "2026-06-15", learners: 12, sessions: 31 },
    ]);
    const { container } = render(
      <LineChart
        data={series}
        options={lineOpts({ leftTitle: "Learners", colorScale: PRACTISING_SCALE, legend: false })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots a completion-rate line whose empty buckets are gaps, not zeros", () => {
    const series = buildCompletionRateSeries([
      { bucket: "2026-06-01", started: 10, completed: 8, abandoned: 2, completionRatePct: 80 },
      { bucket: "2026-07-01", started: 0, completed: 0, abandoned: 0, completionRatePct: null },
    ]);
    expect(series.some(d => d.value === null)).toBe(true);
    const { container } = render(
      <LineChart
        data={series}
        options={lineOpts({
          leftTitle: "Completed of started (%)",
          colorScale: COMPLETION_SCALE,
          legend: false,
          domain: PCT_DOMAIN,
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the skill-growth median with its interquartile band", () => {
    const series = buildSkillGrowthSeries(
      [
        {
          ordinal: 1,
          all: { median: 61, p25: 52, p75: 70, n: 120 },
          experienced: { median: 60, p25: 51, p75: 69, n: 40 },
        },
        {
          ordinal: 2,
          all: { median: 65, p25: 57, p75: 73, n: 90 },
          experienced: { median: 66, p25: 58, p75: 74, n: 40 },
        },
      ],
      "all",
    );
    const { container } = render(
      <LineChart
        data={series}
        options={lineOpts({
          leftTitle: "Composite score",
          bottomTitle: "Session number for that learner",
          colorScale: SKILL_GROWTH_SCALE,
          domain: SCORE_DOMAIN,
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the quality band with suppressed periods left as gaps", () => {
    const series = buildQualityBandSeries([
      { bucket: "2026-06-01", median: null, p25: null, p75: null, evaluatedSessions: 3 },
      { bucket: "2026-07-01", median: 72, p25: 64, p75: 80, evaluatedSessions: 210 },
    ]);
    const { container } = render(
      <LineChart
        data={series}
        options={lineOpts({ colorScale: SKILL_GROWTH_SCALE, domain: SCORE_DOMAIN })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the time-to-first bands with the grey residual bar", () => {
    const ttf = {
      bands: [
        { label: "Same day", minDays: 0, maxDays: 0 },
        { label: "1–3", minDays: 1, maxDays: 3 },
        { label: "31+", minDays: 31, maxDays: null },
      ],
      learnersByBand: [10, 4, 1],
      neverPractised: 85,
      boundsNote: "Both bounds inclusive.",
      cumulative: [],
    };
    const bars = buildTimeToFirstBars(ttf);
    const { container } = render(
      <SimpleBarChart
        data={bars}
        options={barOpts({
          leftTitle: "Learners",
          bottomTitle: "Days to first session",
          colorScale: buildTimeToFirstScale(ttf),
        })}
      />,
    );
    expect(bars[bars.length - 1].group).toBe(TESTING_GROUPS.neverPractised);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the satisfaction mix as a 100% stack", () => {
    const series = buildSatisfactionMixSeries([
      {
        bucket: "2026-06-01",
        low: 1,
        mid: 1,
        high: 2,
        responses: 4,
        top2BoxPct: 50,
        completedSessions: 6,
        responseRatePct: 66.7,
      },
    ]);
    const { container } = render(
      <StackedBarChart
        data={series}
        options={stackedBarOpts({
          leftTitle: "Share of ratings (%)",
          colorScale: RATING_BAND_SCALE,
          domain: PCT_DOMAIN,
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the language mix from server counts and totals", () => {
    const labels = ["Hindi", "English", "Unknown"];
    const series = buildLanguageMixSeries(
      labels,
      [
        { bucket: "2026-06-01", label: "Hindi", sessions: 30 },
        { bucket: "2026-06-01", label: "English", sessions: 20 },
      ],
      [{ bucket: "2026-06-01", sessions: 50 }],
    );
    const { container } = render(
      <StackedBarChart
        data={series}
        options={stackedBarOpts({
          leftTitle: "Share of sessions (%)",
          colorScale: buildLanguageMixScale(labels),
          domain: PCT_DOMAIN,
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the competency scatter on two measured axes", () => {
    const points = buildCompetencyScatter([
      {
        competencyId: "c1",
        name: "Active listening",
        completedSessions: 420,
        evaluatedSessions: 300,
        medianScore: 74,
        learners: 60,
        scenarios: 8,
        belowFloor: false,
      },
      {
        competencyId: "c2",
        name: "De-escalation",
        completedSessions: 40,
        evaluatedSessions: 30,
        medianScore: 58,
        learners: 12,
        scenarios: 2,
        belowFloor: false,
      },
    ]);
    const { container } = render(
      <ScatterChart
        data={points}
        options={scatterOpts({
          leftTitle: "Median composite score",
          bottomTitle: "Completed sessions",
          colorScale: COMPETENCY_SCALE,
          domain: SCORE_DOMAIN,
        })}
      />,
    );
    expect(points).toHaveLength(2);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots track drop-off as a bounded horizontal bar", () => {
    const rows = [
      {
        type: "ROLEPLAY",
        reached: 200,
        completed: 150,
        completionRatePct: 75,
        learners: 60,
        belowFloor: false,
      },
      {
        type: "QUIZ",
        reached: 180,
        completed: 72,
        completionRatePct: 40,
        learners: 55,
        belowFloor: false,
      },
    ];
    const bars = buildItemTypeBars(rows);
    const { container } = render(
      <SimpleBarChart
        data={bars}
        options={hBarOpts({
          bottomTitle: "Completed of reached (%)",
          colorScale: buildItemTypeScale(bars),
          domain: PCT_DOMAIN,
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the ranked tag bars", () => {
    const bars = [
      { group: "voice quality", value: 12 },
      { group: "unrealistic client", value: 5 },
    ];
    const { container } = render(
      <SimpleBarChart
        data={bars}
        options={hBarOpts({
          bottomTitle: "Low-rated sessions",
          colorScale: buildRankedBarScale(bars),
        })}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("plots the coaching and scribe time-bucketed bars", () => {
    const shared = buildSharedSessionsSeries([
      {
        bucket: "2026-06-01",
        sharedSessions: 12,
        completedSessions: 100,
        sharePct: 12,
        reviewsWithComment: 8,
        medianHoursToFirstComment: 14,
        p90HoursToFirstComment: 40,
        comments: 20,
      },
    ]);
    const scribe = buildScribeOrgsSeries([
      { bucket: "2026-06-01", orgs: 3, counsellors: 9, sessions: 40 },
    ]);
    const { container } = render(
      <div>
        <SimpleBarChart
          data={shared}
          options={timeBarOpts({ leftTitle: "Sessions shared", colorScale: SHARED_SCALE })}
        />
        <SimpleBarChart
          data={scribe}
          options={timeBarOpts({ leftTitle: "Organisations", colorScale: SCRIBE_ORGS_SCALE })}
        />
      </div>,
    );
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });
});
