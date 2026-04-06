import { useMemo } from "react";

import { useGetAvailableLanguageVoicesQuery } from "@api";

import type { LanguageOption } from "./scenarioLanguageUtils";

/**
 * Active languages that have at least one voice in the catalog.
 * Not filtered by scenario language–voice mapping so admins can edit samples/fillers before or without picking a voice per language.
 */
export function useScenarioLanguagesToShow(formMethods: { control: object }) {
  void formMethods;

  const { data: availableLanguages = [], isLoading } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[]; isLoading: boolean };

  const languagesToShow = useMemo(
    () => (availableLanguages ?? []) as LanguageOption[],
    [availableLanguages],
  );

  return { languagesToShow, isLoading };
}
