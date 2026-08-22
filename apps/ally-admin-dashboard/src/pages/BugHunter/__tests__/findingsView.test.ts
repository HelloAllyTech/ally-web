import { describe, expect, it } from "vitest";

import { BugFinding, BugFindingSeverity, BugFindingSource, BugFindingStatus } from "@types";

import {
  buildFindingsView,
  duplicateKey,
  EMPTY_FILTERS,
  FindingsFilters,
  hasActiveFilters,
  reposInWindow,
  updatedAt,
  wasTouchedSinceDiscovery,
} from "../findingsView";

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    runId: null,
    repo: "ally-be",
    source: BugFindingSource.CODE_REVIEW,
    title: overrides.id,
    description: "…",
    file: null,
    evidence: null,
    severity: null,
    proven: false,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: BugFindingStatus.NEW,
    prUrl: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

const view = (findings: BugFinding[], overrides: Partial<Parameters<typeof buildFindingsView>[0]> = {}) =>
  buildFindingsView({
    findings,
    total: findings.length,
    filters: EMPTY_FILTERS,
    sortKey: "discovered",
    sortDirection: "desc",
    page: 0,
    pageSize: 20,
    ...overrides,
  });

describe("filtering", () => {
  it("searches title, file and repo — not just the title", () => {
    const findings = [
      finding({ id: "a", title: "Terms link broken", repo: "ally-web", file: null }),
      finding({ id: "b", title: "Unrelated", repo: "ally-be", file: "src/auth/guard.ts" }),
      finding({ id: "c", title: "Also unrelated", repo: "ally-ai", file: null }),
    ];

    const byTitle = view(findings, { filters: { ...EMPTY_FILTERS, search: "terms" } });
    expect(byTitle.rows.map(r => r.finding.id)).toEqual(["a"]);

    const byFile = view(findings, { filters: { ...EMPTY_FILTERS, search: "guard.ts" } });
    expect(byFile.rows.map(r => r.finding.id)).toEqual(["b"]);

    const byRepo = view(findings, { filters: { ...EMPTY_FILTERS, search: "ally-ai" } });
    expect(byRepo.rows.map(r => r.finding.id)).toEqual(["c"]);
  });

  it("ignores case and surrounding whitespace, since a pasted repo name carries both", () => {
    const findings = [finding({ id: "a", title: "Terms Link Broken" })];
    expect(view(findings, { filters: { ...EMPTY_FILTERS, search: "  TERMS  " } }).rows).toHaveLength(
      1,
    );
  });

  it("filters by lifecycle bucket rather than by one status at a time", () => {
    const findings = [
      finding({ id: "pending", status: BugFindingStatus.PENDING_APPROVAL }),
      finding({ id: "asked", status: BugFindingStatus.NEEDS_INPUT }),
      finding({ id: "fixing", status: BugFindingStatus.FIXING }),
    ];

    // The whole point of the buckets: two different statuses, one filter.
    const needsYou = view(findings, { filters: { ...EMPTY_FILTERS, bucket: "needs_you" } });
    expect(needsYou.rows.map(r => r.finding.id).sort()).toEqual(["asked", "pending"]);
  });

  it("combines facets rather than letting the last one win", () => {
    const findings = [
      finding({ id: "match", repo: "ally-web", severity: BugFindingSeverity.HIGH }),
      finding({ id: "wrong-repo", repo: "ally-be", severity: BugFindingSeverity.HIGH }),
      finding({ id: "wrong-sev", repo: "ally-web", severity: BugFindingSeverity.LOW }),
    ];

    const filters: FindingsFilters = {
      ...EMPTY_FILTERS,
      repo: "ally-web",
      severity: BugFindingSeverity.HIGH,
    };
    expect(view(findings, { filters }).rows.map(r => r.finding.id)).toEqual(["match"]);
  });

  it("knows when no filter is set, so the table can hide its own clear button", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "   " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, bucket: "needs_you" })).toBe(true);
  });
});

describe("sorting", () => {
  it("orders severity worst-first when descending, with unclassified last", () => {
    const findings = [
      finding({ id: "low", severity: BugFindingSeverity.LOW }),
      finding({ id: "none", severity: null }),
      finding({ id: "high", severity: BugFindingSeverity.HIGH }),
      finding({ id: "medium", severity: BugFindingSeverity.MEDIUM }),
    ];

    const sorted = view(findings, { sortKey: "severity", sortDirection: "desc" });
    expect(sorted.rows.map(r => r.finding.id)).toEqual(["high", "medium", "low", "none"]);
  });

  it("never reorders the array it was handed", () => {
    const findings = [
      finding({ id: "older", createdAt: "2026-08-01T00:00:00.000Z" }),
      finding({ id: "newer", createdAt: "2026-08-18T00:00:00.000Z" }),
    ];
    view(findings, { sortKey: "discovered", sortDirection: "desc" });

    // The card, the queue and this table read the same RTK Query cache entry in
    // one render; an in-place sort here would silently reorder theirs.
    expect(findings.map(f => f.id)).toEqual(["older", "newer"]);
  });

  it("breaks ties deterministically, so a poll cannot make rows swap places", () => {
    const sameSecond = "2026-08-17T09:00:00.000Z";
    const findings = [
      finding({ id: "b-id", createdAt: sameSecond, severity: BugFindingSeverity.HIGH }),
      finding({ id: "a-id", createdAt: sameSecond, severity: BugFindingSeverity.HIGH }),
    ];

    const first = view(findings, { sortKey: "severity", sortDirection: "desc" });
    const second = view([...findings].reverse(), { sortKey: "severity", sortDirection: "desc" });
    expect(first.rows.map(r => r.finding.id)).toEqual(second.rows.map(r => r.finding.id));
  });
});

