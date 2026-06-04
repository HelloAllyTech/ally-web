import { useMemo } from "react";

import { useGetPromptsByTypeQuery } from "@api";

import { getAvailableVariableName } from "../utils/availableVariables";

/**
 * Lookup state for the selected main-agent prompt variant. Exposed so
 * callers can render warnings on "missing" (variant code points at a row
 * that isn't in the loaded list — usually a deleted variant or a sync race).
 */
export type PromptLookupKind = "no_selection" | "missing" | "loaded";

export interface UseIsPlaceholderUsedResult {
  /**
   * True iff the selected variant's reconciled `availableVariables`
   * references the given placeholder. False when:
   *   - No variant is selected (callers can decide whether that means
   *     "show by default" or "hide by default" — most callers treat
   *     no-selection as "show", since the default main_agent prompt is
   *     in play and we don't know what it references).
   *   - The variant is loaded but doesn't reference the placeholder.
   * Loading is treated as "not loaded yet" — callers should consult
   * `kind` to distinguish loading vs. not-found if they care.
   */
  isUsed: boolean;
  /** Lifecycle state of the lookup (see PromptLookupKind). */
  kind: PromptLookupKind;
  /** When kind === "missing", the variant code we couldn't find. */
  missingCode?: string;
}

/**
 * Single body-driven gate for "does the selected main-agent variant
 * reference this placeholder?" Consumed by FormField (per-field hiding
 * via `hideWhenUnused`) AND by StatesEditor (whole-component self-hide).
 *
 * Why a shared hook: before this existed, FormField and StatesEditor each
 * had their own lookup memo. They drifted — StatesEditor had a legacy
 * `hasStates` fallback that FormField didn't, which caused the bug where
 * a duplicated variant's States UI stayed visible after the placeholder
 * was removed from the body.
 *
 * The hook is strictly body-driven: it ONLY checks `availableVariables`.
 * Once the backfill migration (1780100000000-backfillAvailableVariables)
 * has run in all environments, every row has a populated list, so we no
 * longer fall through to the legacy `hasStates` boolean.
 */
export function useIsPlaceholderUsed(
  selectedPromptCode: string | undefined,
  placeholder: string | undefined,
): UseIsPlaceholderUsedResult {
  // Skip the network call when nothing on screen needs it. The query is
  // shared across all useIsPlaceholderUsed call sites via RTK Query's
  // automatic deduplication, so multiple gated fields don't multiply the
  // request count.
  const { data: prompts } = useGetPromptsByTypeQuery("main_agent", {
    skip: !placeholder,
  });

  return useMemo<UseIsPlaceholderUsedResult>(() => {
    if (!placeholder) return { isUsed: false, kind: "no_selection" };
    if (!selectedPromptCode) return { isUsed: false, kind: "no_selection" };
    if (!prompts) return { isUsed: false, kind: "no_selection" };
    const match = prompts.find(p => p.promptCode === selectedPromptCode);
    if (!match) {
      return { isUsed: false, kind: "missing", missingCode: selectedPromptCode };
    }
    const names = new Set((match.availableVariables ?? []).map(getAvailableVariableName));
    return { isUsed: names.has(placeholder), kind: "loaded" };
  }, [placeholder, selectedPromptCode, prompts]);
}
