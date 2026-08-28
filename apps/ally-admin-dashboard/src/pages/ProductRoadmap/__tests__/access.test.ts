import { describe, expect, it } from "vitest";

import { FeatureToggleKey, Permissions } from "@constants";

import { canManageRoadmap } from "../utils/access";

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
