import { FC, useMemo, useState } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { FilterableMultiSelect, Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetCompetenciesQuery } from "@api";
import { TooltipIcon } from "@assets";
import { TRACK_MAX_COMPETENCIES } from "@constants";
import { Competency, TrackFormValues } from "@types";

const labelClass = "text-sm font-medium text-typography-800";

export const TRACK_COMPETENCIES_LABEL = "Competencies this course teaches (optional)";
export const TRACK_COMPETENCIES_HELP =
  "Analytics → Course impact reads this course's results on these skills. Leave empty to use the competencies of its roleplays.";
export const TRACK_COMPETENCIES_LOAD_ERROR =
  "Couldn't load the competency list. Any competencies already on this course are kept when you save.";
export const TRACK_COMPETENCIES_TOOLTIP =
  "Name the skills this course sets out to build. Only shared competencies are listed: custom ones are private to whoever made them, and Course impact doesn't read them. Clearing every competency switches Course impact back to the competencies of the course's roleplays.";
export const TRACK_COMPETENCIES_TOO_MANY = `A course can name at most ${TRACK_MAX_COMPETENCIES} competencies.`;

/**
 * Optional course → competency tag (`tracks.competencyIds`).
 *
 * Reads the same competency list, through the same hook, as the simulation
 * builder's picker (`components/competency`), but deliberately not that
 * component: selecting there writes a "should do / should not do" pair into the
 * Scoring Rubric and forks a private custom competency when those rows are
 * edited, and a course has neither a rubric nor a reason to mint competencies.
 *
 * Lists shared competencies only. A custom competency is private to the author
 * who made it, so it would be a tag no other editor of a shared course could
 * see, and Course impact never reads one. The backend rejects them for the
 * same reasons.
 *
 * Ids on the course that are not in the list (a competency deleted since) are
 * not shown and are dropped on the next change — the backend drops them anyway.
 * If the list fails to load the field locks rather than empties, so a save
 * still sends the stored ids back unchanged.
 */
export const TrackCompetenciesField: FC = () => {
  const { control } = useFormContext<TrackFormValues>();
  const { data, isLoading, isError } = useGetCompetenciesQuery({});
  const [tooMany, setTooMany] = useState(false);

  const options = useMemo<Competency[]>(
    () =>
      [...(data?.data ?? [])]
        .filter(competency => !competency.isCustom)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );
  const byId = useMemo(
    () => new Map(options.map(competency => [competency.id, competency])),
    [options],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1">
        <span className={labelClass}>{TRACK_COMPETENCIES_LABEL}</span>
        <Tooltip label={TRACK_COMPETENCIES_TOOLTIP} align="top">
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      </span>
      <span className="text-xs text-typography-500">{TRACK_COMPETENCIES_HELP}</span>
      <Controller
        control={control}
        name="competencyIds"
        render={({ field }) => {
          const selected = (field.value ?? [])
            .map(id => byId.get(id))
            .filter((competency): competency is Competency => Boolean(competency));
          return (
            <FilterableMultiSelect
              id="track-competencies"
              titleText={TRACK_COMPETENCIES_LABEL}
              hideLabel
              placeholder={isLoading ? "Loading…" : "Search competencies"}
              items={options}
              itemToString={(item: Competency | null) => item?.name ?? ""}
              selectedItems={selected}
              selectionFeedback="top-after-reopen"
              disabled={isLoading || isError}
              invalid={tooMany}
              invalidText={TRACK_COMPETENCIES_TOO_MANY}
              onChange={({ selectedItems }: { selectedItems: Competency[] | null }) => {
                const next = (selectedItems ?? []).map(competency => competency.id);
                if (next.length > TRACK_MAX_COMPETENCIES) {
                  setTooMany(true);
                  return;
                }
                setTooMany(false);
                field.onChange(next);
              }}
            />
          );
        }}
      />
      {/* Carbon suppresses warnText on a disabled field, so the reason it is
          locked is said here instead. */}
      {isError && (
        <span role="status" className="text-xs text-destructive-500">
          {TRACK_COMPETENCIES_LOAD_ERROR}
        </span>
      )}
    </div>
  );
};
