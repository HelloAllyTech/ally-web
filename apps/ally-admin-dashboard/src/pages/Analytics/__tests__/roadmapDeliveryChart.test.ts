import { describe, expect, it } from "vitest";

import { RoadmapDeliveryMonth, RoadmapDeliveryResponse, RoadmapDeliveryTotals } from "@types";

import { CONTEXT } from "../chartScales";
import {
  buildRoadmapDeliveryMonths,
  buildRoadmapDeliveryScale,
  buildRoadmapDeliverySeries,
  buildRoadmapDeliveryTable,
  measureOf,
  partialFootnote,
  partialMonth,
  plottedMonths,
  roadmapDeliveryEmptyText,
  roadmapDeliveryTakeaway,
  undatedNote,
  visibleOwners,
} from "../roadmapDeliveryChart";

const UNASSIGNED = "Unassigned";
const OTHER = "Other owners";

const totals = (ideaVotes: number, bugVotes: number, ideas = 1, bugs = 1): RoadmapDeliveryTotals => ({
  opportunities: ideas + bugs,
  ideaOpportunities: ideas,
  bugOpportunities: bugs,
  votes: ideaVotes + bugVotes,
  ideaVotes,
  bugVotes,
});

const month = (
  iso: string,
  owners: { owner: string; ideaVotes: number; bugVotes: number }[],
  partial = false,
): RoadmapDeliveryMonth => {
  const ownerRows = owners.map(o => ({ owner: o.owner, ...totals(o.ideaVotes, o.bugVotes) }));
  const sum = (pick: (t: RoadmapDeliveryTotals) => number) =>
    ownerRows.reduce((acc, o) => acc + pick(o), 0);
  return {
    month: iso,
    owners: ownerRows,
    opportunities: sum(t => t.opportunities),
    ideaOpportunities: sum(t => t.ideaOpportunities),
    bugOpportunities: sum(t => t.bugOpportunities),
    votes: sum(t => t.votes),
    ideaVotes: sum(t => t.ideaVotes),
    bugVotes: sum(t => t.bugVotes),
    partial,
  };
};

const response = (
  months: RoadmapDeliveryMonth[],
  owners: string[],
  undated: RoadmapDeliveryTotals = totals(0, 0, 0, 0),
): RoadmapDeliveryResponse => {
  const sum = (pick: (t: RoadmapDeliveryTotals) => number) =>
    months.reduce((acc, m) => acc + pick(m), 0);
  return {
    months,
    owners,
    unassignedOwnerLabel: UNASSIGNED,
    otherOwnerLabel: OTHER,
    maxOwners: 8,
    plotted: {
      opportunities: sum(t => t.opportunities),
      ideaOpportunities: sum(t => t.ideaOpportunities),
      bugOpportunities: sum(t => t.bugOpportunities),
      votes: sum(t => t.votes),
      ideaVotes: sum(t => t.ideaVotes),
      bugVotes: sum(t => t.bugVotes),
    },
    undated,
    currentMonth: "2026-08-01",
    scoping: { tenantId: null, unscopedSections: [] },
    computedAt: "2026-08-10T09:00:00.000Z",
  };
};

describe("measureOf", () => {
  it("resolves each filter to its own votes and counts", () => {
    const t = totals(40, 10, 2, 1);

    expect(measureOf(t, "all")).toEqual({ votes: 50, opportunities: 3 });
    expect(measureOf(t, "idea")).toEqual({ votes: 40, opportunities: 2 });
    expect(measureOf(t, "bug")).toEqual({ votes: 10, opportunities: 1 });
  });
});

describe("buildRoadmapDeliveryMonths", () => {
  const data = response(
    [
      month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 10 }]),
      month("2026-07-01", []),
      month("2026-08-01", [{ owner: "Gopi", ideaVotes: 5, bugVotes: 0 }], true),
    ],
    ["Ajey", "Gopi"],
  );

  it("returns nothing without data", () => {
    expect(buildRoadmapDeliveryMonths(undefined, "all")).toEqual([]);
  });

  it("keeps a month where nothing shipped, as a real zero", () => {
    // Dropping it would put two bars a quarter apart side by side.
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(months.map(m => m.month)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01"]);
    expect(months[1]).toMatchObject({ votes: 0, opportunities: 0, votesByOwner: {} });
  });

  it("marks the in-progress month on the axis label itself", () => {
    // Not in a tooltip: an unmarked short bar reads as a fall the reader explains
    // to themselves.
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(months[0].label).toBe("Jun 2026");
    expect(months[2].label).toBe("Aug 2026 *");
    expect(months.map(m => m.partial)).toEqual([false, false, true]);
  });

  it("keeps every axis label inside Carbon's 14-character tick limit", () => {
    // THE BUG THIS PREVENTS: "Aug 2026 (so far)" is 17 characters and Carbon
    // renders it as "Aug 2026 (so f...", which is a flag that says nothing.
    const months = buildRoadmapDeliveryMonths(data, "all");

    for (const m of months) expect(m.label.length).toBeLessThanOrEqual(14);
  });

  it("keeps an unmarked plain label for the table and the footnote", () => {
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(months[2].plainLabel).toBe("Aug 2026");
  });

  it("resolves owner votes against the type filter", () => {
    expect(buildRoadmapDeliveryMonths(data, "all")[0].votesByOwner).toEqual({ Ajey: 50 });
    expect(buildRoadmapDeliveryMonths(data, "idea")[0].votesByOwner).toEqual({ Ajey: 40 });
    expect(buildRoadmapDeliveryMonths(data, "bug")[0].votesByOwner).toEqual({ Ajey: 10 });
  });
});

