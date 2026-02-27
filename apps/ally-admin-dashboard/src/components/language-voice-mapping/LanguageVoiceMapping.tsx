import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useGetAvailableLanguageVoicesQuery, useLazyGetPreviewVoiceQuery } from "@api";
import { DropdownField } from "@components";
import { en } from "@constants";
import { BlackTick, PauseIcon, PlayIcon } from "@src/assets";

interface VoiceOption {
  id: string;
  name: string;
  provider?: string;
  config?: {
    voiceProvider?: string;
    languageCode?: string;
    voiceId?: string;
    voice_name?: string;
    model?: string;
    speaker?: string;
    name?: string;
    gender?: string;
    instantMode?: boolean;
  };
  text?: string;
  language_code?: string;
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
  const [getPreviewVoice] = useLazyGetPreviewVoiceQuery();
  const { data: availableLanguages = [], isLoading: isLoadingAvailableLanguages } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as {
      data: LanguageOption[];
      isLoading: boolean;
    };

  const {
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = formMethods;

  // Watch the form value to get real-time updates when selection changes
  const languageVoices = watch(id) ?? {};
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [voicePreviewCache, setVoicePreviewCache] = useState<Record<string, ArrayBuffer>>({});
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const languages: LanguageOption[] = availableLanguages ?? [];

  const [showAll, setShowAll] = useState(false);

  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    // Stop the currently playing audio if any
    if (audioSourceRef.current) {
      // Remove onended handler to prevent it from setting playingVoice to null
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }

    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(audioData.slice(0));
    const source = audioContext.createBufferSource();
    source.buffer = decoded;
    source.connect(audioContext.destination);
    source.onended = () => {
      setPlayingVoice(null);
      audioSourceRef.current = null;
    };
    source.start();
    audioSourceRef.current = source;
    setIsAudioLoading(false);
  }, []);
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
        provider: voice.provider,
        config: voice.config,
        text: voice.text,
      }));
    },
    [languages],
  );
  const renderDropdownFields = useCallback(() => {
    return visibleLanguages.map(language => {
      const languageId = String(language.language_id);
      const options = getOptionsForLanguage(languageId);
      const selectedVoiceId = languageVoices?.[languageId] ?? "";

      const handlePlay = async (voiceId: string) => {
        // Stop the currently playing audio immediately
        if (audioSourceRef.current) {
          audioSourceRef.current.onended = null;
          audioSourceRef.current.stop();
          audioSourceRef.current = null;
        }

        setPlayingVoice(voiceId);

        // Check if we have cached data for this voiceId
        const cachedAudio = voicePreviewCache[voiceId];
        if (cachedAudio) {
          playAudio(cachedAudio);
          return;
        }

        // If not cached, fetch from API
        setIsAudioLoading(true);
        const voice = options.find(opt => opt.value === voiceId);
        const voiceConfig = { ...voice?.config };
        delete voiceConfig.languageCode;

        try {
          const result = await getPreviewVoice({ voiceId }).unwrap();

          // Cache the result and play
          setVoicePreviewCache(prev => ({
            ...prev,
            [voiceId]: result,
          }));
          playAudio(result);
        } catch {
          setIsAudioLoading(false);
          setPlayingVoice(null);
          toast.error("Failed to load voice preview");
        }
      };

      const handlePause = () => {
        setPlayingVoice(null);
      };

      const renderOption = (
        option: { value: string; label: string },
        onSelect: (value: string) => void,
      ) => {
        const isCurrentVoice = playingVoice === option.value;
        const isLoading = isCurrentVoice && isAudioLoading;
        const isPlaying = isCurrentVoice && !isAudioLoading;

        return (
          <div
            key={option.value}
            className="px-3 w-full py-2 text-sm cursor-pointer flex justify-between transition-colors"
            onClick={() => onSelect(option.value)}
          >
            <span>{option.label}</span>
            <div className="relative w-1/2 h-6 flex items-center justify-end gap-2">
              {selectedVoiceId === option.value && <BlackTick className="min-w-6 h-6 " />}
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-gray-300 border-t-typography-800 rounded-full animate-spin" />
              ) : isPlaying ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePause();
                  }}
                >
                  <PauseIcon className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePlay(option.value);
                  }}
                >
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
              allowDeselect={true}
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
    isAudioLoading,
    getPreviewVoice,
    voicePreviewCache,
    playAudio,
  ]);

  // Create a stable string representation of languageVoices for dependency tracking
  const languageVoicesString = useMemo(() => {
    return JSON.stringify(languageVoices || {});
  }, [languageVoices]);

  // Use a ref to track previous validation state to prevent infinite loops
  const prevHasMappingsRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (languages.length === 0) {
      clearErrors(id);
      prevHasMappingsRef.current = null;
      return;
    }

    const currentVoices = JSON.parse(languageVoicesString);
    const hasMappings = Object.values(currentVoices).some(v => !!v);

    // Only update errors if the validation state has actually changed
    if (prevHasMappingsRef.current !== hasMappings) {
      if (!hasMappings) {
        setError(id, {
          type: "required",
          message: en.simulation.atLeastOneLanguageMustHaveVoiceSelected,
        });
      } else {
        clearErrors(id);
      }
      prevHasMappingsRef.current = hasMappings;
    }
  }, [languages.length, languageVoicesString, id]);

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
