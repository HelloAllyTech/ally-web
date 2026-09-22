import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import {
  useGetAvailableLanguageVoicesQuery,
  useGetSttConfigsQuery,
  useLazyGetPreviewVoiceQuery,
} from "@api";
import { NotionTable, cellTypes } from "@components";
import { buildConfigPickerOptions, en } from "@constants";
import { buildGroupedVoiceOptions } from "@constants/voiceProviders";
import { resolveAutoCast } from "@utils/voiceAutoSelect";
import type { AutoSelectedVoice } from "@utils/voiceAutoSelect";

interface VoiceOption {
  id: string;
  name: string;
  provider?: string;
  /**
   * Populated by ally-be from `config->>'gender'`. Older backends don't send
   * it, in which case voices fall into an "Unspecified gender" group rather
   * than disappearing.
   */
  gender?: string | null;
  age?: string | null;
  config?: Record<string, unknown>;
  text?: string;
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

const COLUMNS = [
  {
    id: "language",
    label: "Language",
    accessor: "language",
    dataType: cellTypes.normalText,
    minWidth: 180,
    width: 220,
  },
  {
    id: "voice",
    label: "Voice",
    accessor: "voice",
    dataType: cellTypes.voiceDropdown,
    minWidth: 280,
    width: 400,
  },
  {
    // Speech in, next to speech out. Options are filled in at render time from
    // the STT registry; an empty value means "use this language's default",
    // which is what almost every row should stay on.
    id: "stt",
    label: "Speech Recognition",
    accessor: "stt",
    dataType: cellTypes.dropdown,
    options: [] as { value: string; label: string }[],
    minWidth: 220,
    width: 280,
  },
  {
    id: "label",
    label: "Label",
    accessor: "label",
    dataType: cellTypes.editableText,
    minWidth: 200,
    width: 300,
    placeholder: "Add label…",
  },
];

/** Shown when a simulation hasn't overridden a language's STT. */
const STT_INHERIT_LABEL = "Use language default";

export const LanguageVoiceMapping: FC<LanguageVoiceMappingProps> = ({
  id = "languageVoices",
  label = "Language to Voice Mapping",
  formMethods,
  isMandatory,
}) => {
  const [getPreviewVoice] = useLazyGetPreviewVoiceQuery();
  const { data: availableLanguages = [], isLoading: isLoadingAvailableLanguages } =
    useGetAvailableLanguageVoicesQuery({ active: true, voicesNeeded: true }) as {
      data: LanguageOption[];
      isLoading: boolean;
    };

  const {
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors },
  } = formMethods;

  const languageVoices = watch(id) ?? {};
  const languageCharacteristics =
    (watch("languageCharacteristics") as Record<string, string> | undefined) ?? {};
  const sttConfigByLanguage =
    (watch("sttConfigByLanguage") as Record<string, string> | undefined) ?? {};

  // activeOnly: a retired config stays resolvable for whatever already points
  // at it, but must not be offered as a new choice.
  const { data: sttConfigs = [] } = useGetSttConfigsQuery({ activeOnly: true });

