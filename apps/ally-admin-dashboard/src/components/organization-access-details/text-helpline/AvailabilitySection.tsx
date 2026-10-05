import { FC, useId, useRef } from "react";

import { en } from "@src/constants";
import { HelplineHours } from "@src/types";

import { CheckboxField, HelpTip, NumberField, Section } from "./formControls";
import { NUMBER_LIMITS, buildDefaultHours } from "./helpers";
import { HoursEditor } from "./HoursEditor";
import { SectionProps } from "./sectionProps";

export const AvailabilitySection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.availability;
  const modeName = useId();
  // Remembers the hours an admin had when they switched to "whenever a listener is Available", so
  // switching back restores them instead of starting over from the defaults.
  const lastHours = useRef<HelplineHours | null>(form.hours);

  const setAlwaysOpen = () => {
    if (form.hours) lastHours.current = form.hours;
    onChange({ hours: null });
  };
  const setOpeningHours = () => {
    if (!form.hours) onChange({ hours: lastHours.current ?? buildDefaultHours() });
  };

  return (
    <Section title={text.title}>
      <fieldset className="flex flex-col gap-2">
        <legend className="flex items-center gap-2 text-sm text-typography-900 mb-1">
          {text.modeLabel}
          <HelpTip label={text.modeHint} />
        </legend>
        <label className="flex items-center gap-2 text-sm text-typography-900 cursor-pointer">
          <input
            type="radio"
            name={modeName}
            checked={form.hours === null}
            onChange={setAlwaysOpen}
            className="h-4 w-4 cursor-pointer accent-primary-500"
          />
          {text.alwaysOpen}
        </label>
        <label className="flex items-center gap-2 text-sm text-typography-900 cursor-pointer">
          <input
            type="radio"
            name={modeName}
            checked={form.hours !== null}
            onChange={setOpeningHours}
            className="h-4 w-4 cursor-pointer accent-primary-500"
          />
          {text.setHours}
        </label>
      </fieldset>

      {form.hours && (
        <HoursEditor hours={form.hours} errors={errors} onChange={hours => onChange({ hours })} />
      )}

      <CheckboxField
        label={text.allowQueue}
        tooltip={text.allowQueueHint}
        checked={form.allowQueueWhenNoListeners}
        onChange={allowQueueWhenNoListeners => onChange({ allowQueueWhenNoListeners })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField
          label={text.maxWaitMinutes}
          tooltip={text.maxWaitMinutesHint}
          value={form.maxWaitMinutes}
          {...NUMBER_LIMITS.maxWaitMinutes}
          error={errors.maxWaitMinutes}
          onChange={maxWaitMinutes => onChange({ maxWaitMinutes })}
        />
        <NumberField
          label={text.idleEndMinutes}
          tooltip={text.idleEndMinutesHint}
          value={form.idleEndMinutes}
          {...NUMBER_LIMITS.idleEndMinutes}
          error={errors.idleEndMinutes}
          onChange={idleEndMinutes => onChange({ idleEndMinutes })}
        />
        <NumberField
          label={text.maxWaitingTalkers}
          tooltip={text.maxWaitingTalkersHint}
          value={form.maxWaitingTalkers}
          {...NUMBER_LIMITS.maxWaitingTalkers}
          error={errors.maxWaitingTalkers}
          onChange={maxWaitingTalkers => onChange({ maxWaitingTalkers })}
        />
        <NumberField
          label={text.orgMaxConcurrent}
          tooltip={text.orgMaxConcurrentHint}
          value={form.orgMaxConcurrentPerListener}
          {...NUMBER_LIMITS.orgMaxConcurrentPerListener}
          error={errors.orgMaxConcurrentPerListener}
          onChange={orgMaxConcurrentPerListener => onChange({ orgMaxConcurrentPerListener })}
        />
      </div>
    </Section>
  );
};
