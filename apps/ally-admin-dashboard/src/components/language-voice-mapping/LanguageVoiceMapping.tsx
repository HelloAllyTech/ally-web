import { FC, useEffect, useMemo, useState } from "react";

import { useGetAvailableLanguageVoicesQuery } from "@api";
import { DropdownField } from "@components";
import { en } from "@constants";
import { isObject } from "@utils";

interface VoiceOption {
  id: string;
  name: string;
}

interface LanguageOption {
  language_id: number;
  value: string;
  label: string;
  voices: VoiceOption[];
}

interface LanguageVoiceMappingProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
}

export const LanguageVoiceMapping: FC<LanguageVoiceMappingProps> = ({
  id = "languageVoices",
  label = "Language to Voice Mapping",
  formMethods,
  isMandatory,
}) => {
  const { data: availableLanguages = [] } = useGetAvailableLanguageVoicesQuery({ active: true });
  const {
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = formMethods;

  const [languageVoices] = useState<Record<string, string>>(() => {
    const value = getValues?.(id);
    if (isObject(value)) {
      // Filter out any empty values from the initial state
      return Object.fromEntries(
        Object.entries(value as Record<string, string>).filter(([v]) => !!v), // Only keep non-empty values
      );
    }
    return {};
  });

  const languages = useMemo<LanguageOption[]>(() => {
    if (availableLanguages && availableLanguages.length > 0) {
      return availableLanguages.map((lang: any) => ({
        language_id: lang.language_id,
        value: lang.value,
        label: lang.label,
        voices: lang.voices.map(voice => ({
          id: voice.id,
          name: voice.name,
        })),
      }));
    }
    return [];
  }, [availableLanguages]);

  const [showAll, setShowAll] = useState(false);

  const visibleLanguages = useMemo(() => {
    if (showAll) return languages;
    return languages.slice(0, 5);
  }, [languages, showAll]);

  const getOptionsForLanguage = (languageId: string) => {
    const language = languages.find(lang => String(lang.language_id) === languageId);
    if (!language) return [];

    return language.voices.map(voice => ({
      value: voice.id,
      label: voice.name,
    }));
  };

  useEffect(() => {
    if (languages.length === 0) {
      clearErrors(id);
      return;
    }

    const hasMappings = Object.values(languageVoices || {}).some(v => !!v);

    if (!hasMappings) {
      setError(id, {
        type: "required",
        message: "At least one language must have a voice selected",
      });
    } else {
      clearErrors(id);
    }
  }, [languages.length, languageVoices, id, setError, clearErrors]);

  if (languages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="language-voice-mapping">
      <label className="text-typography-900 cursor-pointer flex items-center gap-1">
        {label}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>
      {errors?.[id]?.message && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id].message}</p>
      )}
      <div className="flex flex-col gap-3">
        {visibleLanguages.map(language => {
          const languageId = String(language.language_id);
          const options = getOptionsForLanguage(languageId);
          const selectedVoiceId = languageVoices?.[languageId] ?? "";

          return (
            <div
              key={languageId}
              className="flex flex-row items-center gap-4 border border-border-light rounded-md px-3 py-2 bg-white"
            >
              <div className="w-1/3 text-sm text-typography-800 font-medium">{language.label}</div>
              <div className="w-2/3">
                {/* <select
                  className="w-full rounded border border-border-light px-3 py-1 bg-white text-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedVoiceId}
                  onChange={e => handleVoiceChange(languageId, e.target.value)}
                >
                  <option value="">{en.simulation.selectVoice}</option>
                  {options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select> */}

                <DropdownField
                  id={`${id}.${languageId}`}
                  label=""
                  formMethods={formMethods}
                  options={options}
                  defaultOption={
                    selectedVoiceId
                      ? options.find(opt => opt.value === selectedVoiceId)?.label
                      : en.simulation.selectVoice
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
      {languages.length > visibleLanguages.length && (
        <button
          type="button"
          className="self-start text-sm text-primary-500 hover:text-primary-600 mt-1"
          onClick={() => setShowAll(true)}
        >
          Show all ({languages.length})
        </button>
      )}
      {showAll && languages.length > 5 && (
        <button
          type="button"
          className="self-start text-sm text-primary-500 hover:text-primary-600 mt-1"
          onClick={() => setShowAll(false)}
        >
          Show less
        </button>
      )}
    </div>
  );
};
