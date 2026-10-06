import { describe, expect, it } from "vitest";

// Raw source, via Vite's ?raw import — the same source check as whatsappBot.test.ts, for the same
// reason: RTK Query exposes no way to read the registered `tagTypes` back.
import constantsSource from "../../constants/common.ts?raw";
import baseApiSource from "../baseApi.ts?raw";
import helplineAdminSource from "../helplineAdmin.ts?raw";

/**
 * A tag a slice uses must ALSO be declared in baseAPI's `tagTypes`. RTK Query silently ignores an
 * unregistered tag, so the save would appear to work while the tab kept showing the old settings.
 */
describe("helplineAdmin API tag registration", () => {
  const usedTags = [...new Set(helplineAdminSource.match(/TAG_TYPES\.[A-Z0-9_]+/g) ?? [])];

  it("uses at least one tag (guards against the regex silently matching nothing)", () => {
    expect(usedTags.length).toBeGreaterThan(0);
  });

  it.each(usedTags)("registers %s in baseApi tagTypes", tag => {
    expect(
      baseApiSource.includes(tag),
      `${tag} is used by api/helplineAdmin.ts but not registered in api/baseApi.ts tagTypes`,
    ).toBe(true);
  });

  it("points at the admin settings route the backend contract names", () => {
    expect(constantsSource).toContain('SETTINGS: "/v1/helpline/admin/settings"');
    expect(helplineAdminSource).toContain("ApiEndpoints.HELPLINE_ADMIN.SETTINGS");
  });
});
