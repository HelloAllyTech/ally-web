// In useScenarioLanguages.ts
import { useMemo } from "react";

import { useGetAvailableLanguagesQuery } from "../api/learn";
import { useGetUserPreferencesQuery } from "../api/user";
import { LanguageOption } from "../types";

export const useScenarioLanguages = () => {
  const {
    data: availableLanguages = [],
    isLoading: isLanguagesLoading,
    error: languagesError,
  } = useGetAvailableLanguagesQuery({ active: true, hasVoices: true });

  const {
    data: preferencesResponse,
    isLoading: isPreferencesLoading,
    error: preferencesError,
  } = useGetUserPreferencesQuery();

  return useMemo(() => {
    // Handle loading state
    if (isLanguagesLoading || isPreferencesLoading) {
      return {
        languages: [],
        defaultLanguage: null,
        isLoading: true,
        error: null,
      };
    }

    // Handle error state
    if (languagesError || preferencesError) {
      return {
        languages: [],
        defaultLanguage: null,
        isLoading: false,
        error: languagesError || preferencesError,
      };
    }

    const formattedLanguages = availableLanguages.map(lang => ({
      ...lang,
      value: lang.value,
      label: lang.label,
    }));

    // Find the default language based on user preferences or fallback to 'en-IN'
    let defaultLanguage: LanguageOption | null = null;
    const preferredLanguageId = preferencesResponse?.data?.default_language_id;

    if (preferredLanguageId) {
      // Find language by language_id from preferences
      defaultLanguage =
        formattedLanguages.find(lang => lang.language_id === preferredLanguageId) || null;
    }

    // If no preference set or language not found, fallback to 'en-IN' or first available
    if (!defaultLanguage) {
      defaultLanguage =
        formattedLanguages.find(lang => lang.value === "en-IN") || formattedLanguages[0] || null;
    }

    return {
      languages: formattedLanguages,
      defaultLanguage,
      isLoading: false,
      error: null,
    };
  }, [
    availableLanguages,
    isLanguagesLoading,
    languagesError,
    preferencesResponse,
    isPreferencesLoading,
    preferencesError,
  ]);
};
