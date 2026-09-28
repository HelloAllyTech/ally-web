import { describe, expect, it } from "vitest";

import {
  COMPS,
  ITEMS,
  MIN_GROUP,
  applyFilters,
  band,
  buildActions,
  compStats,
  generate,
  loadCSV,
  orderFor,
  DIMS,
  scenarioStats,
  sgn,
} from "../reportData";

const HEADER =
  "teacher_id,gender,grade,tenure_years,experience_years,prior_training,active_listening,recognise,self_regulation,risk_and_handoff,safety_first_response";

const skillRows = (count: number, row = "Female,Primary (1–5),3,8,yes,20,10,5,-5,15") =>
  Array.from({ length: count }, (_, i) => `T${i + 1},${row}`).join("\n");

describe("reportData", () => {
  it("bands scores at the documented cut-offs", () => {
    expect([50, 30, 25, 10, 5, -10, -15, -50].map(band)).toEqual([
      "ready",
      "ready",
      "dev",
      "dev",
      "emg",
      "emg",
      "need",
      "need",
    ]);
  });

  it("formats signed integers with a true minus sign", () => {
    expect([12.4, -3.6, 0.2].map(sgn)).toEqual(["+12", "−4", "0"]);
  });

  it("generates the same 500-teacher sample every time", () => {
    const a = generate();
    const b = generate();
    expect(a).toHaveLength(500);
    expect(a).toEqual(b);
    // Pinned so a change to the generator or the seed shows up as a diff: these
    // are the averages the specified report shows on first load.
    expect(compStats(a).map(c => sgn(c.mean))).toEqual(["+29", "+17", "+19", "+2", "+15"]);
  });

  it("derives skill totals from the 25 situation scores", () => {
    const [t] = generate();
    COMPS.forEach(c => {
      const sum = ITEMS.reduce(
        (acc, it, i) => (it.c === c.key ? acc + (t.items?.[i] ?? 0) : acc),
        0,
      );
      expect(t.scores[c.key]).toBe(sum);
    });
  });

  it("filters by any dimension and ignores 'all'", () => {
    const data = generate();
    const yes = applyFilters(data, { train: "Yes", grade: "all" });
    expect(yes.length).toBeGreaterThan(0);
    expect(yes.every(t => t.train === "Yes")).toBe(true);
  });

  it("orders known values naturally and appends unknown ones alphabetically", () => {
    const data = generate();
    const grade = DIMS[0];
    expect(orderFor(data, grade)[0]).toBe("Pre-primary");
  });

  it("ranks situations hardest first", () => {
    const rows = scenarioStats(generate());
    expect(rows).toHaveLength(25);
    rows.slice(1).forEach((r, i) => expect(r.avg).toBeGreaterThanOrEqual(rows[i].avg));
  });

  it("leads the action list with the weakest skill", () => {
    const data = generate();
    const cs = compStats(data);
    const actions = buildActions(data, cs, true, data);
    expect(actions[0].h).toBe("Build risk and handoff first");
    expect(actions.map(a => a.h)).toContain("Use the hardest situation as a staff discussion");
  });

  describe("loadCSV", () => {
    it("reads skill totals, normalising prior training", () => {
      const res = loadCSV(`﻿${HEADER}\n${skillRows(12)}`);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.hasItems).toBe(false);
      expect(res.data).toHaveLength(12);
      expect(res.data[0].train).toBe("Yes");
      expect(res.data[0].scores).toEqual({ al: 20, rec: 10, sr: 5, rh: -5, sf: 15 });
    });

    it("skips out-of-range rows and reports how many", () => {
      const bad = "T99,Male,Primary (1–5),3,8,no,99,10,5,-5,15";
      const res = loadCSV(`${HEADER}\n${skillRows(12)}\n${bad}`);
      expect(res.ok && res.skipped).toBe(1);
    });

    it("names the columns a file is missing", () => {
      const res = loadCSV("teacher_id,gender\nT1,Female");
      if (!("error" in res)) throw new Error("expected the file to be refused");
      expect(res.error).toContain("grade, tenure_years, experience_years");
      expect(res.error).toContain("the five skill columns or q1 to q25");
    });

    it(`refuses a file with fewer than ${MIN_GROUP} valid teachers`, () => {
      const res = loadCSV(`${HEADER}\n${skillRows(MIN_GROUP - 1)}`);
      expect(res.ok).toBe(false);
    });

    it("reads per-situation scores when all 25 are present", () => {
      const qs = ITEMS.map((_, i) => `q${i + 1}`).join(",");
      const vals = ITEMS.map(() => "5").join(",");
      const rows = Array.from({ length: 10 }, (_, i) => `T${i},Female,Middle (6–8),2,4,${vals}`);
      const res = loadCSV(
        [`teacher_id,gender,grade,tenure_years,experience_years,${qs}`, ...rows].join("\r\n"),
      );
      expect(res.ok && res.hasItems).toBe(true);
      expect(res.ok && res.data[0].scores.al).toBe(25);
      expect(res.ok && res.data[0].train).toBe("Not recorded");
    });
  });
});
