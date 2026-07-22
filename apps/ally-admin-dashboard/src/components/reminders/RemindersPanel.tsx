import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { FORM_FIELD_IDS } from "@constants";
import { useResolvedPrimaryLanguageId } from "@hooks";

import { EnhanceButton } from "../enhance-button";
import { FormLabel } from "../form-label";
import { LanguageTabPanel } from "../language-tab-panel";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

// Reminders are a free-form, arbitrary-length bullet list (unlike Opening
// Dialogues' fixed 5-slot grid), so each language tab is backed by a single
// raw newline-joined string kept as-typed — same convention as the primary
// `reminders` field — and only split into string[] lines at save time
// (CreateSimulation.tsx). This avoids losing the line a learner is mid-typing
// on if it were split/filtered on every keystroke.
const TRANSLATION_REMINDERS_FIELD = "translationReminders" as const;
const PRIMARY_LANGUAGE_FIELD = "remindersPrimaryLanguageId" as const;

interface RemindersPanelProps {
  formMethods: any;
  isMandatory?: boolean;
  /** View Details mode: language tabs stay navigable, text isn't editable. */
  readOnly?: boolean;
  /** When set, render a field-level Enhance control for the primary tab. */
  enhanceType?: string;
}

export const RemindersPanel: FC<RemindersPanelProps> = ({
  formMethods,
  isMandatory = false,
  readOnly = false,
  enhanceType,
}) => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control, getValues } = formMethods;
  const reminders =
    (useWatch({ control, name: FORM_FIELD_IDS.REMINDERS }) as string | undefined) ?? "";
  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const remindersPrimaryLanguageId = useWatch({ control, name: PRIMARY_LANGUAGE_FIELD }) as
    | number
    | null
    | undefined;
  const translationReminders =
    (useWatch({ control, name: TRANSLATION_REMINDERS_FIELD }) as
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
    remindersPrimaryLanguageId,
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
    if (isPrimaryTab) return reminders;
    return translationReminders[activeLanguageId] ?? "";
  }, [activeLanguageId, isPrimaryTab, reminders, translationReminders]);

  const flushValueToForm = useCallback(
    (langId: string, value: string) => {
      const primary = effectivePrimaryId;
      if (primary != null && langId === primary) {
        setValue(FORM_FIELD_IDS.REMINDERS, value, {
          shouldDirty: true,
          shouldTouch: true,
        });
        return;
      }
      const prev = (getValues(TRANSLATION_REMINDERS_FIELD) ?? {}) as Record<string, string>;
      setValue(
        TRANSLATION_REMINDERS_FIELD,
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

  // Improve runs on the primary tab only; re-translate into the other
  // languages so every translation stays in sync with the improved source.
  const translateTargets = useMemo(
    () =>
      scenarioLanguageTabs
        .filter(t => t.languageId !== effectivePrimaryId && t.value)
        .map(t => ({ languageId: t.languageId, languageCode: t.value })),
    [scenarioLanguageTabs, effectivePrimaryId],
  );

  const handleEnhanceApply = useCallback(
    (improved: string, translations?: Record<string, string>) => {
      setValue(FORM_FIELD_IDS.REMINDERS, improved, {
        shouldDirty: true,
        shouldTouch: true,
      });
      if (translations && Object.keys(translations).length > 0) {
        const prev = (getValues(TRANSLATION_REMINDERS_FIELD) ?? {}) as Record<string, string>;
        setValue(
          TRANSLATION_REMINDERS_FIELD,
          { ...prev, ...translations },
          { shouldDirty: true, shouldTouch: true },
        );
      }
    },
    [getValues, setValue],
  );

  if (catalogLoading) {
    return (
      <div className="w-full text-sm text-typography-600" data-testid="reminders-loading">
        Loading languages…
      </div>
    );
  }

  if (scenarioLanguageTabs.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        No languages with voices are available in the catalog yet. Add scenario voices in admin to
        edit reminders per language.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="reminders-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormLabel isMandatory={isMandatory}>Reminders</FormLabel>
        {enhanceType && isPrimaryTab && !readOnly && (
          <EnhanceButton
            enhanceType={enhanceType}
            label="Reminders"
            currentValue={reminders}
            onApply={handleEnhanceApply}
            translateTo={translateTargets}
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
            <textarea
              value={valueForActiveTab}
              onChange={e => handleChange(e.target.value)}
              placeholder={readOnly ? "" : "One reminder per line, e.g. Maintain eye contact"}
              readOnly={readOnly}
              rows={6}
              className="w-full px-3 py-2 text-sm text-typography-800 bg-transparent border border-border-light rounded-md focus:outline-none focus:border-primary-500 resize-y"
            />
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
