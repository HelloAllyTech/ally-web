import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useGetAutofillModelsQuery, useRegenerateFieldMutation } from "@api";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { FALLBACK_AUTOFILL_MODEL_OPTIONS, en } from "@constants";

import { AutofillButton } from "../autofill-button";
import { LanguageTabPanel } from "../language-tab-panel";
import { isNonEmptyArray } from "@utils";

import { SAMPLE_COUNT, buildScenarioContext, type LanguageOption } from "./scenarioLanguageUtils";
import { useScenarioLanguagesToShow } from "./useScenarioLanguagesToShow";

interface LinguisticStyleSamplesPanelProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
  selectedModel: string;
  onSelectedModelChange: (model: string) => void;
}

export const LinguisticStyleSamplesPanel: FC<LinguisticStyleSamplesPanelProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  isMandatory = false,
  selectedModel,
  onSelectedModelChange,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control } = formMethods;
  const { languagesToShow, isLoading } = useScenarioLanguagesToShow(formMethods);

  const linguisticStyleSamples = useWatch({ control, name: id }) ?? {};

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

  const hasAnySamplesContent = useMemo(() => {
    for (const lines of Object.values(linguisticStyleSamples ?? {})) {
      if (!Array.isArray(lines)) continue;
      if (lines.some(l => String(l ?? "").trim().length > 0)) return true;
    }
    return false;
  }, [linguisticStyleSamples]);

  const bulkAutofillLabel = regeneratingAll
    ? en.simulation.generating
    : hasAnySamplesContent
      ? en.simulation.regenerate
      : en.simulation.generate;

  const handleRegenerateAll = useCallback(async () => {
    if (languagesToShow.length === 0) return;
    setRegeneratingAll(true);
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
          fieldName: "linguisticStyleSamples",
          scenarioContext,
          model: selectedModel,
          provider: selectedProvider,
        })
          .unwrap()
          .then(response => ({
            languageId,
            label: lang.label ?? languageId,
            content: response?.content,
          }));
      }),
    );
    let updated = { ...linguisticStyleSamples };
    let successCount = 0;
    results.forEach((result, index) => {
      const lang = languages[index];
      const languageId = String(lang.language_id);
      if (result.status === "fulfilled" && isNonEmptyArray(result.value.content)) {
        updated = { ...updated, [languageId]: result.value.content };
        successCount++;
      } else if (result.status === "rejected") {
        toast.error(`${en.errors.failedToRegenerate} ${lang.label ?? languageId}`);
      }
    });
    if (successCount > 0) {
      setValue(id, updated);
      toast.success(`Generated samples for ${successCount} language(s)`);
    } else if (languages.length > 0) {
      const allRejected = results.every(r => r.status === "rejected");
      if (!allRejected) {
        toast.warning(en.simulation.bulkGenerateNoSamples);
      }
    }
    setRegeneratingAll(false);
  }, [
    formMethods,
    id,
    linguisticStyleSamples,
    languagesToShow,
    regenerateField,
    selectedModel,
    selectedProvider,
    setValue,
  ]);

  const handleSampleChange = useCallback(
    (languageId: string, index: number, value: string) => {
      const current = linguisticStyleSamples[languageId] ?? Array(SAMPLE_COUNT).fill("");
      const updated = [...current];
      updated[index] = value;
      setValue(id, {
        ...linguisticStyleSamples,
        [languageId]: updated,
      });
    },
    [id, linguisticStyleSamples, setValue],
  );

  if (isLoading || languagesToShow.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4" data-testid="linguistic-style-samples-panel">
      <div className="flex justify-between items-center py-2 w-full gap-4 flex-wrap">
        <span className="font-regular text-base text-typography-900">
          {label}
          {isMandatory && <span className="text-destructive-500"> *</span>}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AutofillModelSelect
            value={selectedModel}
            onChange={onSelectedModelChange}
            disabled={regeneratingAll}
          />
          <AutofillButton
            onClick={handleRegenerateAll}
            isLoading={regeneratingAll}
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
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: SAMPLE_COUNT }, (_, i) => {
              const samples: string[] =
                linguisticStyleSamples[activeLanguageId] ?? Array(SAMPLE_COUNT).fill("");
              return (
                <input
                  key={i}
                  type="text"
                  value={samples[i] ?? ""}
                  onChange={e => handleSampleChange(activeLanguageId, i, e.target.value)}
                  placeholder={`Sample ${i + 1}`}
                  className="w-full px-3 py-2 text-sm text-typography-800 bg-transparent border-b border-border-light focus:outline-none focus:border-primary-500 last:border-b-0"
                />
              );
            })}
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
