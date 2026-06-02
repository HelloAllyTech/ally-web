import { useSelector } from "react-redux";

import { RootState } from "@store";

/**
 * Email allowlist for the selectable-main-agent-prompt feature.
 *
 * Returning true unlocks: the main-agent prompt picker in
 * edit-simulation, the "Duplicate as variant" / "Delete variant"
 * buttons in PromptSidePanel, and routes every body-driven gate
 * (`useIsPlaceholderUsed`) onto the variant's actual reconciled list
 * instead of the legacy-Prompt-#1 fallback.
 *
 * This is a TEMPORARY scoping mechanism until the env-var injection
 * route works in the baremetal dev deploy. When this feature is ready
 * to GA, replace the allowlist check with a permission check
 * (`hasPermissions(permissions, [Permissions.USE_PROMPT_VARIANTS])`)
 * tied to a DB-backed group membership.
 */
const ALLOWLIST = new Set<string>([
  "sandeep.malhotra+orgadmin@helloally.ai",
  "gopikrishnan.sasikumar@helloally.ai",
  "gopikrishnan.sasikumar+admin@helloally.ai",
  "gopi.s+admin@helloally.ai",
]);

export function useCanUseSelectablePrompts(): boolean {
  const email = useSelector((state: RootState) => state.user.user?.email);
  if (!email) return false;
  return ALLOWLIST.has(email.toLowerCase());
}
