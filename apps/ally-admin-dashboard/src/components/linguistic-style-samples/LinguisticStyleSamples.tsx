import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useGetAvailableLanguageVoicesQuery, useRegenerateFieldMutation } from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { DEFAULT_AUTOFILL_MODEL, en } from "@constants";
import { isNonEmptyArray } from "@utils";

interface LanguageOption {
  language_id: number;
  value: string;
  label: string;
}

interface LinguisticStyleSamplesProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
}

const SAMPLE_COUNT = 10;

export const LinguisticStyleSamples: FC<LinguisticStyleSamplesProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  isMandatory = false,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control } = formMethods;

  const { data: availableLanguages = [], isLoading } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[]; isLoading: boolean };

  const linguisticStyleSamples = useWatch({ control, name: id }) ?? {};
  const languageVoices = useWatch({ control, name: "languageVoices" }) ?? {};

  const languagesToShow = useMemo(() => {
    const selectedLanguageIds = new Set(
      Object.entries(languageVoices)
        .filter(([, voiceId]) => Boolean(voiceId))
        .map(([languageId]) => String(languageId)),
    );

    return ((availableLanguages ?? []) as LanguageOption[]).filter(lang =>
      selectedLanguageIds.has(String(lang.language_id)),
    );
  }, [availableLanguages, languageVoices]);

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

  const buildScenarioContext = useCallback(
    (languageId: string, languageCode: string, languageName: string) => {
      const formValues = formMethods.getValues();
      return {
        title: formValues.title,
        name: formValues.name,
        age: formValues.age,
        gender: formValues.gender,
        genderIdentity: formValues.genderIdentity,
        sexualOrientation: formValues.sexualOrientation,
        profession: formValues.profession,
        currentLocation: formValues.currentLocation,
        competency: formValues.competency?.name,
        characterProfileText: formValues.characterProfileText,
        challengeDescription: formValues.description,
        languageId,
        languageCode,
        languageName,
      };
    },
    [formMethods],
  );

  const handleRegenerateAll = useCallback(async () => {
    if (languagesToShow.length === 0) return;
    setRegeneratingAll(true);
    const languages = languagesToShow as LanguageOption[];
    const results = await Promise.allSettled(
      languages.map(lang => {
        const languageId = String(lang.language_id);
        const scenarioContext = buildScenarioContext(
          languageId,
          lang.value ?? "",
          lang.label ?? "",
        );
        return regenerateField({
          fieldName: "linguisticStyleSamples",
          scenarioContext,
          model: selectedModel,
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
    }
    setRegeneratingAll(false);
  }, [
    buildScenarioContext,
    id,
    linguisticStyleSamples,
    languagesToShow,
    regenerateField,
    selectedModel,
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
    <div className="w-full flex flex-col gap-4" data-testid="linguistic-style-samples">
      <div className="flex justify-between items-center py-2 w-full gap-4 flex-wrap">
        <span className="font-regular text-base text-typography-900">
          {label}
          {isMandatory && <span className="text-destructive-500"> *</span>}
        </span>
        <div className="flex items-center gap-2">
          <AutofillModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={regeneratingAll}
          />
          <button
            type="button"
            onClick={handleRegenerateAll}
            disabled={regeneratingAll}
            className="inline-flex items-center gap-1 text-sm border rounded-2xl px-3 py-1.5 cursor-pointer transition-opacity border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regeneratingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
                {en.simulation.generating} all...
              </>
            ) : (
              <>
                <WandStars />
                Generate all
              </>
            )}
          </button>
        </div>
      </div>
      <div className="border border-border-light rounded-md overflow-hidden bg-white">
        <div className="flex border-b border-border-light overflow-x-auto">
          {(languagesToShow as LanguageOption[]).map(lang => {
            const languageId = String(lang.language_id);
            const isActive = activeLanguageId === languageId;
            return (
              <button
                key={languageId}
                type="button"
                onClick={() => setSelectedLanguageId(languageId)}
                className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-500 border-b-2 border-primary-500 bg-primary-50/30"
                    : "text-typography-600 hover:text-typography-800 hover:bg-gray-50"
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
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
                  className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-800"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
