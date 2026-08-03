import { describe, expect, it } from "vitest";

import { BASE_PATH, ROUTER_BASENAME, isEmbeddedSurface, withBasePath } from "../surface";

// Under vitest, Vite reports BASE_URL as "/" — i.e. the standalone build. The
// embedded surface is exercised through the same helpers with a stubbed
// isEmbeddedSurface elsewhere; here we pin the default behaviour so a stray
// `base` change in vite.config shows up as a failure.
describe("admin surface (default build)", () => {
  it("is mounted at the root", () => {
    expect(BASE_PATH).toBe("/");
    expect(ROUTER_BASENAME).toBe("");
    expect(isEmbeddedSurface()).toBe(false);
  });

  it("leaves routes untouched at the root", () => {
    expect(withBasePath("/login")).toBe("/login");
  });

  it("tolerates a route passed without a leading slash", () => {
    expect(withBasePath("login")).toBe("/login");
  });
});
