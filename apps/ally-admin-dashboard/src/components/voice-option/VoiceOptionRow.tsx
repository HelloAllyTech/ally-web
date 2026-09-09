import { ReactNode } from "react";

import { PauseIcon, PlayIcon } from "@assets";

/**
 * One voice in a picker, with the control that auditions it.
 *
 * A trainer choosing a voice cannot tell Anushka from Priya by name, so the
 * list has to be playable in place — the choice is made by ear, before
 * committing, not after ("Sample strategies before committing to one").
 *
 * Extracted from the renderer that was inlined in notion-table/Cell.tsx so the
 * character side panel gets the same affordance rather than a second version of
 * it. Both `DropdownField.optionsRenderer` and `TextDropdown.optionRenderer`
 * take `(option, onSelect) => ReactNode`, so `createVoiceOptionRenderer` fits
 * either without adapting.
 */

export interface VoiceOptionRowProps {
  option: { value: string; label: string };
  onSelect: (value: string) => void;
  isSelected: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: (voiceId: string) => void;
  onPause: () => void;
}

export const VoiceOptionRow = ({
  option,
  onSelect,
  isSelected,
  isPlaying,
  isLoading,
  onPlay,
  onPause,
}: VoiceOptionRowProps) => {
  // An empty value is the "clear / remove voice" action, not a voice — there is
  // nothing to audition.
  const isClearOption = !option.value;

  return (
    <div
      className={`px-3 py-2 text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary-50 text-primary font-medium"
          : "text-typography-900 hover:bg-background-secondary"
      }`}
      onClick={() => onSelect(option.value)}
    >
      <span className="truncate">{option.label}</span>
      {!isClearOption && (
        // Auditioning must not also pick: a trainer listening through five
        // voices would otherwise select each one on the way past.
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isLoading ? (
            <div
              className="w-5 h-5 border-2 border-gray-300 border-t-typography-800 rounded-full animate-spin"
              aria-label="Loading preview"
            />
          ) : isPlaying ? (
            <button type="button" onClick={onPause} aria-label={`Stop ${option.label}`}>
              <PauseIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPlay(option.value)}
              aria-label={`Play ${option.label}`}
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export interface VoiceOptionRendererArgs {
  /** Currently playing or loading voice, from useVoicePreview. */
  playingVoiceId: string | null;
  isLoading: boolean;
  /** The value the field currently holds, so the row can show as selected. */
  selectedValue?: string;
  onPlay: (voiceId: string) => void;
  onPause: () => void;
}

/** Build an option renderer for DropdownField / TextDropdown. */
export const createVoiceOptionRenderer =
  ({ playingVoiceId, isLoading, selectedValue, onPlay, onPause }: VoiceOptionRendererArgs) =>
  (option: { value: string; label: string }, onSelect: (value: string) => void): ReactNode => {
    const isCurrent = playingVoiceId === option.value;
    return (
      <VoiceOptionRow
        key={option.value}
        option={option}
        onSelect={onSelect}
        isSelected={(selectedValue ?? "") === option.value}
        isPlaying={isCurrent && !isLoading}
        isLoading={isCurrent && isLoading}
        onPlay={onPlay}
        onPause={onPause}
      />
    );
  };
