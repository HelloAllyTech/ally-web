import { FeatureToggleKey, Permissions } from "@constants";
import { hasFeature, hasPermissions } from "@utils";

import { useUser } from "./useUser";

/**
 * Whether this user may curate the character-library reference corpus.
 *
 * The interview page is open to trainers; this panel inside it is not. Gated on the SAME
 * feature toggle and permissions the backend already enforces on the corpus endpoints, rather
 * than a new permission of its own — a UI-only gate would be decoration, and a new permission
 * would need a migration plus grants cloned into every future role migration, which is a
 * documented way to break things for a panel that has an exact existing analogue.
 *
 * Consequence worth knowing: these are SDA-only on the backend, so a trainer who is also an
 * admin will not see the panel. If that turns out to be wrong, it is a permission-grant
 * decision, not a UI change.
 */
export const useCanCurateCharacterCorpus = (): boolean => {
  const { permissions, features } = useUser();
  return (
    hasFeature(features, FeatureToggleKey.KNOWLEDGE_BASE) &&
    hasPermissions(permissions, [Permissions.VIEW_KNOWLEDGE_BASE])
  );
};
