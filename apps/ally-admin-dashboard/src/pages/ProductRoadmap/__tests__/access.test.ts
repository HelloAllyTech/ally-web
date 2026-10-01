import { describe, expect, it } from "vitest";

import { FeatureToggleKey, Permissions } from "@constants";

import { canManageRoadmap, canOpenRoadmapBuilder } from "../utils/access";

const EDIT = Permissions.EDIT_PRODUCT_ROADMAP;
const TOGGLE = FeatureToggleKey.PRODUCT_ROADMAP_MANAGE;

describe("canManageRoadmap", () => {
  it("manages with both the permission and the toggle", () => {
    expect(canManageRoadmap([EDIT], [TOGGLE])).toBe(true);
  });

  it("does NOT manage on the permission alone", () => {
    // The case that matters: post role-collapse every platform admin holds EDIT_PRODUCT_ROADMAP,
    // so the toggle is the whole distinction and the permission proves nothing on its own.
    expect(canManageRoadmap([EDIT], ["bug_hunter"])).toBe(false);
  });

  it("does NOT manage on the toggle alone", () => {
    expect(canManageRoadmap([Permissions.VOTE_PRODUCT_ROADMAP], [TOGGLE])).toBe(false);
  });

  it("fails closed when toggles could not be loaded", () => {
    expect(canManageRoadmap([EDIT], [])).toBe(false);
    expect(canManageRoadmap([EDIT], undefined)).toBe(false);
  });

  it("fails closed when permissions have not arrived yet", () => {
    expect(canManageRoadmap(undefined, [TOGGLE])).toBe(false);
  });
});

describe("canOpenRoadmapBuilder", () => {
  const EDIT_BUILDER = Permissions.EDIT_BUILDER;
  const BUILDER = FeatureToggleKey.BUILDER;

  it("opens with Builder access — no roadmap manage needed", () => {
    expect(canOpenRoadmapBuilder([EDIT_BUILDER], [BUILDER])).toBe(true);
  });

  it("does NOT open on roadmap manage alone", () => {
    // The split this exists for: a curator without Builder no longer sees an icon that can only 403.
    expect(canOpenRoadmapBuilder([EDIT], [TOGGLE])).toBe(false);
  });

  it("does NOT open on the Builder toggle without the edit permission", () => {
    expect(canOpenRoadmapBuilder([Permissions.VIEW_BUILDER], [BUILDER])).toBe(false);
  });

  it("fails closed when toggles or permissions are missing", () => {
    expect(canOpenRoadmapBuilder([EDIT_BUILDER], [])).toBe(false);
    expect(canOpenRoadmapBuilder([EDIT_BUILDER], undefined)).toBe(false);
    expect(canOpenRoadmapBuilder(undefined, [BUILDER])).toBe(false);
  });
});
