import { ShipVolumeResponse } from "@types";

import {
  SHIP_VOLUME_REPO_COLOURS,
  buildShipVolumeScale,
  buildShipVolumeSeries,
  buildShipVolumeTable,
  buildShipVolumeWeeks,
  partialFootnote,
  partialWeek,
  plottedWeeks,
  shipVolumeEmptyText,
  shipVolumeTakeaway,
  unavailableNote,
  weekLabel,
} from "../shipVolumeChart";

const week = (
  weekStart: string,
  repos: Record<string, [number, number]>,
  partial = false,
) => {
  const entries = Object.entries(repos).map(([repo, [added, deleted]]) => ({
    repo,
    added,
    deleted,
    churn: added + deleted,
  }));
  return {
    weekStart,
    partial,
    repos: entries,
    added: entries.reduce((s, r) => s + r.added, 0),
    deleted: entries.reduce((s, r) => s + r.deleted, 0),
    churn: entries.reduce((s, r) => s + r.churn, 0),
  };
};

const response = (over: Partial<ShipVolumeResponse> = {}): ShipVolumeResponse => ({
  weeks: [],
  repos: [],
  currentWeekStart: "2026-08-30",
  weeksRequested: 12,
  plotted: { added: 0, deleted: 0, churn: 0 },
  unavailableRepos: [],
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2026-09-04T12:00:00.000Z",
  ...over,
});

// The label is deliberately locale-relative, like every other date on this page,
// so these assert the properties that must hold in ANY locale rather than a
// day-month order that only holds in some.
describe("weekLabel", () => {
  it("stays inside Carbon's 14-character tick truncation", () => {
    expect(weekLabel("2026-08-30").length).toBeLessThanOrEqual(14);
  });

  it("names the day and the month", () => {
    expect(weekLabel("2026-08-30")).toMatch(/30/);
    expect(weekLabel("2026-08-30")).toMatch(/Aug/);
  });

  it("reads the date in UTC, so a reader west of Greenwich does not see the day before", () => {
    // Parsed as local time, midnight UTC would fall on the 29th for them.
    expect(weekLabel("2026-08-30")).toMatch(/30/);
    expect(weekLabel("2026-08-30")).not.toMatch(/29/);
  });

  it("passes an unparseable value through rather than rendering Invalid Date", () => {
    expect(weekLabel("not-a-date")).toBe("not-a-date");
  });
});

/** The locale's own rendering, for tests that need the exact string. */
const LABEL = weekLabel("2026-08-30");
const PRIOR = weekLabel("2026-08-23");

describe("buildShipVolumeWeeks", () => {
  it("marks only the in-progress week on the axis, and never in the plain label", () => {
    const weeks = buildShipVolumeWeeks(
      response({
        weeks: [week("2026-08-23", { "ally-be": [10, 5] }), week("2026-08-30", { "ally-be": [1, 1] }, true)],
      }),
    );

    expect(weeks[0].label).toBe(PRIOR);
    expect(weeks[1].label).toBe(`${LABEL} *`);
    expect(weeks[1].plainLabel).toBe(LABEL);
  });

  it("returns an empty axis for no data rather than throwing", () => {
    expect(buildShipVolumeWeeks(undefined)).toEqual([]);
  });
});

describe("buildShipVolumeSeries", () => {
  it("emits an explicit zero for a repo absent from a week, so the stack stays aligned", () => {
    const weeks = buildShipVolumeWeeks(
      response({
        weeks: [week("2026-08-23", { "ally-be": [10, 0] }), week("2026-08-30", { "ally-web": [5, 0] })],
      }),
    );

    const series = buildShipVolumeSeries(weeks, ["ally-be", "ally-web"]);

    expect(series).toHaveLength(4);
    expect(series).toContainEqual({ group: "ally-web", key: PRIOR, value: 0 });
    expect(series).toContainEqual({ group: "ally-be", key: LABEL, value: 0 });
  });

  it("orders groups by the server's repo domain, not by each week's contents", () => {
    const weeks = buildShipVolumeWeeks(
      response({ weeks: [week("2026-08-30", { "ally-web": [5, 0], "ally-be": [1, 0] })] }),
    );

    const groups = buildShipVolumeSeries(weeks, ["ally-web", "ally-be"]).map(d => d.group);

    expect(groups).toEqual(["ally-web", "ally-be"]);
  });
});


describe("buildShipVolumeScale", () => {
  // The bug this guards: hashing these seven names collides three pairs, and on
  // a stacked bar two same-coloured bands sit flush and cannot be told apart.
  it("gives every known repo a colour no other known repo has", () => {
    const repos = Object.keys(SHIP_VOLUME_REPO_COLOURS);
    const colours = Object.values(buildShipVolumeScale(repos));

    expect(colours).toHaveLength(repos.length);
    expect(new Set(colours).size).toBe(repos.length);
  });

  it("pins a repo's colour regardless of which other repos are present", () => {
    const alone = buildShipVolumeScale(["ally-web"]);
    const crowded = buildShipVolumeScale(["ally-be", "ally-web", "infra"]);

    expect(alone["ally-web"]).toBe(crowded["ally-web"]);
  });

  it("still colours a repo that is on the server's list but not in the map", () => {
    const scale = buildShipVolumeScale(["ally-be", "some-new-repo"]);

    expect(scale["some-new-repo"]).toBeTruthy();
    expect(scale["ally-be"]).toBe(SHIP_VOLUME_REPO_COLOURS["ally-be"]);
  });
});

