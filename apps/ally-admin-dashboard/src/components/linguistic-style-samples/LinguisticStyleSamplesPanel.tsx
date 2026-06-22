import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { ENHANCE_TYPE } from "@constants";

import { EnhanceButton } from "../enhance-button";
import { LanguageTabPanel } from "../language-tab-panel";
import { SAMPLE_COUNT, type LanguageOption } from "./scenarioLanguageUtils";
import { useScenarioLanguagesToShow } from "./useScenarioLanguagesToShow";

interface LinguisticStyleSamplesPanelProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
}

export const LinguisticStyleSamplesPanel: FC<LinguisticStyleSamplesPanelProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  isMandatory = false,
}) => {
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

  // Enhance treats the active language's non-empty samples as a newline-joined
  // blob; the improved text is split back into the fixed sample slots.
  const activeSamples: string[] = activeLanguageId
    ? (linguisticStyleSamples[activeLanguageId] ?? [])
    : [];
  const enhanceCurrentValue = activeSamples.filter(s => s?.trim()).join("\n");
  const handleEnhanceApply = useCallback(
    (improved: string) => {
      if (!activeLanguageId) return;
      const lines = improved
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, SAMPLE_COUNT);
      const padded = Array.from({ length: SAMPLE_COUNT }, (_, i) => lines[i] ?? "");
      setValue(id, { ...linguisticStyleSamples, [activeLanguageId]: padded });
    },
    [activeLanguageId, id, linguisticStyleSamples, setValue],
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
        {activeLanguageId && (
          <EnhanceButton
            enhanceType={ENHANCE_TYPE.LINGUISTIC_STYLE_SAMPLES}
            label={label}
            currentValue={enhanceCurrentValue}
            onApply={handleEnhanceApply}
          />
        )}
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
