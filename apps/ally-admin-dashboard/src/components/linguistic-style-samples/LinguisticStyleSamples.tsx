import { FC, useCallback, useMemo, useState } from "react";

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
  languageVoicesId?: string;
}

const SAMPLE_COUNT = 10;

export const LinguisticStyleSamples: FC<LinguisticStyleSamplesProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  languageVoicesId = "languageVoices",
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const [regeneratingLanguageId, setRegeneratingLanguageId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  const { data: availableLanguages = [], isLoading } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[]; isLoading: boolean };

  const { watch, setValue } = formMethods;
  const languageVoices = watch(languageVoicesId) ?? {};
  const linguisticStyleSamples = watch(id) ?? {};

  const languagesWithVoices = useMemo(() => {
    const languages = (availableLanguages ?? []) as LanguageOption[];
    return languages.filter(lang => languageVoices[String(lang.language_id)]);
  }, [availableLanguages, languageVoices]);

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

  const handleRegenerate = useCallback(
    async (languageId: string, languageCode: string, languageName: string) => {
      setRegeneratingLanguageId(languageId);
      try {
        const scenarioContext = buildScenarioContext(languageId, languageCode, languageName);
        const response = await regenerateField({
          fieldName: "linguisticStyleSamples",
          scenarioContext,
          model: selectedModel,
        }).unwrap();

        const content = response?.content;
        if (isNonEmptyArray(content)) {
          setValue(id, {
            ...linguisticStyleSamples,
            [languageId]: content,
          });
        } else {
          toast.error(`${en.errors.failedToRegenerate} ${label}`);
        }
      } catch {
        toast.error(`${en.errors.failedToRegenerate} ${label}`);
      } finally {
        setRegeneratingLanguageId(null);
      }
    },
    [
      buildScenarioContext,
      id,
      label,
      linguisticStyleSamples,
      regenerateField,
      selectedModel,
      setValue,
    ],
  );

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

  if (isLoading || languagesWithVoices.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4" data-testid="linguistic-style-samples">
      <label className="text-typography-900 cursor-pointer text-base font-medium">{label}</label>
      <p className="text-typography-600 text-sm">
        Sample utterances showing how the agent would talk in each language. 10 samples per
        language.
      </p>
      {languagesWithVoices.map(lang => {
        const languageId = String(lang.language_id);
        const samples: string[] =
          linguisticStyleSamples[languageId] ?? Array(SAMPLE_COUNT).fill("");

        return (
          <div
            key={languageId}
            className="border border-border-light rounded-md p-4 bg-white flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-typography-800 font-medium">{lang.label}</span>
              <div className="flex items-center gap-2">
                <AutofillModelSelect
                  value={selectedModel}
                  onChange={setSelectedModel}
                  disabled={regeneratingLanguageId === languageId}
                />
                <button
                  type="button"
                  onClick={() => handleRegenerate(languageId, lang.value ?? "", lang.label ?? "")}
                  disabled={regeneratingLanguageId === languageId}
                  className={`inline-flex items-center gap-1 text-sm border rounded-2xl px-2 py-1 cursor-pointer transition-opacity ${
                    regeneratingLanguageId === languageId
                      ? "text-primary-300 border-primary-300 cursor-not-allowed"
                      : "text-primary-500 border-primary-500 hover:bg-primary-50"
                  }`}
                >
                  {regeneratingLanguageId === languageId ? (
                    <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <WandStars />
                  )}{" "}
                  {regeneratingLanguageId === languageId
                    ? en.simulation.generating
                    : en.simulation.regenerate}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: SAMPLE_COUNT }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  value={samples[i] ?? ""}
                  onChange={e => handleSampleChange(languageId, i, e.target.value)}
                  placeholder={`Sample ${i + 1}`}
                  className="w-full px-3 py-2 border border-border-light rounded text-sm text-typography-800"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
