import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { useGetAvailableLanguageVoicesQuery } from "@api";
import { DropdownField } from "@components";
import { en } from "@constants";
import { BlackTick, PauseIcon, PlayIcon } from "@src/assets";
import { isObject } from "@utils";

interface VoiceOption {
  id: string;
  name: string;
  provider?: string;
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

const SkeletonLoader = () => (
  <div className="flex flex-col gap-3 animate-pulse">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="flex flex-row items-center gap-4 rounded-md py-2 bg-white">
        <div className="w-1/3 h-10 bg-gray-200 rounded" />
        <div className="w-2/3 h-10 bg-gray-200 rounded" />
      </div>
    ))}
    <div className="w-1/6 h-10 bg-gray-200 rounded" />
  </div>
);

export const LanguageVoiceMapping: FC<LanguageVoiceMappingProps> = ({
  id = "languageVoices",
  label = "Language to Voice Mapping",
  formMethods,
  isMandatory,
}) => {
  const { data: availableLanguages = [], isLoading: isLoadingAvailableLanguages } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as {
      data: LanguageOption[];
      isLoading: boolean;
    };

  const {
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = formMethods;

  const audioRef = useRef<HTMLAudioElement>(null);
  const hasStartedPlayingRef = useRef(false);
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
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const languages: LanguageOption[] = availableLanguages ?? [];

  const [showAll, setShowAll] = useState(false);

  const visibleLanguages = useMemo(() => {
    if (showAll) return languages;
    return languages.slice(0, 5);
  }, [languages, showAll]);

  const getOptionsForLanguage = useCallback(
    (languageId: string) => {
      const language = languages.find(lang => String(lang.language_id) === languageId);
      if (!language) return [];

      return language.voices.map(voice => ({
        value: voice.id,
        label: voice.provider ? `${voice.name}  (${voice.provider})` : voice.name,
      }));
    },
    [languages],
  );
  const renderDropdownFields = useCallback(() => {
    return visibleLanguages.map(language => {
      const languageId = String(language.language_id);
      const options = getOptionsForLanguage(languageId);
      const selectedVoiceId = languageVoices?.[languageId] ?? "";

      const handlePlay = (voiceId: string) => {
        hasStartedPlayingRef.current = false;
        setIsAudioLoading(true);
        setPlayingVoice(voiceId);
        setAudioUrl(
          `http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3`,
        );
      };

      const handlePause = () => {
        hasStartedPlayingRef.current = false;
        setIsAudioLoading(false);
        setPlayingVoice(null);
        audioRef.current?.pause();
      };

      const handleAudioReady = () => {
        if (audioRef.current && !hasStartedPlayingRef.current) {
          hasStartedPlayingRef.current = true;
          setIsAudioLoading(false);
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
      };

      const renderOption = (option: { value: string; label: string }) => {
        const isCurrentVoice = playingVoice === option.value;
        const isLoading = isCurrentVoice && isAudioLoading;
        const isPlaying = isCurrentVoice && !isAudioLoading;

        return (
          <div
            key={option.value}
            className="px-3 w-full py-2 text-sm cursor-pointer flex justify-between transition-colors"
          >
            <span>{option.label}</span>
            <div className="relative w-1/2 h-6 flex items-center justify-end gap-2">
              {selectedVoiceId === option.value && <BlackTick className="min-w-6 h-6 " />}
              {isCurrentVoice && (
                <audio
                  className="absolute top-0 left-0 w-full h-full hidden"
                  ref={audioRef}
                  src={audioUrl}
                  onCanPlayThrough={handleAudioReady}
                  onEnded={() => {
                    hasStartedPlayingRef.current = false;
                    setIsAudioLoading(false);
                    setPlayingVoice(null);
                  }}
                />
              )}
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-gray-300 border-typography-800 rounded-full animate-spin" />
              ) : isPlaying ? (
                <button onClick={() => handlePause()}>
                  <PauseIcon className="w-6 h-6" />
                </button>
              ) : (
                <button onClick={() => handlePlay(option.value)}>
                  <PlayIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        );
      };

      return (
        <div
          key={languageId}
          className="flex flex-row items-center gap-4 border border-border-light rounded-md px-3 py-2 bg-white"
        >
          <div className="w-1/3 text-sm text-typography-800 font-medium">{language.label}</div>
          <div className="w-2/3">
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
              optionsRenderer={FEATURE_FLAGS_MAP.SIMULATION_VOICE_FLAG ? renderOption : undefined}
              onClose={() => handlePause()}
            />
          </div>
        </div>
      );
    });
  }, [
    formMethods,
    getOptionsForLanguage,
    id,
    languageVoices,
    visibleLanguages,
    playingVoice,
    audioUrl,
    isAudioLoading,
  ]);

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

  if (!isLoadingAvailableLanguages && languages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="language-voice-mapping">
      <label className="text-typography-900 cursor-pointer text-base flex items-center gap-1">
        {label}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>
      {errors?.[id]?.message && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id].message}</p>
      )}
      {isLoadingAvailableLanguages ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="flex flex-col gap-3">{renderDropdownFields()}</div>
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
        </>
      )}
    </div>
  );
};
