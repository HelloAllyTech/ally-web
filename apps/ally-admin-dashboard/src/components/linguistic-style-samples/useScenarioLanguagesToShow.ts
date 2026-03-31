import { useMemo } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";

import type { LanguageOption } from "./scenarioLanguageUtils";

export function useScenarioLanguagesToShow(formMethods: { control: object }) {
  const { control } = formMethods;

  const { data: availableLanguages = [], isLoading } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[]; isLoading: boolean };

  const languageVoices = useWatch({ control, name: "languageVoices" }) ?? {};

  const languagesToShow = useMemo(() => {
    const selectedLanguageIds = new Set(
      Object.entries(languageVoices as Record<string, unknown>)
        .filter(([, voiceId]) => Boolean(voiceId))
        .map(([languageId]) => String(languageId)),
    );

    return ((availableLanguages ?? []) as LanguageOption[]).filter(lang =>
      selectedLanguageIds.has(String(lang.language_id)),
    );
  }, [availableLanguages, languageVoices]);

  return { languagesToShow, isLoading };
}
