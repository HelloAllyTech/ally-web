import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  useGetAutofillModelsQuery,
  useGetAvailableLanguageVoicesQuery,
  useRegenerateFieldMutation,
} from "@api";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  en,
  FORM_FIELD_IDS,
  REGENERATE_TYPE,
} from "@constants";
import { useResolvedPrimaryLanguageId } from "@hooks";
import { RegenerateFieldResponse } from "@types";
import { isNonEmptyArray } from "@utils";

import { AutofillButton } from "../autofill-button";
import { FormLabel } from "../form-label";
import { LanguageTabPanel } from "../language-tab-panel";
import { buildScenarioContext } from "../linguistic-style-samples/scenarioLanguageUtils";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

export const OPENING_DIALOGUE_LINE_SLOTS = 5;

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
  const { data: apiModels } = useGetAutofillModelsQuery();
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const [regenerating, setRegenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";
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
            provider: selectedProvider,
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
    selectedProvider,
    tabsWithLocale,
  ]);

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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AutofillModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={regenerating}
          />
          <AutofillButton
            onClick={handleGenerate}
            isLoading={regenerating}
            label={openingAutofillLabel}
            disabled={catalogLoading || tabsWithLocale.length === 0}
          />
        </div>
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
                placeholder={`Opening line ${i + 1}`}
                className="w-full px-3 py-2 text-sm text-typography-800 bg-transparent border-b border-border-light focus:outline-none focus:border-primary-500 last:border-b-0"
              />
            ))}
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