  /**
   * The voices this component cast, keyed by language.
   *
   * Kept so a later pass can tell its own picks apart from a real choice — an
   * author's, a character's, the copilot's, or one loaded from a saved
   * simulation — and only ever revisit its own.
   */
  const autoPickedRef = useRef<Record<string, string>>({});
  /**
   * Languages whose voice the author cleared. Clearing a row is how a language
   * is removed from a simulation, so re-casting it would make the control
   * impossible to use.
   */
  const dismissedRef = useRef<Set<string>>(new Set());
  const [autoPicks, setAutoPicks] = useState<AutoSelectedVoice[]>([]);

  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [voicePreviewCache, setVoicePreviewCache] = useState<Record<string, ArrayBuffer>>({});
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
  }, []);

  const playAudio = useCallback(
    async (audioData: ArrayBuffer) => {
      stopAudio();
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
    },
    [stopAudio],
  );

  const handlePlay = useCallback(
    async (voiceId: string) => {
      stopAudio();
      setPlayingVoice(voiceId);

      const cached = voicePreviewCache[voiceId];
      if (cached) {
        playAudio(cached);
        return;
      }

      setIsAudioLoading(true);
      try {
        const result = await getPreviewVoice({ voiceId }).unwrap();
        setVoicePreviewCache(prev => ({ ...prev, [voiceId]: result }));
        playAudio(result);
      } catch {
        setIsAudioLoading(false);
        setPlayingVoice(null);
        toast.error("Failed to load voice preview");
      }
    },
    [stopAudio, voicePreviewCache, getPreviewVoice, playAudio],
  );

  const handlePause = useCallback(() => {
    stopAudio();
    setPlayingVoice(null);
  }, [stopAudio]);

  const languages: LanguageOption[] = availableLanguages ?? [];

  /**
   * Voices grouped as "Provider · Gender", which is the order people actually
   * choose in: pick the vendor you trust for this language, then the gender the
   * persona needs. A flat alphabetical list of every voice across every
   * provider gave no way to narrow either axis.
   *
   * Once the persona has a gender, its voices sort to the top — then the ones
   * with no recorded gender, then the rest. Ordering rather than filtering,
   * because voicing a persona against its gender is a legitimate choice and a
   * voice nobody recorded a gender for is still usable; hiding either would
   * take that decision away.
   */
  const personaGender = watch("gender") as string | undefined;
  // Stored as a number against a voice's band, so buildGroupedVoiceOptions
  // translates one into the other before comparing.
  const personaAge = watch("age") as string | number | undefined;

  const getVoiceOptions = useCallback(
    (language: LanguageOption) =>
      buildGroupedVoiceOptions(language.voices, personaGender, personaAge),
    [personaGender, personaAge],
  );

  const sttOptions = useMemo(
    () => buildConfigPickerOptions(sttConfigs, STT_INHERIT_LABEL),
    [sttConfigs],
  );

  const tableData = useMemo(() => {
    const columns = COLUMNS.map(column =>
      column.id === "stt" ? { ...column, options: sttOptions } : column,
    );

    const data = languages.map(language => {
      const languageId = String(language.language_id);
      const selectedVoiceId = languageVoices?.[languageId] ?? "";
      const voiceOptions = getVoiceOptions(language);
      // When a voice is already selected, offer a way to clear it and thereby
      // disable (remove) the language from the simulation. The sentinel empty
      // value is handled in handleRowChange by deleting the mapping key.
      const voiceOptionsWithClear = selectedVoiceId
        ? [{ value: "", label: en.simulation.removeVoiceDisableLanguage }, ...voiceOptions]
        : voiceOptions;

      return {
        language: { value: language.label, disabled: true, rowId: languageId },
        voice: {
          value: selectedVoiceId,
          options: voiceOptionsWithClear,
          playingVoiceId: playingVoice,
          isAudioLoading,
          onPlay: handlePlay,
          onPause: handlePause,
          disabled: false,
          rowId: languageId,
        },
        stt: {
          options: sttOptions,
          // A config that has since been deactivated is no longer in the
          // options list; showing "" would read as "using the default" when the
          // session is in fact still resolving the retired config. Keep the
          // stored value visible instead.
          value: sttConfigByLanguage[languageId] ?? "",
          disabled: false,
          rowId: languageId,
        },
        label: {
          value: languageCharacteristics[languageId] ?? "",
          disabled: false,
          rowId: languageId,
        },
      };
    });

    return { columns, data };
  }, [
    languages,
    languageVoices,
    languageCharacteristics,
    sttConfigByLanguage,
    sttOptions,
    playingVoice,
    isAudioLoading,
    getVoiceOptions,
    handlePlay,
    handlePause,
  ]);

  const handleRowChange = useCallback(
    (action: any) => {
      const { columnId, value, rowId } = action;
      if (!rowId || !columnId) return;

      if (columnId === "voice") {
        const nextLanguageVoices = { ...languageVoices };
        if (value) {
          nextLanguageVoices[rowId] = value;
        } else {
          // Empty value = "Remove voice"; drop the mapping so the language is
          // no longer enabled for this simulation.
          delete nextLanguageVoices[rowId];
          dismissedRef.current.add(rowId);
        }
        setValue(id, nextLanguageVoices, { shouldDirty: true });
      } else if (columnId === "stt") {
        const nextSttConfigByLanguage = { ...sttConfigByLanguage };
        if (value) {
          nextSttConfigByLanguage[rowId] = value;
        } else {
          // Drop the key rather than storing "" so the saved metadata says
          // "this language was never overridden", not "overridden to nothing".
          delete nextSttConfigByLanguage[rowId];
        }
        setValue("sttConfigByLanguage", nextSttConfigByLanguage, { shouldDirty: true });
      } else if (columnId === "label") {
        setValue(
          "languageCharacteristics",
          { ...languageCharacteristics, [rowId]: value },
          { shouldDirty: true },
        );
      }
    },
    [id, languageVoices, languageCharacteristics, sttConfigByLanguage, setValue],
  );

  const languageVoicesString = useMemo(
    () => JSON.stringify(languageVoices || {}),
    [languageVoices],
  );

  /**
   * Cast a voice for every language, from what the simulation already says.
   *
   * A language with no entry here is not offered to the learner and publish is
   * blocked until at least one has a voice, so an empty table is never the
   * intended end state — it is just work the author has to do by hand, out of
   * inputs the form already holds. The persona's gender and age are on screen a
   * step earlier and every catalog voice carries the same two fields, so the
   * cast is made from those and the author overrides whatever they disagree
   * with. Re-cast whenever the persona changes, so editing the age or gender
   * moves the voices with it.
   *
   * Only ever runs while every mapping present is one of this component's own.
   * The moment anything else is in there — a voice loaded from a saved
   * simulation, one merged in from a character, the copilot's cast, or a pick
   * the author made — that map is a deliberate configuration, and a language
   * missing from it is missing on purpose. Filling those gaps would quietly
   * enable languages for learners that somebody had decided against, which is
   * not a thing an author would find out about until a session ran.
   */
  useEffect(() => {
    const cast = resolveAutoCast({
      languages,
      current: JSON.parse(languageVoicesString) as Record<string, string>,
      alreadyCast: autoPickedRef.current,
      dismissed: dismissedRef.current,
      persona: { gender: personaGender, age: personaAge },
    });
    if (!cast) return;

    autoPickedRef.current = cast.next;
    setAutoPicks(cast.picks);
    setValue(id, cast.next, { shouldDirty: true });
  }, [languages, personaGender, personaAge, languageVoicesString, id, setValue]);

  /**
   * Languages the cast could not voice as the persona — the language has no
   * voice of that gender at all. Worth saying out loud: a female client
   * answering in a male voice is the kind of thing nobody notices until they
   * listen back to a call.
   */
  const genderMismatches = useMemo(
    () =>
      autoPicks.filter(
        // Checked against what the form actually holds, so the warning goes
        // away once the author picks something else for that language.
        pick => !pick.genderMatched && languageVoices?.[pick.languageId] === pick.voiceId,
      ),
    [autoPicks, languageVoices],
  );
  const prevHasMappingsRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (languages.length === 0) {
      clearErrors(id);
      prevHasMappingsRef.current = null;
      return;
    }
    const currentVoices = JSON.parse(languageVoicesString);
    const hasMappings = Object.values(currentVoices).some(v => !!v);
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

  if (!isLoadingAvailableLanguages && languages.length === 0) return null;

  if (isLoadingAvailableLanguages) {
    return (
      <div className="flex flex-col gap-3">
        <label className="text-typography-900 text-base flex items-center gap-1">
          {label}
          {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        <div className="animate-pulse border border-border-light rounded-md h-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="language-voice-mapping">
      <label className="text-typography-900 text-base flex items-center gap-1">
        {label}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>
      {errors?.[id]?.message && (
        <p className="text-destructive-500 text-sm">{errors[id].message}</p>
      )}
      {autoPicks.length > 0 && (
        <p className="text-typography-600 text-sm">
          {en.simulation.voicesAutoSelected}
          {genderMismatches.length > 0 && (
            <>
              {" "}
              <span className="text-warning-500">
                {en.simulation.noVoiceMatchingPersonaGender.replace(
                  "{languages}",
                  genderMismatches.map(pick => pick.languageLabel).join(", "),
                )}
              </span>
            </>
          )}
        </p>
      )}
      <NotionTable
        tableData={tableData}
        onRowChange={handleRowChange}
        autoHeight
        hideSelectionColumn
        hasResizer={false}
        fillWidth
      />
    </div>
  );
};