describe("plottedWeeks", () => {
  it("keeps the dense axis but reports only the weeks with something on them", () => {
    const weeks = buildShipVolumeWeeks(
      response({ weeks: [week("2026-08-23", {}), week("2026-08-30", { "ally-be": [10, 0] })] }),
    );

    expect(weeks).toHaveLength(2);
    expect(plottedWeeks(weeks).map(w => w.weekStart)).toEqual(["2026-08-30"]);
  });
});

describe("shipVolumeTakeaway", () => {
  const withChurn = (churns: number[], partialLast = true) =>
    buildShipVolumeWeeks(
      response({
        weeks: churns.map((c, i) =>
          week(`2026-06-${String(7 + i * 7).padStart(2, "0")}`, { "ally-be": [c, 0] },
            partialLast && i === churns.length - 1),
        ),
      }),
    );

  it("ignores the in-progress week, which would otherwise read as a collapse", () => {
    const takeaway = shipVolumeTakeaway(withChurn([1000, 1000, 1000, 50]));

    expect(takeaway).toContain("1,000 changed lines");
    expect(takeaway).toContain("in line with");
  });

  it("calls a week inside the ordinary bounce 'in line with' rather than a change", () => {
    expect(shipVolumeTakeaway(withChurn([1000, 1000, 1050], false))).toContain("in line with");
  });

  it("states a real rise against the prior average, not against last week alone", () => {
    const takeaway = shipVolumeTakeaway(withChurn([1000, 1000, 2000], false));

    expect(takeaway).toContain("100% above the previous 2-week average");
  });

  it("states a real fall the same way", () => {
    expect(shipVolumeTakeaway(withChurn([1000, 1000, 500], false))).toContain("50% below");
  });

  it("says nothing when there is only one complete week to speak about", () => {
    expect(shipVolumeTakeaway(withChurn([1000, 50]))).toBeUndefined();
    expect(shipVolumeTakeaway([])).toBeUndefined();
  });
});

describe("unavailableNote", () => {
  it("says a repo is MISSING and the totals understated when there was no cache", () => {
    const note = unavailableNote(
      response({
        repos: ["ally-be"],
        unavailableRepos: [{ repo: "ally-web", reason: "unreachable", servedFromCache: false }],
      }),
    );

    expect(note).toContain("ally-web");
    expect(note).toContain("MISSING");
    expect(note).toContain("understated");
  });

  it("distinguishes a stale slice from a missing one", () => {
    const note = unavailableNote(
      response({
        unavailableRepos: [{ repo: "ally-web", reason: "computing", servedFromCache: true }],
      }),
    );

    expect(note).toContain("cached");
    expect(note).not.toContain("MISSING");
  });

  it("reports both kinds at once, listing each repo under the right one", () => {
    const note = unavailableNote(
      response({
        unavailableRepos: [
          { repo: "ally-web", reason: "computing", servedFromCache: true },
          { repo: "infra", reason: "unreachable", servedFromCache: false },
          { repo: "ally-ai", reason: "unreachable", servedFromCache: false },
        ],
      }),
    );

    expect(note).toContain("infra and ally-ai");
    expect(note).toContain("MISSING");
    expect(note).toContain("ally-web");
    expect(note).toContain("cached");
  });

  it("says nothing when every repo was read", () => {
    expect(unavailableNote(response({ repos: ["ally-be"] }))).toBeUndefined();
    expect(unavailableNote(undefined)).toBeUndefined();
  });
});

describe("shipVolumeEmptyText", () => {
  it("distinguishes a total reporting failure from a quiet stretch", () => {
    const failure = shipVolumeEmptyText(
      response({
        repos: [],
        unavailableRepos: [
          { repo: "ally-be", reason: "unreachable", servedFromCache: false },
          { repo: "ally-web", reason: "unreachable", servedFromCache: false },
        ],
      }),
      [],
    );

    expect(failure).toContain("reporting failure");
    // The copy names the wrong reading in order to rule it out ("not a quiet
    // week"), so the check is that it never asserts the quiet reading itself.
    expect(failure).not.toContain("Nothing landed");
  });

  it("says nothing landed when the axis is real and simply empty", () => {
    const weeks = buildShipVolumeWeeks(
      response({ weeks: [week("2026-08-23", {}), week("2026-08-30", {}, true)] }),
    );

    expect(shipVolumeEmptyText(response(), weeks)).toBe(
      "Nothing landed on any repo in the last 2 weeks.",
    );
  });
});

describe("buildShipVolumeTable", () => {
  it("splits added and removed out, with net, and spells the in-progress week in words", () => {
    const weeks = buildShipVolumeWeeks(
      response({ weeks: [week("2026-08-30", { "ally-be": [1000, 400] }, true)] }),
    );

    const { columns, rows } = buildShipVolumeTable(weeks, ["ally-be"]);

    expect(columns).toEqual([
      "Week of",
      "Changed lines",
      "Added",
      "Removed",
      "Net",
      "ally-be (churn)",
    ]);
    // An exported asterisk has no footnote to point at, so the cell says it.
    expect(rows[0][0]).toBe(`${LABEL} (in progress)`);
    expect(rows[0]).toEqual([`${LABEL} (in progress)`, 1400, 1000, 400, 600, 1400]);
  });
});

describe("partialWeek / partialFootnote", () => {
  it("names the week and warns against comparing it before it closes", () => {
    const weeks = buildShipVolumeWeeks(
      response({ weeks: [week("2026-08-30", { "ally-be": [1, 0] }, true)] }),
    );
    const found = partialWeek(weeks);

    expect(found?.weekStart).toBe("2026-08-30");
    expect(partialFootnote(found!)).toContain(LABEL);
    expect(partialFootnote(found!)).toContain("only grow");
  });
});
