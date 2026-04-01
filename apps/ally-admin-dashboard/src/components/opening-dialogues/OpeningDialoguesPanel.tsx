import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useGetAvailableLanguageVoicesQuery, useRegenerateFieldMutation } from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { DEFAULT_AUTOFILL_MODEL, en, FORM_FIELD_IDS, REGENERATE_TYPE } from "@constants";
import { RegenerateFieldResponse } from "@types";
import { isNonEmptyArray } from "@utils";

import { buildScenarioContext } from "../linguistic-style-samples/scenarioLanguageUtils";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

/** Match prompt guidance (6–10 lines); UI offers 10 slots like linguistic samples. */
export const OPENING_DIALOGUE_LINE_SLOTS = 10;

const LANGUAGES_VOICES_FIELD = "languageVoices" as const;
const TRANSLATION_OPENING_FIELD = "translationOpeningStatements" as const;
const PRIMARY_LANGUAGE_FIELD = "openingDialoguePrimaryLanguageId" as const;

function parseOpeningLinesResponse(response: RegenerateFieldResponse): string[] | null {
  if (response.fieldName !== REGENERATE_TYPE.OPENING_STATEMENTS) return null;
  const content = response.content as unknown;
  if (!isNonEmptyArray(content)) return null;
  const asStrings = (content as unknown[]).map(c => String(c));
  return Array.from({ length: OPENING_DIALOGUE_LINE_SLOTS }, (_, i) => asStrings[i] ?? "");
}

interface OpeningDialoguesPanelProps {
  formMethods: any;
  isMandatory?: boolean;
}

