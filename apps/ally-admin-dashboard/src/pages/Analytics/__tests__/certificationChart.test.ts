import { describe, expect, it } from "vitest";

import { CertificationMonth, CertificationResponse } from "@types";

import {
  CERTIFICATION_GROUPS,
  PIPELINE_RAMP,
  buildCertificationSeries,
  buildCertificationTable,
  buildPipelineBars,
  buildPipelineScale,
  buildPipelineTable,
  certificationTakeaway,
  monthLabel,
  pipelineTotal,
  plottableCertificationMonths,
} from "../certificationChart";

const LEVEL = { id: "L1", label: "L1 Ally Certified", minMinutes: 5000 };

const PIPELINE = [
  { label: "Under 500 min", minMinutes: 0, maxMinutes: 500, minFraction: 0, learners: 80 },
  { label: "500–1,500 min", minMinutes: 500, maxMinutes: 1500, minFraction: 0.1, learners: 25 },
  { label: "1,500–3,000 min", minMinutes: 1500, maxMinutes: 3000, minFraction: 0.3, learners: 10 },
  { label: "3,000–4,500 min", minMinutes: 3000, maxMinutes: 4500, minFraction: 0.6, learners: 4 },
  { label: "4,500–5,000 min", minMinutes: 4500, maxMinutes: 5000, minFraction: 0.9, learners: 1 },
];

const month = (
  m: string,
  newlyCertified: number,
  cumulativeCertified: number,
  partial = false,
): CertificationMonth => ({ month: m, newlyCertified, cumulativeCertified, partial });

const response = (overrides: Partial<CertificationResponse> = {}): CertificationResponse => ({
  levels: [LEVEL],
  level: LEVEL,
  months: [],
  currentMonth: "2024-06-01",
  certified: 0,
  learners: 120,
  pipeline: PIPELINE,
  nearestMinutes: 0,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T12:00:00.000Z",
  ...overrides,
});

describe("monthLabel", () => {
  it("formats a first-of-month key in UTC", () => {
    expect(monthLabel("2024-06-01")).toBe("Jun 2024");
  });

  it("does not slip a month in a behind-UTC timezone", () => {
    // A naive `new Date("2024-01-01")` rendered in local time reads as Dec 2023
    // west of Greenwich, which silently shifts every bar on the axis.
    expect(monthLabel("2024-01-01")).toBe("Jan 2024");
  });

  it("passes an unparseable key straight through", () => {
    expect(monthLabel("not-a-month")).toBe("not-a-month");
  });
});

describe("plottableCertificationMonths", () => {
  it("drops the in-progress month, which can only grow", () => {
    const data = response({
      months: [month("2024-04-01", 1, 1), month("2024-05-01", 2, 3), month("2024-06-01", 0, 3, true)],
    });

    expect(plottableCertificationMonths(data).map(m => m.month)).toEqual([
      "2024-04-01",
      "2024-05-01",
    ]);
  });

  it("is empty with no data rather than throwing", () => {
    expect(plottableCertificationMonths(undefined)).toEqual([]);
  });
});

describe("buildCertificationSeries", () => {
  const months = [month("2024-04-01", 1, 1), month("2024-05-01", 2, 3)];

  it("emits both series over exactly the same months", () => {
    const series = buildCertificationSeries(months);

    const bars = series.filter(p => p.group === CERTIFICATION_GROUPS.newlyCertified);
    const line = series.filter(p => p.group === CERTIFICATION_GROUPS.totalCertified);

    expect(bars.map(p => p.key)).toEqual(["Apr 2024", "May 2024"]);
    expect(line.map(p => p.key)).toEqual(["Apr 2024", "May 2024"]);
  });

  it("maps the monthly count to the bars and the running total to the line", () => {
    const series = buildCertificationSeries(months);

    expect(
      series.filter(p => p.group === CERTIFICATION_GROUPS.newlyCertified).map(p => p.value),
    ).toEqual([1, 2]);
    expect(
      series.filter(p => p.group === CERTIFICATION_GROUPS.totalCertified).map(p => p.value),
    ).toEqual([1, 3]);
  });

  it("keeps a zero month on the axis", () => {
    const series = buildCertificationSeries([month("2024-04-01", 0, 5)]);

    expect(series.find(p => p.group === CERTIFICATION_GROUPS.newlyCertified)?.value).toBe(0);
  });
});

