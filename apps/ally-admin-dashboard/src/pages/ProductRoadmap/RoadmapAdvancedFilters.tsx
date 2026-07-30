import React, { useState } from "react";

import { DatePicker, DatePickerInput, NumberInput } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapFacets, RoadmapUserRef } from "@types";

import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
} from "./utils/filters";

interface RoadmapAdvancedFiltersProps {
  values: RoadmapAdvancedFilterValues;
  onChange: (next: RoadmapAdvancedFilterValues) => void;
  facets?: RoadmapFacets;
}

/**
 * Creator, filed-date range, released-date range and priority-score range.
 *
 * WHY THESE ARE BEHIND A DISCLOSURE while Type/Stage/Goal/Owner sit inline: the standalone app put
 * all twelve filters in a second `<thead>` row, which forced a 1240px min-width plus horizontal
 * scroll and put absolute-positioned popovers inside a scroll container. Rendering twelve chip
 * groups inline instead just moves that problem into a wrapping row four lines deep. These four are
 * also genuinely less used — they answer "what did Shubham file in June" rather than "show me bugs".
 *
 * THE BADGE IS NOT DECORATION. A collapsed panel hiding an active filter is how someone concludes
 * the board is broken: rows are missing and nothing on screen explains why. The count is always
 * visible when collapsed, and "Clear" is reachable without expanding.
 *
 * Dates are plain YYYY-MM-DD strings, which is what the API's @IsISO8601 accepts and what
 * saved-view state already stores — so no format conversion sits between the two.
 */
export const RoadmapAdvancedFilters: React.FC<RoadmapAdvancedFiltersProps> = ({
  values,
  onChange,
  facets,
}) => {
  const activeCount = countActiveAdvancedFilters(values);
  // Start expanded when something is already active — e.g. after applying a saved view that
  // carries a date range, so the reason the list is narrowed is visible without hunting.
  const [isOpen, setIsOpen] = useState(activeCount > 0);

  const set = (patch: Partial<RoadmapAdvancedFilterValues>) => onChange({ ...values, ...patch });

  const toggleCreator = (id: number) =>
    set({
      createdBy: values.createdBy.includes(id)
        ? values.createdBy.filter(c => c !== id)
        : [...values.createdBy, id],
    });

  const creators: RoadmapUserRef[] = facets?.creators ?? [];

  return (
    <div className="border-border-light border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={ButtonVariant.TEXT} onClick={() => setIsOpen(open => !open)}>
          {isOpen ? "Hide" : "More filters"}
          {activeCount > 0 && ` (${activeCount} active)`}
        </Button>
        {activeCount > 0 && (
          <Button
            variant={ButtonVariant.TEXT}
            onClick={() => onChange({ ...EMPTY_ADVANCED_FILTERS })}
          >
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          {/* Creator options come from GET /facets, not the loaded page: with a 50-row limit the
              page rarely contains every filer, and a filter list that shrinks as you filter is
              worse than no filter at all. */}
          {creators.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-typography-secondary w-24 shrink-0">Filed by</span>
              {creators.map(creator => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => toggleCreator(creator.id)}
                  aria-pressed={values.createdBy.includes(creator.id)}
                  title={creator.email}
                  className={`border px-2 py-1 ${
                    values.createdBy.includes(creator.id)
                      ? "border-primary-500 text-primary-600"
                      : "border-border-light text-typography-secondary"
                  }`}
                >
                  {creator.name || creator.email}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <span className="text-typography-secondary w-24 shrink-0 pb-2">Filed between</span>
            <DatePicker
              datePickerType="range"
              dateFormat="Y-m-d"
              value={[values.dateFrom, values.dateTo].filter(Boolean)}
              onChange={(dates: Date[]) =>
                set({
                  dateFrom: toIsoDate(dates?.[0]),
                  dateTo: toIsoDate(dates?.[1]),
                })
              }
            >
              <DatePickerInput
                id="roadmap-filed-from"
                labelText="From"
                placeholder="yyyy-mm-dd"
                size="sm"
              />
              <DatePickerInput
                id="roadmap-filed-to"
                labelText="To"
                placeholder="yyyy-mm-dd"
                size="sm"
              />
            </DatePicker>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <span className="text-typography-secondary w-24 shrink-0 pb-2">Released between</span>
            <DatePicker
              datePickerType="range"
              dateFormat="Y-m-d"
              value={[values.releasedFrom, values.releasedTo].filter(Boolean)}
              onChange={(dates: Date[]) =>
                set({
                  releasedFrom: toIsoDate(dates?.[0]),
                  releasedTo: toIsoDate(dates?.[1]),
                })
              }
            >
              <DatePickerInput
                id="roadmap-released-from"
                labelText="From"
                placeholder="yyyy-mm-dd"
                size="sm"
              />
              <DatePickerInput
                id="roadmap-released-to"
                labelText="To"
                placeholder="yyyy-mm-dd"
                size="sm"
              />
            </DatePicker>
            {/* Stated rather than left to be discovered: most migrated released rows have a NULL
                releasedAt because the source trigger only fired on transition, so this range
                legitimately hides opportunities that ARE released. */}
            <span className="text-typography-secondary pb-2 text-xs">
              Only rows with a release date recorded
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <span className="text-typography-secondary w-24 shrink-0 pb-2">Priority score</span>
            <div className="w-32">
              <NumberInput
                id="roadmap-priority-min"
                label="Min"
                min={0}
                size="sm"
                value={values.priorityMin === "" ? "" : Number(values.priorityMin)}
                onChange={(_e, state) => set({ priorityMin: numberInputValue(state?.value) })}
              />
            </div>
            <div className="w-32">
              <NumberInput
                id="roadmap-priority-max"
                label="Max"
                min={0}
                size="sm"
                value={values.priorityMax === "" ? "" : Number(values.priorityMax)}
                onChange={(_e, state) => set({ priorityMax: numberInputValue(state?.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Carbon hands back a Date; the API and saved-view state both want YYYY-MM-DD. */
const toIsoDate = (date?: Date): string =>
  date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";

/**
 * Carbon's NumberInput reports "" while a field is being cleared and can report a non-numeric
 * string mid-edit. Keeping the raw string (rather than coercing to 0) is what lets "empty" mean
 * "no bound" — coercing would silently apply `priorityMin=0`, which filters nothing but makes the
 * field look set.
 */
const numberInputValue = (value: unknown): string => {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(n) : "";
};
