import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { DEFAULT_VIDEO_WATCH_PCT, MAX_VIDEO_WATCH_PCT, MIN_VIDEO_WATCH_PCT } from "@constants";
import { TrackFormValues, TrackItemType } from "@types";

interface CompletionRuleFieldsProps {
  sectionIndex: number;
  itemIndex: number;
  type: TrackItemType;
  disabled?: boolean;
}

const fieldLabel = "text-xs font-medium text-typography-700";
const numberInput =
  "w-24 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400 disabled:opacity-60";

/**
 * Per-item completion criteria editor. Renders only the fields the given item
 * type supports; quiz pass-score lives in the quiz settings (mirrored server-side)
 * so it is intentionally absent here.
 */
export const CompletionRuleFields: FC<CompletionRuleFieldsProps> = ({
  sectionIndex,
  itemIndex,
  type,
  disabled = false,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}.completionCriteria` as const;

  const toNumberOrUndefined = (raw: string): number | undefined => {
    if (raw === "") return undefined;
    const value = Number(raw);
    return Number.isNaN(value) ? undefined : value;
  };

  if (type === TrackItemType.CASE || type === TrackItemType.QUIZ) {
    return null;
  }

  return (
    <div className="border-t border-border-light pt-4 mt-4">
      <p className="text-sm font-semibold text-typography-900 mb-3">Completion rule</p>

      {type === TrackItemType.ROLEPLAY && (
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Minimum score (0 or above, optional)</label>
          <Controller
            control={control}
            name={`${base}.minScore`}
            render={({ field }) => (
              <input
                type="number"
                min={0}
                disabled={disabled}
                className={numberInput}
                value={field.value ?? ""}
                onChange={event => field.onChange(toNumberOrUndefined(event.target.value))}
                onWheel={event => event.currentTarget.blur()}
              />
            )}
          />
          <span className="text-xs text-typography-500">
            Learner must reach this score to complete this roleplay. Leave blank to let any attempt
            unlock the next item, regardless of score.
          </span>
        </div>
      )}

      {type === TrackItemType.VIDEO && (
        <div className="flex flex-col gap-2">
          <label className={fieldLabel}>
            Watch percentage ({MIN_VIDEO_WATCH_PCT}–{MAX_VIDEO_WATCH_PCT}%)
          </label>
          <Controller
            control={control}
            name={`${base}.watchPct`}
            render={({ field }) => {
              const value = field.value ?? DEFAULT_VIDEO_WATCH_PCT;
              return (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={MIN_VIDEO_WATCH_PCT}
                    max={MAX_VIDEO_WATCH_PCT}
                    step={1}
                    disabled={disabled}
                    className="flex-1 accent-primary-500"
                    value={value}
                    onChange={event => field.onChange(Number(event.target.value))}
                  />
                  <span className="text-sm text-typography-800 w-12 text-right">{value}%</span>
                </div>
              );
            }}
          />
        </div>
      )}

      {type === TrackItemType.ARTICLE && (
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Minimum read time (seconds, optional)</label>
          <Controller
            control={control}
            name={`${base}.minReadSeconds`}
            render={({ field }) => (
              <input
                type="number"
                min={0}
                disabled={disabled}
                className={numberInput}
                value={field.value ?? ""}
                onChange={event => field.onChange(toNumberOrUndefined(event.target.value))}
                onWheel={event => event.currentTarget.blur()}
              />
            )}
          />
        </div>
      )}

      {type === TrackItemType.JOURNAL && (
        <span className="text-xs text-typography-500">
          Journals are complete once every required prompt has a response.
        </span>
      )}
    </div>
  );
};