describe("the pipeline panel", () => {
  it("builds one bar per band, lowest first", () => {
    expect(buildPipelineBars(response()).map(b => b.group)).toEqual(PIPELINE.map(b => b.label));
    expect(buildPipelineBars(response()).map(b => b.value)).toEqual([80, 25, 10, 4, 1]);
  });

  it("ramps one hue over the bands so darker means closer", () => {
    const scale = buildPipelineScale(response());

    expect(scale[PIPELINE[0].label]).toBe(PIPELINE_RAMP[0]);
    expect(scale[PIPELINE[4].label]).toBe(PIPELINE_RAMP[4]);
  });

  it("totals the uncertified population", () => {
    expect(pipelineTotal(response())).toBe(120);
    expect(pipelineTotal(undefined)).toBe(0);
  });

  it("states each band as a percentage of the threshold in the export table", () => {
    const table = buildPipelineTable(response());

    expect(table.rows[0]).toEqual(["Under 500 min", "0–10%", 80]);
    expect(table.rows[4]).toEqual(["4,500–5,000 min", "90–100%", 1]);
  });
});

describe("certificationTakeaway", () => {
  it("says how close the nearest learner is when nobody has certified", () => {
    const takeaway = certificationTakeaway(
      response({ certified: 0, nearestMinutes: 4800, months: [month("2024-05-01", 0, 0)] }),
    );

    expect(takeaway).toContain("Nobody has reached L1 Ally Certified yet");
    expect(takeaway).toContain("4,800 of 5,000 minutes");
    expect(takeaway).toContain("96%");
  });

  it("distinguishes 'nobody has practised' from 'nobody has got there'", () => {
    const takeaway = certificationTakeaway(response({ certified: 0, nearestMinutes: 0 }));

    expect(takeaway).toContain("Nobody has practised toward");
  });

  it("leads with the headline count and the latest complete month's gain", () => {
    const takeaway = certificationTakeaway(
      response({
        certified: 12,
        months: [month("2024-04-01", 3, 9), month("2024-05-01", 3, 12), month("2024-06-01", 0, 12, true)],
      }),
    );

    expect(takeaway).toContain("12 learners hold L1 Ally Certified");
    expect(takeaway).toContain("3 newly certified in May 2024");
  });

  it("reads the latest COMPLETE month, never the in-progress one", () => {
    // The in-progress month is still accruing, so reporting its zero as the
    // month's result would claim a stall that has not happened.
    const takeaway = certificationTakeaway(
      response({
        certified: 4,
        months: [month("2024-05-01", 4, 4), month("2024-06-01", 0, 4, true)],
      }),
    );

    expect(takeaway).toContain("4 newly certified in May 2024");
  });

  it("says so plainly when the last complete month added nobody", () => {
    const takeaway = certificationTakeaway(
      response({ certified: 7, months: [month("2024-05-01", 0, 7)] }),
    );

    expect(takeaway).toContain("7 learners hold");
    expect(takeaway).toContain("None newly certified in the last complete month");
  });

  it("agrees with itself on a single learner", () => {
    const takeaway = certificationTakeaway(
      response({ certified: 1, months: [month("2024-05-01", 1, 1)] }),
    );

    expect(takeaway).toContain("1 learner holds");
    expect(takeaway).not.toContain("learners hold");
  });

  it("is undefined before the response lands", () => {
    expect(certificationTakeaway(undefined)).toBeUndefined();
  });
});

describe("buildCertificationTable", () => {
  it("keeps the in-progress month the chart drops, flagged", () => {
    const table = buildCertificationTable(
      response({ months: [month("2024-05-01", 2, 2), month("2024-06-01", 1, 3, true)] }),
    );

    expect(table.rows).toHaveLength(2);
    expect(table.rows[1][0]).toBe("Jun 2024 (in progress)");
    expect(table.rows[1][2]).toBe(3);
  });
});
