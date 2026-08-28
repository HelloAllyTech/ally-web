import { FeatureToggleKey, Permissions } from "@constants";
import { hasFeature } from "@utils";

/**
 * Whether this reader gets the roadmap's manage affordances: stage transitions, editing or
 * deleting anyone's opportunity, the goal taxonomy, split/merge, month-board lane moves, opening
 * a Builder session, pinning a view for everyone.
 *
 * BOTH halves, in the order ally-be checks them. Every manage endpoint carries
 * `@RequireFeatureToggle(PRODUCT_ROADMAP_MANAGE, { permissions: [EDIT_PRODUCT_ROADMAP] })` — the
 * permission AND the per-user toggle, never either.
 *
 * The permission on its own stopped separating anyone at the role collapse
 * (CreatePlatformAdminRole1895000000001): PLATFORM_ADMIN carries what SUPER_DUPER_ADMIN used to,
 * so EDIT_PRODUCT_ROADMAP now sits on every platform admin and the toggle is the entire
 * distinction. Checking only the permission showed every manage control to every admin and let a
 * 403 be the first news of it.
 *
 * Extracted rather than inlined for the same reason as seedForHandle: it is one `&&`, and it is
 * the only thing between a read-only admin and a board full of buttons that answer 403.
 */
export const canManageRoadmap = (
  permissions: string[] | undefined,
  features: string[] | undefined,
): boolean =>
  !!permissions?.includes(Permissions.EDIT_PRODUCT_ROADMAP) &&
  // Empty when the toggle fetch failed (see useUser) — so this fails closed to a read-only
  // board rather than open to controls that cannot work.
  hasFeature(features, FeatureToggleKey.PRODUCT_ROADMAP_MANAGE);
