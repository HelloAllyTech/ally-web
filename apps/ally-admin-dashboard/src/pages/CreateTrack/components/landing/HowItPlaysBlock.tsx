import { FC } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { en } from "@constants";
import { LandingSittingLength, TrackFormValues, TrackItemType } from "@types";

import { countItemsByType } from "./landingBlocks";
import { HelpTooltip, LandingBlockPanel, hintClass, inputClass, labelClass } from "./LandingFields";
import { LandingBlockProps, LandingSectionsProps } from "./landingTypes";

const SITTING_ORDER: LandingSittingLength[] = [
  LandingSittingLength.SHORT,
  LandingSittingLength.MEDIUM,
  LandingSittingLength.LONG,
];

export const HowItPlaysBlock: FC<LandingBlockProps & LandingSectionsProps> = ({
  page,
  update,
  sections,
}) => {
  const copy = en.courseLanding.howItPlays;
  const { control } = useFormContext<TrackFormValues>();
  const durationMinutes = useWatch({ control, name: "estimatedDurationMinutes" });
  const counts = countItemsByType(sections);
  const hasRoleplay = counts.some(entry => entry.type === TrackItemType.ROLEPLAY);

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.howItPlays}
      fallback={en.courseLanding.fallback.howItPlays}
      isOff={!page.howItPlays.enabled}
    >
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>{copy.countsHeading}</span>
        {counts.length === 0 ? (
          <span className={hintClass}>{copy.countsEmpty}</span>
        ) : (
          <ul className="flex flex-wrap gap-2" data-testid="landing-counts">
            {counts.map(({ type, count }) => (
              <li
                key={type}
                className="rounded-full bg-secondary-50 px-2.5 py-1 text-xs text-typography-900"
              >
                {copy.itemCount(type, count)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>{copy.durationLabel}</span>
        <span className="text-sm text-typography-900" data-testid="landing-duration">
          {durationMinutes ? copy.durationValue(durationMinutes) : copy.durationUnset}
        </span>
        <span className={hintClass}>{copy.durationPointer}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1">
          <label htmlFor="landing-sitting-length" className={labelClass}>
            {copy.sittingLength.label}
          </label>
          <HelpTooltip label={copy.sittingLength.tooltip} name={copy.sittingLength.label} />
        </span>
        <select
          id="landing-sitting-length"
          className={`${inputClass} md:w-64`}
          value={page.howItPlays.sittingLength ?? ""}
          onChange={event =>
            update(draft => {
              draft.howItPlays.sittingLength =
                event.target.value === "" ? null : (event.target.value as LandingSittingLength);
            })
          }
        >
          <option value="">{copy.sittingLength.none}</option>
          {SITTING_ORDER.map(length => (
            <option key={length} value={length}>
              {copy.sittingLength.options[length]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>{copy.promisesHeading}</span>
        <ul className="list-disc pl-5 text-sm text-typography-900 flex flex-col gap-0.5">
          {hasRoleplay && <li>{copy.promises.retry}</li>}
          {hasRoleplay && <li>{copy.promises.debrief}</li>}
          <li>{copy.promises.keep}</li>
        </ul>
        <span className={hintClass}>{copy.promisesNote}</span>
      </div>
    </LandingBlockPanel>
  );
};
