import { describe, expect, it } from "vitest";

import { UserRole } from "@types";

import { ALLOWED_ROLES } from "../auth";

describe("login allow-list", () => {
  it("lets text helpline listeners and supervisors sign in", () => {
    // A role missing here is refused at login, so a LISTENER-only account could
    // never reach the Helpline workspace (ally-be docs/text-helpline.md §2).
    expect(ALLOWED_ROLES).toEqual(
      expect.arrayContaining([UserRole.LISTENER, UserRole.HELPLINE_SUPERVISOR]),
    );
  });

  it("keeps every role that could already sign in", () => {
    expect(ALLOWED_ROLES).toEqual(
      expect.arrayContaining([
        UserRole.COUNSELLOR,
        UserRole.ADMIN,
        UserRole.LEARNER,
        UserRole.SIMULATION_REVIEWER,
        UserRole.SCRIBE_REVIEWER,
        UserRole.EVALUATOR,
      ]),
    );
  });
});
