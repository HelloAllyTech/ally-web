import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { FORM_FIELD_IDS } from "@constants";
import { useResolvedPrimaryLanguageId } from "@hooks";

import { EnhanceButton } from "../enhance-button";
import { FormLabel } from "../form-label";
import { LanguageTabPanel } from "../language-tab-panel";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

export const OPENING_DIALOGUE_LINE_SLOTS = 5;

const TRANSLATION_OPENING_FIELD = "translationOpeningStatements" as const;
const PRIMARY_LANGUAGE_FIELD = "openingDialoguePrimaryLanguageId" as const;

interface OpeningDialoguesPanelProps {
  formMethods: any;
  isMandatory?: boolean;
  /** When set, render a field-level Enhance control for the active tab. */
  enhanceType?: string;
  /** View Details mode: language tabs stay navigable, lines aren't editable. */
  readOnly?: boolean;
}

export const OpeningDialoguesPanel: FC<OpeningDialoguesPanelProps> = ({
  formMethods,
  isMandatory = false,
  enhanceType,
  readOnly = false,
}) => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control, getValues } = formMethods;
  const openingStatementsStr =
    (useWatch({ control, name: FORM_FIELD_IDS.OPENING_STATEMENTS }) as string | undefined) ?? "";
  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const openingDialoguePrimaryLanguageId = useWatch({ control, name: PRIMARY_LANGUAGE_FIELD }) as
    | number
    | null
    | undefined;
  const translationOpeningStatements =
    (useWatch({ control, name: TRANSLATION_OPENING_FIELD }) as
      | Record<string, string[]>
      | undefined) ?? {};

  /** Same catalog as Language–Voice (voicesNeeded). Tabs include languages even when no voice is chosen—runtime uses fallback voice. */
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
    openingDialoguePrimaryLanguageId,
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

  const linesForActiveTab = useMemo(() => {
    if (!activeLanguageId) return Array(OPENING_DIALOGUE_LINE_SLOTS).fill("");
    if (isPrimaryTab) {
      const parts = String(openingStatementsStr ?? "").split("\n");
      return Array.from({ length: OPENING_DIALOGUE_LINE_SLOTS }, (_, i) => parts[i] ?? "");
    }
    const arr = translationOpeningStatements[activeLanguageId] ?? [];
    return Array.from({ length: OPENING_DIALOGUE_LINE_SLOTS }, (_, i) => arr[i] ?? "");
  }, [
    activeLanguageId,
    isPrimaryTab,
    openingStatementsStr,
    translationOpeningStatements,
    selectedLanguageId,
  ]);

  const flushLinesToForm = useCallback(
    (langId: string, lines: string[]) => {
      const primary = effectivePrimaryId;
      if (primary != null && langId === primary) {
        const nonEmpty = lines.filter(l => l.length > 0);
        setValue(FORM_FIELD_IDS.OPENING_STATEMENTS, nonEmpty.join("\n"), {
          shouldDirty: true,
          shouldTouch: true,
        });
        return;
      }
      const prev = (getValues(TRANSLATION_OPENING_FIELD) ?? {}) as Record<string, string[]>;
      const nonEmpty = lines.filter(l => l.length > 0);
      setValue(
        TRANSLATION_OPENING_FIELD,
        { ...prev, [langId]: nonEmpty },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [getValues, effectivePrimaryId, setValue],
  );

  const handleLineChange = useCallback(
    (index: number, value: string) => {
      if (!activeLanguageId) return;
      const next = [...linesForActiveTab];
      next[index] = value;
      flushLinesToForm(activeLanguageId, next);
    },
    [activeLanguageId, flushLinesToForm, linesForActiveTab],
  );

  // Enhance treats the primary tab's non-empty lines as a newline-joined blob;
  // the improved text (and each re-translated language) is split back into the
  // fixed line slots. Improve is offered on the primary tab only.
  const enhanceCurrentValue = linesForActiveTab.filter(l => l.trim().length > 0).join("\n");

  const translateTargets = useMemo(
    () =>
      scenarioLanguageTabs
        .filter(t => t.languageId !== effectivePrimaryId && t.value)
        .map(t => ({ languageId: t.languageId, languageCode: t.value })),
    [scenarioLanguageTabs, effectivePrimaryId],
  );

  const handleEnhanceApply = useCallback(
    (improved: string, translations?: Record<string, string>) => {
      if (effectivePrimaryId == null) return;
      const toSlots = (text: string) =>
        text
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean)
          .slice(0, OPENING_DIALOGUE_LINE_SLOTS);
      flushLinesToForm(effectivePrimaryId, toSlots(improved));
      if (translations) {
        for (const [langId, text] of Object.entries(translations)) {
          flushLinesToForm(langId, toSlots(text));
        }
      }
    },
    [effectivePrimaryId, flushLinesToForm],
  );

  if (catalogLoading) {
    return (
      <div className="w-full text-sm text-typography-600" data-testid="opening-dialogues-loading">
        Loading languages…
      </div>
    );
  }

  if (scenarioLanguageTabs.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        No languages with voices are available in the catalog yet. Add scenario voices in admin to
        edit opening dialogues per language.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="opening-dialogues-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormLabel isMandatory={isMandatory}>Opening Dialogues</FormLabel>
        {enhanceType && isPrimaryTab && !readOnly && (
          <EnhanceButton
            enhanceType={enhanceType}
            label="Opening Dialogues"
            currentValue={enhanceCurrentValue}
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
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: OPENING_DIALOGUE_LINE_SLOTS }, (_, i) => (
              <input
                key={i}
                type="text"
                value={linesForActiveTab[i] ?? ""}
                onChange={e => handleLineChange(i, e.target.value)}
                placeholder={readOnly ? "" : `Opening line ${i + 1}`}
                readOnly={readOnly}
                className="w-full px-3 py-2 text-sm text-typography-800 bg-transparent border-b border-border-light focus:outline-none focus:border-primary-500 last:border-b-0"
              />
            ))}
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