describe("visibleOwners", () => {
  const data = response(
    [
      month("2026-06-01", [
        { owner: "Ajey", ideaVotes: 40, bugVotes: 10 },
        { owner: "Gopi", ideaVotes: 20, bugVotes: 0 },
      ]),
    ],
    ["Ajey", "Gopi"],
  );

  it("drops an owner the filter empties, without reordering the rest", () => {
    // A legend entry for a band with nothing in it is a colour the reader hunts
    // for and never finds — but the ORDER stays the server's all-time ranking, so
    // a band never moves as the filter changes.
    const all = buildRoadmapDeliveryMonths(data, "all");
    const bugs = buildRoadmapDeliveryMonths(data, "bug");

    expect(visibleOwners(data, all)).toEqual(["Ajey", "Gopi"]);
    expect(visibleOwners(data, bugs)).toEqual(["Ajey"]);
  });
});

describe("buildRoadmapDeliverySeries", () => {
  it("emits owner-by-owner so the stack order follows the server ranking", () => {
    // Carbon assigns stack order from the order groups first appear in the data.
    const data = response(
      [
        month("2026-06-01", [{ owner: "Gopi", ideaVotes: 5, bugVotes: 0 }]),
        month("2026-07-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 0 }]),
      ],
      ["Ajey", "Gopi"],
    );
    const months = buildRoadmapDeliveryMonths(data, "all");

    const series = buildRoadmapDeliverySeries(months, ["Ajey", "Gopi"]);

    expect(series.map(d => d.group)).toEqual(["Ajey", "Ajey", "Gopi", "Gopi"]);
  });

  it("emits an explicit zero for a month an owner shipped nothing in", () => {
    const data = response(
      [
        month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 0 }]),
        month("2026-07-01", []),
      ],
      ["Ajey"],
    );
    const months = buildRoadmapDeliveryMonths(data, "all");

    const series = buildRoadmapDeliverySeries(months, ["Ajey"]);

    expect(series).toEqual([
      { group: "Ajey", key: "Jun 2026", value: 40 },
      { group: "Ajey", key: "Jul 2026", value: 0 },
    ]);
  });
});

describe("buildRoadmapDeliveryScale", () => {
  it("greys the reserved bands and never gives them a person's hue", () => {
    const data = response([], ["Ajey", UNASSIGNED, OTHER]);

    const scale = buildRoadmapDeliveryScale(data, ["Ajey", UNASSIGNED, OTHER]);

    expect(scale[UNASSIGNED]).toBe(CONTEXT.line);
    expect(scale[OTHER]).toBe(CONTEXT.faint);
    expect(scale.Ajey).not.toBe(CONTEXT.line);
    expect(scale.Ajey).not.toBe(CONTEXT.faint);
  });

  it("keeps an owner's colour when the owner set changes", () => {
    const data = response([], ["Ajey", "Gopi"]);

    const alone = buildRoadmapDeliveryScale(data, ["Ajey"]);
    const together = buildRoadmapDeliveryScale(data, ["Ajey", "Gopi"]);

    expect(alone.Ajey).toBe(together.Ajey);
  });

  it("omits a reserved band that is not on the chart", () => {
    const data = response([], ["Ajey"]);

    expect(buildRoadmapDeliveryScale(data, ["Ajey"])).not.toHaveProperty(UNASSIGNED);
  });
});

describe("roadmapDeliveryTakeaway", () => {
  it("names the concentration rather than a month-on-month delta", () => {
    // A release log is lumpy: one 90-vote item landing in April and not in March
    // is a scheduling fact, not a trend, so no delta is offered.
    const data = response(
      [
        month("2026-06-01", [{ owner: "Ajey", ideaVotes: 60, bugVotes: 0 }]),
        month("2026-07-01", [{ owner: "Gopi", ideaVotes: 40, bugVotes: 0 }]),
      ],
      ["Ajey", "Gopi"],
    );
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(roadmapDeliveryTakeaway(months, ["Ajey", "Gopi"])).toBe(
      "100 votes shipped across 2 months — Ajey carried 60% of them (60 votes)",
    );
  });

  it("says nothing when there is nothing to compare", () => {
    expect(roadmapDeliveryTakeaway([], [])).toBeNull();
  });

  it("drops the share when there is only one owner", () => {
    const data = response([month("2026-06-01", [{ owner: "Ajey", ideaVotes: 60, bugVotes: 0 }])], [
      "Ajey",
    ]);
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(roadmapDeliveryTakeaway(months, ["Ajey"])).toBe("60 votes shipped across 1 month");
  });
});

