import { useMemo } from "react";

import { useGetScenarioVoicesQuery } from "@api";
import { VoiceOptionRow } from "@components/voice-option";
// Imported by module rather than through the `@hooks` barrel: the barrel pulls
// in hooks that reach `@store`, which reads `baseAPI.reducerPath` at module
// load — so any consumer's test that mocks `@api` fails to load the file.
import { useVoicePreview } from "@hooks/useVoicePreview";
import { CharacterInterviewQuestionOption } from "@types";

/**
 * The interview's voice question, rendered so it can actually be answered.
 *
 * Step 6 of the interviewer prompt calls `get_voices` and offers the 3-5
 * best-fitting voices, each with a `description` saying why it fits. Both
 * halves of that were being lost: the `dropdown` branch renders options through
 * a Carbon combobox that shows only `label`, so the agent's reasoning never
 * reached the screen, and nothing anywhere let the trainer hear a voice before
 * committing to it. A voice is chosen by ear — "Anushka" and "Priya" are not
 * distinguishable as words ("Sample strategies before committing to one").
 *
 * So the shortlist renders as rows: name, the agent's reason, and a play
 * button. Selection is single, because a character carries one `voiceId`.
 */

interface VoiceQuestionOptionsProps {
  options: CharacterInterviewQuestionOption[];
  /** Selected option ids, as the card's shared working state holds them. */
  selected: string[];
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

/**
 * Whether a question's options are voices from the catalog.
 *
 * Checked against the catalog rather than trusting a naming convention or
 * adding a flag to the SSE contract: the interviewer prompt is file-backed and
 * may be dashboard-overridden in production, so a marker it was supposed to
 * emit could silently never arrive. Ids either resolve to real voices or they
 * do not.
 */
export const useIsVoiceQuestion = (options: CharacterInterviewQuestionOption[]): boolean => {
  const { data: voices } = useGetScenarioVoicesQuery({});
  return useMemo(() => {
    if (options.length === 0 || !voices?.length) return false;
    const voiceIds = new Set(voices.map(voice => voice.id).filter(Boolean));
    return options.every(option => voiceIds.has(option.id));
  }, [options, voices]);
};

export const VoiceQuestionOptions = ({
  options,
  selected,
  onSelect,
  disabled = false,
}: VoiceQuestionOptionsProps) => {
  // Mid-interview there is no character text yet — the style samples are
  // distilled into the draft at the end — so these audition on the backend's
  // per-language sample line. The character side panel, which has the samples,
  // passes the character's own words instead.
  const { playingVoiceId, isLoading, play, pause } = useVoicePreview();

  return (
    <div className="mt-3 flex flex-col rounded border border-border-light divide-y divide-border-light">
      {options.map(option => (
        <div key={option.id}>
          <VoiceOptionRow
            option={{ value: option.id, label: option.label }}
            onSelect={() => !disabled && onSelect(option.id)}
            isSelected={selected.includes(option.id)}
            isPlaying={playingVoiceId === option.id && !isLoading}
            isLoading={playingVoiceId === option.id && isLoading}
            onPlay={voiceId => void play(voiceId)}
            onPause={pause}
          />
          {option.description && (
            <p className="px-3 pb-2 -mt-1 text-xs text-typography-600">{option.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};