export const OpeningDialoguesPanel: FC<OpeningDialoguesPanelProps> = ({
  formMethods,
  isMandatory = false,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const [regenerating, setRegenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control, getValues } = formMethods;
  const openingStatementsStr =
    (useWatch({ control, name: FORM_FIELD_IDS.OPENING_STATEMENTS }) as string | undefined) ?? "";
  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const languageVoices =
    useWatch({ control, name: LANGUAGES_VOICES_FIELD }) ?? ({} as Record<string, string>);
  const openingDialoguePrimaryLanguageId = useWatch({ control, name: PRIMARY_LANGUAGE_FIELD }) as
    | number
    | null
    | undefined;
  const translationOpeningStatements =
    (useWatch({ control, name: TRANSLATION_OPENING_FIELD }) as
      | Record<string, string[]>
      | undefined) ?? {};

  const scenarioLanguageTabs = useMemo(() => {
    const ids = Object.keys(languageVoices).filter(id => !!languageVoices[id]);
    const catalog = catalogLanguages as LanguageOption[];
    return ids
      .map(id => {
        const lang = catalog.find(l => String(l.language_id) === id);
        const code =
          [lang?.value, lang?.translationCode].map(s => String(s ?? "").trim()).find(Boolean) ?? "";
        return {
          languageId: id,
          label: lang?.label ?? `Language ${id}`,
          value: code,
        };
      })
      .sort((a, b) => Number(a.languageId) - Number(b.languageId));
  }, [languageVoices, catalogLanguages]);

  const resolvedPrimaryId = useMemo(() => {
    if (openingDialoguePrimaryLanguageId != null) {
      return String(openingDialoguePrimaryLanguageId);
    }
    const catalog = catalogLanguages as LanguageOption[];
    const enFirst = catalog.find(
      l =>
        String(l.value ?? "")
          .toLowerCase()
          .includes("en") ||
        String((l as { translationCode?: string }).translationCode ?? "") === "en",
    );
    if (enFirst) return String(enFirst.language_id);
    return catalog[0] ? String(catalog[0].language_id) : null;
  }, [openingDialoguePrimaryLanguageId, catalogLanguages]);

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

  const tabsWithLocale = useMemo(
    () => scenarioLanguageTabs.filter(t => !!t.value?.trim()),
    [scenarioLanguageTabs],
  );

  const hasAnyOpeningContent = useMemo(() => {
    if (
      String(openingStatementsStr ?? "")
        .split("\n")
        .some(line => line.trim().length > 0)
    ) {
      return true;
    }
    for (const lines of Object.values(translationOpeningStatements ?? {})) {
      if (lines?.some(l => String(l ?? "").trim().length > 0)) return true;
    }
    return false;
  }, [openingStatementsStr, translationOpeningStatements]);

  const openingAutofillLabel = regenerating
    ? en.simulation.generating
    : hasAnyOpeningContent
      ? en.simulation.regenerate
      : en.simulation.generate;

  const handleGenerate = useCallback(async () => {
    if (tabsWithLocale.length === 0 || regenerating || catalogLoading) return;
    setRegenerating(true);
    try {
      const results = await Promise.allSettled(
        tabsWithLocale.map(tab =>
          regenerateField({
            fieldName: REGENERATE_TYPE.OPENING_STATEMENTS,
            scenarioContext: buildScenarioContext(
              formMethods,
              tab.languageId,
              tab.value,
              tab.label,
            ),
            model: selectedModel,
          }).unwrap(),
        ),
      );

      let successCount = 0;
      results.forEach((result, index) => {
        const tab = tabsWithLocale[index];
        if (result.status === "fulfilled") {
          const lines = parseOpeningLinesResponse(result.value);
          if (lines) {
            flushLinesToForm(tab.languageId, lines);
            successCount++;
          } else {
            toast.warning(`${en.simulation.bulkGenerateNoOpeningDialogues} (${tab.label})`);
          }
        } else {
          toast.error(`${en.errors.failedToRegenerate} (${tab.label})`);
        }
      });

      if (successCount > 0) {
        toast.success(en.simulation.generatedOpeningDialoguesAllCount(successCount));
      } else if (tabsWithLocale.length > 0) {
        const allRejected = results.every(r => r.status === "rejected");
        if (!allRejected) {
          toast.warning(en.simulation.bulkGenerateNoOpeningDialogues);
        }
      }
    } finally {
      setRegenerating(false);
    }
  }, [
    catalogLoading,
    flushLinesToForm,
    formMethods,
    regenerateField,
    regenerating,
    selectedModel,
    tabsWithLocale,
  ]);

  if (scenarioLanguageTabs.length > 0 && catalogLoading) {
    return (
      <div className="w-full text-sm text-typography-600" data-testid="opening-dialogues-loading">
        Loading languages…
      </div>
    );
  }

  if (scenarioLanguageTabs.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        Select at least one language–voice mapping to edit opening dialogues per language.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="opening-dialogues-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
          Opening Dialogues {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AutofillModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={regenerating}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={regenerating || catalogLoading || tabsWithLocale.length === 0}
            className="inline-flex items-center gap-1 text-sm border rounded-2xl px-3 py-1.5 transition-opacity border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WandStars />
            )}{" "}
            {openingAutofillLabel}
          </button>
        </div>
      </div>
      <p className="text-sm text-typography-600">
        Autofill runs for every language you have mapped below. The primary tab syncs to scenario
        metadata; others are stored as translations. Tabs match languages with a selected voice in
        Language-Voice.
      </p>
      <div className="border border-border-light rounded-md overflow-hidden bg-white">
        <div className="flex border-b border-border-light overflow-x-auto">
          {scenarioLanguageTabs.map(tab => {
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
                {effectivePrimaryId === tab.languageId ? " · primary" : ""}
              </button>
            );
          })}
        </div>
        {activeLanguageId && (
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: OPENING_DIALOGUE_LINE_SLOTS }, (_, i) => (
              <input
                key={i}
                type="text"
                value={linesForActiveTab[i] ?? ""}
                onChange={e => handleLineChange(i, e.target.value)}
                placeholder={`Opening line ${i + 1}`}
                className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-800"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
