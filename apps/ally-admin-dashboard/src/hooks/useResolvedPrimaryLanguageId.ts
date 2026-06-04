import { useMemo } from "react";

import type { LanguageOption } from "@components/linguistic-style-samples/scenarioLanguageUtils";

export function useResolvedPrimaryLanguageId(
  catalogLanguages: LanguageOption[],
  overrideLanguageId: number | null | undefined,
): string | null {
  return useMemo(() => {
    if (overrideLanguageId != null) return String(overrideLanguageId);
    const enFirst = catalogLanguages.find(
      l =>
        String(l.value ?? "").toLowerCase().includes("en") ||
        String((l as { translationCode?: string }).translationCode ?? "") === "en",
    );
    if (enFirst) return String(enFirst.language_id);
    return catalogLanguages[0] ? String(catalogLanguages[0].language_id) : null;
  }, [catalogLanguages, overrideLanguageId]);
}
