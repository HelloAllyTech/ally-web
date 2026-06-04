import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useGetAutofillModelsQuery, useRegenerateFieldMutation } from "@api";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { FillerTagPicker } from "@components/filler-tag-picker";
import { FALLBACK_AUTOFILL_MODEL_OPTIONS, en } from "@constants";

import { AutofillButton } from "../autofill-button";
import { LanguageTabPanel } from "../language-tab-panel";
import { isNonEmptyArray } from "@utils";

import {
  ALLOWED_FILLER_WORDS_FIELD,
  ALLOWED_FILLER_WORDS_MAX,
  buildScenarioContext,
  stringsToFillerTags,
  uniqueFillerNamesPreserveOrder,
  type FillerTag,
  type LanguageOption,
} from "./scenarioLanguageUtils";
import { useScenarioLanguagesToShow } from "./useScenarioLanguagesToShow";

interface AllowedFillerWordsPanelProps {
  formMethods: any;
  selectedModel: string;
  onSelectedModelChange: (model: string) => void;
}

export const AllowedFillerWordsPanel: FC<AllowedFillerWordsPanelProps> = ({
  formMethods,
  selectedModel,
  onSelectedModelChange,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";
  const [regeneratingFillersAll, setRegeneratingFillersAll] = useState(false);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  /** Accumulated filler names per language (AI + user) so removed items stay searchable in the picker. */
  const [fillerHintNamesByLang, setFillerHintNamesByLang] = useState<Record<string, string[]>>({});

  const { setValue, control } = formMethods;
  const { languagesToShow, isLoading } = useScenarioLanguagesToShow(formMethods);

  const allowedFillerWords =
    (useWatch({ control, name: ALLOWED_FILLER_WORDS_FIELD }) as Record<string, string[]>) ?? {};

  useEffect(() => {
    setFillerHintNamesByLang(prev => {
      let next = prev;
      let changed = false;
      for (const [langId, arr] of Object.entries(allowedFillerWords)) {
        const incoming = uniqueFillerNamesPreserveOrder(
          (arr ?? []).map(s => String(s).trim()).filter(Boolean),
        );
        const prevList = next[langId] ?? [];
        const merged = uniqueFillerNamesPreserveOrder([...prevList, ...incoming]);
        if (merged.length !== prevList.length || merged.some((n, i) => n !== prevList[i])) {
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          next[langId] = merged;
        }
      }
      return changed ? next : prev;
    });
  }, [allowedFillerWords]);

  const activeLanguageId = useMemo(() => {
    if (
      selectedLanguageId &&
      (languagesToShow as LanguageOption[]).some(l => String(l.language_id) === selectedLanguageId)
    ) {
      return selectedLanguageId;
    }
    return languagesToShow.length > 0
      ? String((languagesToShow[0] as LanguageOption).language_id)
      : null;
  }, [languagesToShow, selectedLanguageId]);

  const fillerTagsForActiveLanguage = useMemo(() => {
    if (!activeLanguageId) return [];
    return stringsToFillerTags(allowedFillerWords[activeLanguageId]);
  }, [activeLanguageId, allowedFillerWords]);

  const hasAnyFillersContent = useMemo(() => {
    for (const arr of Object.values(allowedFillerWords ?? {})) {
      if (!Array.isArray(arr)) continue;
      if (arr.some(n => String(n ?? "").trim().length > 0)) return true;
    }
    return false;
  }, [allowedFillerWords]);

  const bulkAutofillLabel = regeneratingFillersAll
    ? en.simulation.generating
    : hasAnyFillersContent
      ? en.simulation.regenerate
      : en.simulation.generate;

  const handleFillerTagsChange = useCallback(
    (tags: FillerTag[]) => {
      if (!activeLanguageId) return;
      const names = uniqueFillerNamesPreserveOrder(tags.map(t => t.name));
      setValue(ALLOWED_FILLER_WORDS_FIELD, {
        ...allowedFillerWords,
        [activeLanguageId]: names,
      });
    },
    [activeLanguageId, allowedFillerWords, setValue],
  );

  const handleRegenerateAllFillers = useCallback(async () => {
    if (languagesToShow.length === 0) return;
    setRegeneratingFillersAll(true);
    const languages = languagesToShow as LanguageOption[];
    const results = await Promise.allSettled(
      languages.map(lang => {
        const languageId = String(lang.language_id);
        const scenarioContext = buildScenarioContext(
          formMethods,
          languageId,
          lang.value ?? "",
          lang.label ?? "",
        );
        return regenerateField({
          fieldName: ALLOWED_FILLER_WORDS_FIELD,
          scenarioContext,
          model: selectedModel,
          provider: selectedProvider,
        })
          .unwrap()
          .then(response => ({
            languageId,
            label: lang.label ?? languageId,
            content: response?.content as string[] | undefined,
          }));
      }),
    );
    let updated = { ...allowedFillerWords };
    let successCount = 0;
    results.forEach((result, index) => {
      const lang = languages[index];
      const languageId = String(lang.language_id);
      if (result.status === "fulfilled" && isNonEmptyArray(result.value.content)) {
        const cleaned = uniqueFillerNamesPreserveOrder(
          result.value.content.map(s => (typeof s === "string" ? s.trim() : "")).filter(Boolean),
        );
        updated = {
          ...updated,
          [languageId]: cleaned,
        };
        successCount++;
      } else if (result.status === "rejected") {
        toast.error(`${en.errors.failedToRegenerate} ${lang.label ?? languageId}`);
      }
    });
    if (successCount > 0) {
      setValue(ALLOWED_FILLER_WORDS_FIELD, updated);
      toast.success(en.simulation.generatedFillersAllCount(successCount));
    } else if (languages.length > 0) {
      const allRejected = results.every(r => r.status === "rejected");
      if (!allRejected) {
        toast.warning(en.simulation.bulkGenerateNoFillers);
      }
    }
    setRegeneratingFillersAll(false);
  }, [
    allowedFillerWords,
    formMethods,
    languagesToShow,
    regenerateField,
    selectedModel,
    selectedProvider,
    setValue,
  ]);

  if (isLoading || languagesToShow.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4" data-testid="allowed-filler-words-panel">
      <div className="flex justify-between items-center py-2 w-full gap-4 flex-wrap">
        <span className="font-regular text-base text-typography-900">
          {en.simulation.allowedFillersSectionTitle}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AutofillModelSelect
            value={selectedModel}
            onChange={onSelectedModelChange}
            disabled={regeneratingFillersAll}
          />
          <AutofillButton
            onClick={handleRegenerateAllFillers}
            isLoading={regeneratingFillersAll}
            label={bulkAutofillLabel}
          />
        </div>
      </div>
      <LanguageTabPanel
        tabs={(languagesToShow as LanguageOption[]).map(l => ({
          id: String(l.language_id),
          label: l.label ?? String(l.language_id),
        }))}
        activeTabId={activeLanguageId}
        onTabChange={setSelectedLanguageId}
      >
        {activeLanguageId && (
          <div className="p-4">
            <div className="min-h-[40px]">
              <FillerTagPicker
                tags={fillerTagsForActiveLanguage}
                updateTags={handleFillerTagsChange}
                maxTags={ALLOWED_FILLER_WORDS_MAX}
                supplementalTagNames={fillerHintNamesByLang[activeLanguageId] ?? []}
              />
            </div>
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
