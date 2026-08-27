import React from "react";

import { DatePicker, DatePickerInput, NumberInput } from "@ally-ui-mono/ui-shared";

import { RoadmapAdvancedFilterValues } from "./utils/filters";

interface RoadmapAdvancedFiltersProps {
  /** Owned by RoadmapFilterBar, which renders the disclosure button and its count badge. */
  isOpen: boolean;
  values: RoadmapAdvancedFilterValues;
  onChange: (next: RoadmapAdvancedFilterValues) => void;
}

/**
 * Filed-date range, released-date range and priority-score range.
 *
 * WHY THESE THREE ARE NOT IN THE FILTER POPOVER while the six checkbox facets are: FilterDropdown
 * is a checkbox-list component — it has no route for a date range or a numeric bound. Ranges are
 * also genuinely less used, answering "what did Shubham file in June" rather than "show me bugs".
 *
 * `createdBy` used to live here as its own wrapping row of name chips. It moved into the popover as
 * the "Filed by" section: it is a checkbox facet like the other five, and a second chip row was the
 * same clutter this panel exists to keep out of the page.
 *
 * THE COUNT BADGE ON THE DISCLOSURE IS NOT DECORATION. A collapsed panel hiding an active filter is
 * how someone concludes the board is broken: rows are missing and nothing on screen explains why.
 * RoadmapFilterBar keeps the count visible while collapsed and "Clear all" reachable without
 * expanding.
 *
 * Dates are plain YYYY-MM-DD strings, which is what the API's @IsISO8601 accepts and what
 * saved-view state already stores — so no format conversion sits between the two.
 */
export const RoadmapAdvancedFilters: React.FC<RoadmapAdvancedFiltersProps> = ({
  isOpen,
  values,
  onChange,
}) => {
  if (!isOpen) return null;

  const set = (patch: Partial<RoadmapAdvancedFilterValues>) => onChange({ ...values, ...patch });

  return (
    <div className="border-border-light flex flex-col gap-3 border-t pt-3 text-sm">
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
        {/* "Total votes", matching the table column it filters. */}
        <span className="text-typography-secondary w-24 shrink-0 pb-2">Total votes</span>
        {/* `allowEmpty` is load-bearing, not cosmetic. Carbon's NumberInput treats an empty value
            as failing `min={0}` unless told otherwise, so both bounds rendered in the red invalid
            state — complete with error icons — the entire time no score filter was set, which is
            the normal case. An always-invalid control reads as "this panel is broken". Empty means
            "no bound" here, which is a valid state and the default one. */}
        <div className="w-32">
          <NumberInput
            id="roadmap-priority-min"
            label="Min"
            min={0}
            size="sm"
            allowEmpty
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
            allowEmpty
            value={values.priorityMax === "" ? "" : Number(values.priorityMax)}
            onChange={(_e, state) => set({ priorityMax: numberInputValue(state?.value) })}
          />
        </div>
      </div>
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
