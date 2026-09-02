import { describe, expect, it } from "vitest";

import { IosTestflightStatusResponse } from "@types";

import { deriveRecommendedAction } from "../mobileReleaseStatus";

/**
 * appStoreReviewHistory defaults to [] both while it's still loading and if it fails to
 * load — identical to "genuinely never submitted". Recommending a submission from that
 * empty array before it's known to be real is a live path to submitting the same build to
 * Apple review twice.
 */
describe("deriveRecommendedAction", () => {
  const testflightStatus: IosTestflightStatusResponse = {
    buildVersion: "1.23.16",
    buildId: "build-1",
    betaReviewState: "APPROVED",
    externalGroupAssigned: true,
  };

  it("does not recommend submitting while the review history is still loading", () => {
    const action = deriveRecommendedAction(testflightStatus, [], true, false);
    expect(action.actionKind).toBeUndefined();
  });

  it("does not recommend submitting when the review history failed to load", () => {
    const action = deriveRecommendedAction(testflightStatus, [], false, true);
    expect(action.actionKind).toBeUndefined();
  });

  it("still recommends submitting once the history has genuinely loaded with no matching submission", () => {
    const action = deriveRecommendedAction(testflightStatus, [], false, false);
    expect(action.actionKind).toBe("submit-ios-review");
  });
});