describe("duplicates", () => {
  it("keys on title, repo and status together — not on the title alone", () => {
    const base = { title: "Same title", repo: "ally-be" };
    const outstanding = finding({ id: "a", ...base, status: BugFindingStatus.NEW });
    const alreadyRejected = finding({ id: "b", ...base, status: BugFindingStatus.REJECTED });

    // Calling these a pair would invite someone to read the outstanding one as
    // already dealt with.
    expect(duplicateKey(outstanding)).not.toBe(duplicateKey(alreadyRejected));
  });

  it("flags both copies and keeps both rows, rather than collapsing them", () => {
    const findings = [
      finding({ id: "a", title: "Database query failed", status: BugFindingStatus.NEW }),
      finding({ id: "b", title: "Database query failed", status: BugFindingStatus.NEW }),
      finding({ id: "c", title: "Something else" }),
    ];

    const result = view(findings);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.filter(r => r.duplicateCount === 2)).toHaveLength(2);
    expect(result.rows.find(r => r.finding.id === "c")?.duplicateCount).toBeUndefined();
  });

  it("counts duplicates across the whole window, not just the page", () => {
    const findings = Array.from({ length: 3 }, (_, i) =>
      finding({ id: `dupe-${i}`, title: "Identical", status: BugFindingStatus.NEW }),
    );

    // Page size 1: a pair split across a page boundary is still a pair.
    const result = view(findings, { pageSize: 1 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].duplicateCount).toBe(3);
  });
});

describe("paging and the window", () => {
  it("clamps a page that a filter change has emptied", () => {
    const findings = Array.from({ length: 5 }, (_, i) => finding({ id: `f-${i}` }));

    // Page 4 of a 5-row list at 20 per page does not exist; showing an empty
    // table with no rows and no explanation is the failure being prevented.
    const result = view(findings, { page: 4, pageSize: 20 });
    expect(result.page).toBe(0);
    expect(result.rows).toHaveLength(5);
  });

  it("reports whether the filters only saw part of the table", () => {
    const findings = Array.from({ length: 10 }, (_, i) => finding({ id: `f-${i}` }));

    expect(view(findings, { total: 10 }).windowed).toBe(false);
    // 40 in the table, 10 loaded — a reader who assumes an empty filter result
    // means "nothing like this exists" would be wrong, so the table says so.
    expect(view(findings, { total: 40 }).windowed).toBe(true);
  });

  it("counts matches across all pages, not just the visible one", () => {
    const findings = Array.from({ length: 25 }, (_, i) => finding({ id: `f-${i}` }));
    const result = view(findings, { pageSize: 10 });

    expect(result.rows).toHaveLength(10);
    expect(result.matched).toBe(25);
    expect(result.pageCount).toBe(3);
  });
});

describe("reposInWindow", () => {
  it("offers only repos actually present, sorted, with nulls dropped", () => {
    const findings = [
      finding({ id: "a", repo: "ally-web" }),
      finding({ id: "b", repo: null }),
      finding({ id: "c", repo: "ally-be" }),
      finding({ id: "d", repo: "ally-web" }),
    ];

    // A facet that offers a value matching nothing is a dead end the reader has
    // to discover by trying it.
    expect(reposInWindow(findings)).toEqual(["ally-be", "ally-web"]);
  });
});

/**
 * "Has anything happened to this bug lately", which is a different question
 * from "how long has it been on the list" — and the two come apart hardest on
 * exactly the bug an admin goes looking for: one their team filed weeks ago
 * that last night's sweep re-read.
 */
describe("wasTouchedSinceDiscovery", () => {
  it("is true for a bug re-read long after it was filed", () => {
    expect(
      wasTouchedSinceDiscovery(
        finding({
          id: "a",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-08-22T03:45:00.000Z",
        }),
      ),
    ).toBe(true);
  });

  it("is false within the minute of slack a single sweep needs", () => {
    // Inserted, then PATCHed to pending_approval seconds later, all inside one
    // sweep. A strict `>` would call every row touched and the column would
    // repeat Age down the whole table.
    expect(
      wasTouchedSinceDiscovery(
        finding({
          id: "a",
          createdAt: "2026-08-22T03:45:00.000Z",
          updatedAt: "2026-08-22T03:45:12.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("is false for a bug nothing has happened to", () => {
    expect(
      wasTouchedSinceDiscovery(
        finding({
          id: "a",
          createdAt: "2026-08-22T03:45:00.000Z",
          updatedAt: "2026-08-22T03:45:00.000Z",
        }),
      ),
    ).toBe(false);
  });
});

describe("updatedAt", () => {
  it("falls back to the discovery date rather than returning NaN", () => {
    // NaN would sort the row to an arbitrary place in the table instead of to
    // one end — a defect nobody reads as a date-parsing problem.
    const created = "2026-08-17T00:00:00.000Z";
    expect(
      updatedAt(finding({ id: "a", createdAt: created, updatedAt: "not a date" })),
    ).toBe(new Date(created).getTime());
  });
});
