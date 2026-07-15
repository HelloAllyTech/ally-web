import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { APP_TRANSLATION_LANGUAGE_CODES, FORM_FIELD_IDS } from "@constants";
import { useResolvedPrimaryLanguageId } from "@hooks";

import { EnhanceButton } from "../enhance-button";
import { FormLabel } from "../form-label";
import { LanguageTabPanel } from "../language-tab-panel";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

const TRANSLATION_TITLE_FIELD = "translationTitle" as const;
const PRIMARY_LANGUAGE_FIELD = "openingDialoguePrimaryLanguageId" as const;

const TITLE_MAX_LENGTH = 100;

interface TitleTranslationsPanelProps {
  formMethods: any;
  label?: string;
  isMandatory?: boolean;
  /** When set, render a field-level Enhance control (primary tab only). */
  enhanceType?: string;
  /** View Details mode: language tabs stay navigable, title isn't editable. */
  readOnly?: boolean;
}

export const TitleTranslationsPanel: FC<TitleTranslationsPanelProps> = ({
  formMethods,
  label = "Title",
  isMandatory = false,
  enhanceType,
  readOnly = false,
}) => {
  const { setValue, control, getValues, watch } = formMethods;
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

  const title = (watch(FORM_FIELD_IDS.TITLE) as string | undefined) ?? "";

  const resolvedPrimaryId = useResolvedPrimaryLanguageId(catalogLanguages, primaryLanguageId);

  // Primary tab: the English/first language
  const primaryTab = useMemo(() => {
    if (!resolvedPrimaryId) return { languageId: "__primary__", label: "English (India)" };
    const lang = catalogLanguages.find(l => String(l.language_id) === resolvedPrimaryId);
    return {
      languageId: resolvedPrimaryId,
      label: lang?.label ?? "English (India)",
    };
  }, [resolvedPrimaryId, catalogLanguages]);

  // Translation tabs: app translation languages + voice-mapped languages, excluding primary
  const translatableTabs = useMemo(() => {
    const byId = new Map<string, { languageId: string; label: string }>();

    for (const lang of catalogLanguages) {
      if (
        APP_TRANSLATION_LANGUAGE_CODES.includes(String(lang.translationCode ?? "").toLowerCase())
      ) {
        const id = String(lang.language_id);
        byId.set(id, { languageId: id, label: lang.label ?? `Language ${id}` });
      }
    }

    for (const [langId, voice] of Object.entries(languageVoices ?? {})) {
      if (!voice) continue;
      if (byId.has(langId)) continue;
      const lang = catalogLanguages.find(l => String(l.language_id) === langId);
      byId.set(langId, {
        languageId: langId,
        label: lang?.label ?? `Language ${langId}`,
      });
    }

    return Array.from(byId.values())
      .filter(t => t.languageId !== resolvedPrimaryId)
      .sort((a, b) => Number(a.languageId) - Number(b.languageId));
  }, [catalogLanguages, languageVoices, resolvedPrimaryId]);

  const allTabs = useMemo(() => [primaryTab, ...translatableTabs], [primaryTab, translatableTabs]);

  const activeLanguageId = useMemo(() => {
    if (selectedLanguageId && allTabs.some(t => t.languageId === selectedLanguageId)) {
      return selectedLanguageId;
    }
    return allTabs[0]?.languageId ?? null;
  }, [allTabs, selectedLanguageId]);

  const isPrimaryTab = activeLanguageId === primaryTab.languageId;

  const valueForActiveTab = useMemo(() => {
    if (!activeLanguageId) return "";
    if (isPrimaryTab) return title;
    return translationTitle[activeLanguageId] ?? "";
  }, [activeLanguageId, isPrimaryTab, title, translationTitle]);

  const handleChange = useCallback(
    (value: string) => {
      if (!activeLanguageId) return;
      if (isPrimaryTab) {
        setValue(FORM_FIELD_IDS.TITLE, value, { shouldDirty: true, shouldTouch: true });
        return;
      }
      const prev = (getValues(TRANSLATION_TITLE_FIELD) ?? {}) as Record<string, string>;
      setValue(
        TRANSLATION_TITLE_FIELD,
        { ...prev, [activeLanguageId]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [activeLanguageId, isPrimaryTab, getValues, setValue],
  );

  // Improve runs on the primary tab only; re-translate into the other
  // languages so every title translation stays in sync with the improved one.
  const translateTargets = useMemo(
    () =>
      translatableTabs
        .map(t => {
          const lang = catalogLanguages.find(l => String(l.language_id) === t.languageId);
          const code =
            [lang?.value, lang?.translationCode].map(s => String(s ?? "").trim()).find(Boolean) ??
            "";
          return { languageId: t.languageId, languageCode: code };
        })
        .filter(t => t.languageCode),
    [translatableTabs, catalogLanguages],
  );

  const handleEnhanceApply = useCallback(
    (improved: string, translations?: Record<string, string>) => {
      setValue(FORM_FIELD_IDS.TITLE, improved, { shouldDirty: true, shouldTouch: true });
      if (translations && Object.keys(translations).length > 0) {
        const prev = (getValues(TRANSLATION_TITLE_FIELD) ?? {}) as Record<string, string>;
        setValue(
          TRANSLATION_TITLE_FIELD,
          { ...prev, ...translations },
          { shouldDirty: true, shouldTouch: true },
        );
      }
    },
    [getValues, setValue],
  );

  if (catalogLoading) {
    return <div className="w-full text-sm text-typography-600">Loading languages…</div>;
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="title-translations-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
          <span className="text-typography-500 text-xs">
            English title is required, other languages will be auto generated if left blank.
          </span>
        </div>
        {enhanceType && isPrimaryTab && !readOnly && (
          <EnhanceButton
            enhanceType={enhanceType}
            label={label}
            currentValue={title}
            onApply={handleEnhanceApply}
            translateTo={translateTargets}
          />
        )}
      </div>
      <LanguageTabPanel
        tabs={allTabs.map(t => ({ id: t.languageId, label: t.label }))}
        activeTabId={activeLanguageId}
        onTabChange={setSelectedLanguageId}
      >
        <div className="p-4">
          <input
            type="text"
            value={valueForActiveTab}
            onChange={e => handleChange(e.target.value)}
            placeholder={readOnly ? "" : "Enter title"}
            maxLength={TITLE_MAX_LENGTH}
            readOnly={readOnly}
            className="w-full px-3 py-2 text-sm text-typography-800 bg-transparent focus:outline-none"
          />
        </div>
      </LanguageTabPanel>
    </div>
  );
};
