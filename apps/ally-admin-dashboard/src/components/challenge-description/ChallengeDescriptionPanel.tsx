import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { FORM_FIELD_IDS } from "@constants";
import { useResolvedPrimaryLanguageId } from "@hooks";

import { EnhanceButton } from "../enhance-button";
import { FormLabel } from "../form-label";
import { LanguageTabPanel } from "../language-tab-panel";
import { RichTextEditor } from "../rich-text-editor";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

const TRANSLATION_DESCRIPTION_FIELD = "translationDescription" as const;
const PRIMARY_LANGUAGE_FIELD = "challengeDescriptionPrimaryLanguageId" as const;

const DESCRIPTION_MAX_LENGTH = 1000;

interface ChallengeDescriptionPanelProps {
  formMethods: any;
  isMandatory?: boolean;
  label?: string;
  placeholder?: string;
  maxLength?: number;
  /** When set, render a field-level Enhance control for the active tab. */
  enhanceType?: string;
}

export const ChallengeDescriptionPanel: FC<ChallengeDescriptionPanelProps> = ({
  formMethods,
  isMandatory = false,
  label = "Challenge Description",
  placeholder,
  maxLength = DESCRIPTION_MAX_LENGTH,
  enhanceType,
}) => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control, getValues } = formMethods;
  const description =
    (useWatch({ control, name: FORM_FIELD_IDS.DESCRIPTION }) as string | undefined) ?? "";
  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const challengeDescriptionPrimaryLanguageId = useWatch({
    control,
    name: PRIMARY_LANGUAGE_FIELD,
  }) as number | null | undefined;
  const translationDescription =
    (useWatch({ control, name: TRANSLATION_DESCRIPTION_FIELD }) as
      | Record<string, string>
      | undefined) ?? {};

  const scenarioLanguageTabs = useMemo(() => {
    const catalog = catalogLanguages as LanguageOption[];
    return [...catalog]
      .map(lang => {
        const id = String(lang.language_id);
        const code =
          [lang.value, lang.translationCode].map(s => String(s ?? "").trim()).find(Boolean) ?? "";
        return {
          languageId: id,
          label: lang.label ?? `Language ${id}`,
          value: code,
        };
      })
      .sort((a, b) => Number(a.languageId) - Number(b.languageId));
  }, [catalogLanguages]);

  const resolvedPrimaryId = useResolvedPrimaryLanguageId(
    catalogLanguages as LanguageOption[],
    challengeDescriptionPrimaryLanguageId,
  );

  const effectivePrimaryId = useMemo(() => {
    if (resolvedPrimaryId) return resolvedPrimaryId;
    return scenarioLanguageTabs[0]?.languageId ?? null;
  }, [resolvedPrimaryId, scenarioLanguageTabs]);

  const activeLanguageId = useMemo(() => {
    if (selectedLanguageId && scenarioLanguageTabs.some(t => t.languageId === selectedLanguageId)) {
      return selectedLanguageId;
    }
    return scenarioLanguageTabs[0]?.languageId ?? null;
  }, [scenarioLanguageTabs, selectedLanguageId]);

  const isPrimaryTab = activeLanguageId != null && activeLanguageId === effectivePrimaryId;

  const valueForActiveTab = useMemo(() => {
    if (!activeLanguageId) return "";
    if (isPrimaryTab) return description;
    return translationDescription[activeLanguageId] ?? "";
  }, [activeLanguageId, isPrimaryTab, description, translationDescription]);

  const flushValueToForm = useCallback(
    (langId: string, value: string) => {
      const primary = effectivePrimaryId;
      if (primary != null && langId === primary) {
        setValue(FORM_FIELD_IDS.DESCRIPTION, value, {
          shouldDirty: true,
          shouldTouch: true,
        });
        return;
      }
      const prev = (getValues(TRANSLATION_DESCRIPTION_FIELD) ?? {}) as Record<string, string>;
      setValue(
        TRANSLATION_DESCRIPTION_FIELD,
        { ...prev, [langId]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [getValues, effectivePrimaryId, setValue],
  );

  const handleChange = useCallback(
    (next: string) => {
      if (!activeLanguageId) return;
      flushValueToForm(activeLanguageId, next);
    },
    [activeLanguageId, flushValueToForm],
  );

  if (catalogLoading) {
    return (
      <div
        className="w-full text-sm text-typography-600"
        data-testid="challenge-description-loading"
      >
        Loading languages…
      </div>
    );
  }

  if (scenarioLanguageTabs.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        No languages with voices are available in the catalog yet. Add scenario voices in admin to
        edit the challenge description per language.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="challenge-description-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
        {enhanceType && (
          <EnhanceButton
            enhanceType={enhanceType}
            label={label}
            currentValue={valueForActiveTab}
            onApply={handleChange}
          />
        )}
      </div>
      <LanguageTabPanel
        tabs={scenarioLanguageTabs.map(t => ({ id: t.languageId, label: t.label }))}
        activeTabId={activeLanguageId}
        onTabChange={setSelectedLanguageId}
      >
        {activeLanguageId && (
          <div className="p-4">
            <RichTextEditor
              value={valueForActiveTab}
              onChange={handleChange}
              placeholder={placeholder}
              maxLength={maxLength}
              borderless
            />
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
