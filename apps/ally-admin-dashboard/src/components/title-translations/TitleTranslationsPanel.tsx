import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { FORM_FIELD_IDS } from "@constants";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

const TRANSLATION_TITLE_FIELD = "translationTitle" as const;
const PRIMARY_LANGUAGE_FIELD = "openingDialoguePrimaryLanguageId" as const;

const TITLE_MAX_LENGTH = 100;

interface TitleTranslationsPanelProps {
  formMethods: any;
}

export const TitleTranslationsPanel: FC<TitleTranslationsPanelProps> = ({ formMethods }) => {
  const { setValue, control, getValues } = formMethods;
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

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

  const translatableTabs = useMemo(() => {
    return selectedLanguageIds
      .filter(id => id !== resolvedPrimaryId)
      .map(id => {
        const lang = catalogLanguages.find(l => String(l.language_id) === id);
        return {
          languageId: id,
          label: lang?.label ?? `Language ${id}`,
        };
      })
      .sort((a, b) => Number(a.languageId) - Number(b.languageId));
  }, [selectedLanguageIds, resolvedPrimaryId, catalogLanguages]);

  const activeLanguageId = useMemo(() => {
    if (selectedLanguageId && translatableTabs.some(t => t.languageId === selectedLanguageId)) {
      return selectedLanguageId;
    }
    return translatableTabs[0]?.languageId ?? null;
  }, [translatableTabs, selectedLanguageId]);

  const valueForActiveTab = activeLanguageId ? (translationTitle[activeLanguageId] ?? "") : "";

  const handleChange = useCallback(
    (value: string) => {
      if (!activeLanguageId) return;
      const prev = (getValues(TRANSLATION_TITLE_FIELD) ?? {}) as Record<string, string>;
      setValue(
        TRANSLATION_TITLE_FIELD,
        { ...prev, [activeLanguageId]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [activeLanguageId, getValues, setValue],
  );

  if (catalogLoading || translatableTabs.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-2" data-testid="title-translations-panel">
      <label className="text-typography-700 text-sm">Title translations</label>
      <div className="border border-border-light rounded-md overflow-hidden bg-white">
        <div className="flex border-b border-border-light overflow-x-auto">
          {translatableTabs.map(tab => {
            const isActive = activeLanguageId === tab.languageId;
            return (
              <button
                key={tab.languageId}
                type="button"
                onClick={() => setSelectedLanguageId(tab.languageId)}
                className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-500 border-b-2 border-primary-500 bg-primary-50/30"
                    : "text-typography-600 hover:text-typography-800 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeLanguageId && (
          <div className="p-4">
            <input
              type="text"
              value={valueForActiveTab}
              onChange={e => handleChange(e.target.value)}
              placeholder="Enter title"
              maxLength={TITLE_MAX_LENGTH}
              className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-800"
            />
          </div>
        )}
      </div>
    </div>
  );
};
