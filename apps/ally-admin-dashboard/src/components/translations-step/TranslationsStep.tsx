import { FC, useCallback, useMemo } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { FORM_FIELD_IDS } from "@constants";

const TRANSLATION_TITLE_FIELD = "translationTitle" as const;
const PRIMARY_LANGUAGE_FIELD = "openingDialoguePrimaryLanguageId" as const;

type LanguageOption = {
  language_id: number;
  value: string;
  label: string;
  translationCode?: string;
};

interface TranslationsStepProps {
  formMethods: any;
}

export const TranslationsStep: FC<TranslationsStepProps> = ({ formMethods }) => {
  const { setValue, control, getValues } = formMethods;

  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const languageVoices =
    (useWatch({ control, name: FORM_FIELD_IDS.LANGUAGES_VOICES }) as
      | Record<string, string>
      | undefined) ?? {};

  const primaryLanguageId = useWatch({ control, name: PRIMARY_LANGUAGE_FIELD }) as
    | number
    | null
    | undefined;

  const primaryTitle =
    (useWatch({ control, name: FORM_FIELD_IDS.TITLE }) as string | undefined) ?? "";

  const translationTitle =
    (useWatch({ control, name: TRANSLATION_TITLE_FIELD }) as Record<string, string> | undefined) ??
    {};

  const selectedLanguageIds = useMemo(
    () => Object.keys(languageVoices ?? {}).filter(id => !!languageVoices[id]),
    [languageVoices],
  );

  const resolvedPrimaryId = useMemo(() => {
    if (primaryLanguageId != null) return String(primaryLanguageId);
    const enFirst = catalogLanguages.find(
      l =>
        String(l.value ?? "")
          .toLowerCase()
          .includes("en") || String(l.translationCode ?? "") === "en",
    );
    if (enFirst) return String(enFirst.language_id);
    return selectedLanguageIds[0] ?? null;
  }, [primaryLanguageId, catalogLanguages, selectedLanguageIds]);

  const translatableLanguages = useMemo(() => {
    return selectedLanguageIds
      .filter(id => id !== resolvedPrimaryId)
      .map(id => {
        const lang = catalogLanguages.find(l => String(l.language_id) === id);
        return {
          languageId: id,
          label: lang?.label ?? `Language ${id}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedLanguageIds, resolvedPrimaryId, catalogLanguages]);

  const handleTitleChange = useCallback(
    (languageId: string, value: string) => {
      const prev = (getValues(TRANSLATION_TITLE_FIELD) as Record<string, string> | undefined) ?? {};
      setValue(
        TRANSLATION_TITLE_FIELD,
        { ...prev, [languageId]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [getValues, setValue],
  );

  const primaryLanguageLabel = useMemo(() => {
    if (!resolvedPrimaryId) return "Primary";
    const lang = catalogLanguages.find(l => String(l.language_id) === resolvedPrimaryId);
    return lang?.label ?? `Language ${resolvedPrimaryId}`;
  }, [resolvedPrimaryId, catalogLanguages]);

  if (catalogLoading) {
    return (
      <div className="w-full text-sm text-typography-600" data-testid="translations-step-loading">
        Loading languages…
      </div>
    );
  }

  if (translatableLanguages.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        Select more than one language in Basic Settings &gt; Language–Voice to add translations for
        the title.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6" data-testid="translations-step">
      <div className="flex flex-col gap-2">
        <label className="text-typography-900 text-base">Title ({primaryLanguageLabel})</label>
        <input
          type="text"
          value={primaryTitle}
          disabled
          className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-700 bg-gray-50"
        />
        <span className="text-xs text-typography-500">
          Edit the primary title in the Overview step.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-typography-900 text-base">Translations</label>
        {translatableLanguages.map(({ languageId, label }) => (
          <div key={languageId} className="flex flex-col gap-1">
            <span className="text-sm text-typography-700">{label}</span>
            <input
              type="text"
              value={translationTitle[languageId] ?? ""}
              onChange={e => handleTitleChange(languageId, e.target.value)}
              placeholder={`Title in ${label}`}
              maxLength={100}
              className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-800"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
