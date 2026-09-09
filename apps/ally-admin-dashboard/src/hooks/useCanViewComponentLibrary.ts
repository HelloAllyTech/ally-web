import { FeatureToggleKey, Permissions } from "@constants";
import { hasFeature, hasPermissions } from "@utils";

import { useUser } from "./useUser";

/**
 * Component Library has no org-level toggle (unlike Character Library's
 * `useCanViewCharacterLibrary` in the helpline dashboard, which also checks an
 * org-toggle API call) — gating is purely this per-user feature toggle plus
 * VIEW_ADMIN_TRACK, mirroring how `FeatureToggleKey.CONTENT_MANAGEMENT` gates
 * the Track pages. Used to decide visibility for: the Component Library page
 * itself, the "Choose from library" sub-choice on the type picker, and
 * "Save as template" on the item editor frame.
 */
export const useCanViewComponentLibrary = (): boolean => {
  const { permissions, features } = useUser();
  return (
    hasFeature(features, FeatureToggleKey.COMPONENT_LIBRARY) &&
    hasPermissions(permissions, [Permissions.VIEW_ADMIN_TRACK])
  );
};