describe("undatedNote", () => {
  it("states how much of the released work is missing from the axis", () => {
    // THE POINT: without this line the plotted total reads as everything the team
    // has ever shipped.
    const data = response(
      [month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 10 }])],
      ["Ajey"],
      totals(500, 104, 170, 3),
    );

    const note = undatedNote(data, "all");

    expect(note).toContain("2 of 175 released items are plotted");
    expect(note).toContain("The other 173 (604 votes) carry no release date");
  });

  it("scopes the missing figure to the active filter", () => {
    const data = response([], [], totals(500, 104, 170, 3));

    expect(undatedNote(data, "bug")).toContain("3 ");
    expect(undatedNote(data, "bug")).toContain("104 votes");
  });

  it("says nothing when every release carries a date", () => {
    expect(undatedNote(response([], []), "all")).toBeNull();
  });
});

describe("roadmapDeliveryEmptyText", () => {
  it("distinguishes 'nothing shipped' from 'nothing is dated'", () => {
    // These look identical on an empty axis and mean opposite things.
    const nothingShipped = response([], []);
    const allUndated = response([], [], totals(500, 104, 170, 3));

    expect(roadmapDeliveryEmptyText(nothingShipped, [], "all")).toBe(
      "No opportunity has been released yet.",
    );
    expect(roadmapDeliveryEmptyText(allUndated, [], "all")).toContain(
      "all 173 released items (604 votes) carry no release date",
    );
  });

  it("names the type in the nothing-shipped state", () => {
    expect(roadmapDeliveryEmptyText(response([], []), [], "bug")).toBe(
      "No bug has been released yet.",
    );
  });

  it("returns undefined while there is something to draw", () => {
    const data = response([month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 0 }])], [
      "Ajey",
    ]);
    const months = buildRoadmapDeliveryMonths(data, "all");

    expect(roadmapDeliveryEmptyText(data, months, "all")).toBeUndefined();
  });
});

describe("plottedMonths", () => {
  it("counts only months with something on them", () => {
    const data = response(
      [
        month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 0 }]),
        month("2026-07-01", []),
      ],
      ["Ajey"],
    );

    expect(plottedMonths(buildRoadmapDeliveryMonths(data, "all"))).toHaveLength(1);
  });
});

describe("buildRoadmapDeliveryTable", () => {
  it("puts release counts beside the vote totals and keeps the partial month", () => {
    const data = response(
      [
        month("2026-06-01", [{ owner: "Ajey", ideaVotes: 40, bugVotes: 10 }]),
        month("2026-08-01", [{ owner: "Ajey", ideaVotes: 5, bugVotes: 0 }], true),
      ],
      ["Ajey"],
    );
    const months = buildRoadmapDeliveryMonths(data, "all");

    const table = buildRoadmapDeliveryTable(months, ["Ajey"]);

    expect(table.columns).toEqual(["Month", "Votes", "Released", "Ajey (votes)"]);
    // Spelled out, not the axis asterisk: a CSV has room for words, and a lone
    // "*" in an exported file points at a footnote that did not travel with it.
    expect(table.rows).toEqual([
      ["Jun 2026", 50, 2, 50],
      ["Aug 2026 (in progress)", 5, 2, 5],
    ]);
  });
});

describe("partialMonth / partialFootnote", () => {
  it("names the open month in prose, since the axis marker cannot", () => {
    const data = response(
      [month("2026-08-01", [{ owner: "Ajey", ideaVotes: 5, bugVotes: 0 }], true)],
      ["Ajey"],
    );
    const months = buildRoadmapDeliveryMonths(data, "all");

    const open = partialMonth(months);

    expect(open?.month).toBe("2026-08-01");
    expect(partialFootnote(open!)).toBe(
      "* Aug 2026 is still open — more can ship into it, so that bar can only grow. " +
        "It is not comparable with the closed months beside it.",
    );
  });

  it("finds no open month when the axis ends in the past", () => {
    const data = response([month("2026-06-01", [{ owner: "Ajey", ideaVotes: 5, bugVotes: 0 }])], [
      "Ajey",
    ]);

    expect(partialMonth(buildRoadmapDeliveryMonths(data, "all"))).toBeUndefined();
  });
});
