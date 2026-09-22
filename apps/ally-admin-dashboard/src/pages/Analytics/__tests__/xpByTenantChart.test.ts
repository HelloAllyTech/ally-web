import { describe, expect, it } from "vitest";

import {
  OTHER_TENANTS_LABEL,
  XpByTenantResponse,
  buildXpByTenantScale,
  buildXpByTenantSeries,
  buildXpByTenantTable,
  xpByTenantEmptyText,
  xpByTenantTakeaway,
} from "../xpByTenantChart";

const response = (overrides: Partial<XpByTenantResponse> = {}): XpByTenantResponse => ({
  window: {
    window: "90d",
    from: "2026-06-24",
    to: "2026-09-22",
    label: "Last 90 days",
    allTime: false,
  },
  segments: [],
  otherXp: 0,
  totalXp: 0,
  computedAt: "2026-09-22T00:00:00.000Z",
  ...overrides,
});

describe("buildXpByTenantSeries", () => {
  it("emits one datum per named tenant, keyed on the window label", () => {
    const data = response({
      segments: [
        { tenantId: "a", tenantName: "Acme", xp: 500 },
        { tenantId: "b", tenantName: "Beta", xp: 300 },
      ],
      totalXp: 800,
    });

    expect(buildXpByTenantSeries(data)).toEqual([
      { group: "Acme", key: "Last 90 days", value: 500 },
      { group: "Beta", key: "Last 90 days", value: 300 },
    ]);
  });

  it("appends an Other tenants datum only when otherXp is positive", () => {
    const withOther = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 500 }],
      otherXp: 120,
      totalXp: 620,
    });
    expect(buildXpByTenantSeries(withOther).map(d => d.group)).toEqual([
      "Acme",
      OTHER_TENANTS_LABEL,
    ]);

    const withoutOther = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 500 }],
      totalXp: 500,
    });
    expect(buildXpByTenantSeries(withoutOther).map(d => d.group)).toEqual(["Acme"]);
  });

  it("returns an empty series with no data", () => {
    expect(buildXpByTenantSeries(undefined)).toEqual([]);
  });
});

describe("buildXpByTenantScale", () => {
  it("keeps Other tenants out of the hashed ramp, with its own colour", () => {
    const data = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 500 }],
      otherXp: 120,
      totalXp: 620,
    });

    const scale = buildXpByTenantScale(data);

    expect(scale[OTHER_TENANTS_LABEL]).toBeDefined();
    expect(scale.Acme).toBeDefined();
    expect(scale[OTHER_TENANTS_LABEL]).not.toBe(scale.Acme);
  });

  it("omits Other tenants from the scale when there is no tail", () => {
    const data = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 500 }],
      totalXp: 500,
    });
    expect(buildXpByTenantScale(data)[OTHER_TENANTS_LABEL]).toBeUndefined();
  });
});

describe("xpByTenantEmptyText", () => {
  it("flags empty when total XP is zero", () => {
    expect(xpByTenantEmptyText(response())).toBeDefined();
  });

  it("is undefined once any tenant earned XP", () => {
    expect(
      xpByTenantEmptyText(
        response({ segments: [{ tenantId: "a", tenantName: "Acme", xp: 1 }], totalXp: 1 }),
      ),
    ).toBeUndefined();
  });

  it("flags empty with no data at all", () => {
    expect(xpByTenantEmptyText(undefined)).toBeDefined();
  });
});

describe("xpByTenantTakeaway", () => {
  it("names the top tenant's share of the total", () => {
    const data = response({
      segments: [
        { tenantId: "a", tenantName: "Acme", xp: 600 },
        { tenantId: "b", tenantName: "Beta", xp: 200 },
      ],
      otherXp: 200,
      totalXp: 1000,
    });

    const takeaway = xpByTenantTakeaway(data);

    expect(takeaway).toContain("Acme");
    expect(takeaway).toContain("60%");
  });

  it("returns undefined when the bar is a single tenant with no Other tail", () => {
    const data = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 500 }],
      totalXp: 500,
    });
    expect(xpByTenantTakeaway(data)).toBeUndefined();
  });

  it("returns undefined when there is nothing to plot", () => {
    expect(xpByTenantTakeaway(response())).toBeUndefined();
    expect(xpByTenantTakeaway(undefined)).toBeUndefined();
  });
});

describe("buildXpByTenantTable", () => {
  it("includes a Share column and the Other tenants row when present", () => {
    const data = response({
      segments: [{ tenantId: "a", tenantName: "Acme", xp: 750 }],
      otherXp: 250,
      totalXp: 1000,
    });

    const table = buildXpByTenantTable(data);

    expect(table.columns).toEqual(["Tenant", "XP", "Share"]);
    expect(table.rows).toEqual([
      ["Acme", 750, "75%"],
      [OTHER_TENANTS_LABEL, 250, "25%"],
    ]);
  });
});
