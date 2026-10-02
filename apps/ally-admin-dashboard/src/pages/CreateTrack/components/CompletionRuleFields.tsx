import { FC, useState } from "react";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Modal, Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetCompletedLearnersCountQuery, useGetCriteriaHistoryQuery } from "@api/track";
import { TooltipIcon } from "@assets";
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
 * type supports; quiz and annotation pass-scores live in their own settings
 * blocks (mirrored server-side) so they are intentionally absent here, and a
 * game has no completion rule at all — it completes the moment it is opened.
 */
export const CompletionRuleFields: FC<CompletionRuleFieldsProps> = ({
  sectionIndex,
  itemIndex,
  type,
  disabled = false,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;
  const itemId = useWatch({ control, name: `${base}.serverId` });

  const { data: completedCountData } = useGetCompletedLearnersCountQuery(itemId, { skip: !itemId });
  const { data: criteriaHistoryData } = useGetCriteriaHistoryQuery(itemId, { skip: !itemId });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const toNumberOrUndefined = (raw: string): number | undefined => {
    if (raw === "") return undefined;
    const value = Number(raw);
    return Number.isNaN(value) ? undefined : value;
  };

  if (
    type === TrackItemType.CASE ||
    type === TrackItemType.QUIZ ||
    type === TrackItemType.ANNOTATED_ARTIFACT ||
    type === TrackItemType.GAME
  ) {
    return null;
  }

  const completedLearnersCount = completedCountData?.count ?? 0;

  return (
    <div className="border-t border-border-light pt-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-typography-900">Completion rule</p>
        {criteriaHistoryData && criteriaHistoryData.length > 0 && (
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            View History
          </button>
        )}
      </div>

      {completedLearnersCount > 0 && (
        <p className="text-xs text-typography-500 mb-3">
          {completedLearnersCount} learners have completed this item and will not be affected by
          these changes.
        </p>
      )}

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
          <span className="inline-flex items-center gap-1">
            <label className={fieldLabel}>
              Watch percentage ({MIN_VIDEO_WATCH_PCT}–{MAX_VIDEO_WATCH_PCT}%)
            </label>
            <Tooltip
              label="Percentage of the video a learner must watch before this item counts as complete."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>
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
      <Modal
        title="Completion Criteria History"
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          {criteriaHistoryData?.map((entry, index) => (
            <div key={index} className="text-sm">
              <p>
                Changed by: {entry.updatedBy?.name ?? "Unknown"} on{" "}
                {new Date(entry.updatedAt).toLocaleString()}
              </p>
              <p>From: {JSON.stringify(entry.oldValue)}</p>
              <p>To: {JSON.stringify(entry.newValue)}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
