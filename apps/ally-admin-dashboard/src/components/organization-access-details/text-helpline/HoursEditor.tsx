import { FC, useId, useMemo } from "react";

import { en } from "@src/constants";
import { HelplineHours, HelplineWeekday } from "@src/types";

import { FieldError, Field, inputClass } from "./formControls";
import { ValidationErrors, WEEKDAYS_MONDAY_FIRST, dayName, getTimezoneOptions } from "./helpers";

interface HoursEditorProps {
  hours: HelplineHours;
  onChange: (hours: HelplineHours) => void;
  errors: ValidationErrors;
}

const NEW_DAY_WINDOW = { open: "09:00", close: "17:00" };

/**
 * One row per weekday. The row edits that day's first opening window; if the saved hours carry more
 * than one window for a day the extras are left exactly as saved (and the row says so) rather than
 * being dropped by an edit to something else.
 */
export const HoursEditor: FC<HoursEditorProps> = ({ hours, onChange, errors }) => {
  const timezoneId = useId();
  const timezones = useMemo(() => getTimezoneOptions(hours.tz), [hours.tz]);
  const text = en.textHelpline.availability;

  const setWindow = (index: number, patch: { open?: string; close?: string }) =>
    onChange({
      ...hours,
      weekly: hours.weekly.map((window, i) => (i === index ? { ...window, ...patch } : window)),
    });

  const setDayOpen = (day: HelplineWeekday, open: boolean) =>
    onChange({
      ...hours,
      weekly: open
        ? [...hours.weekly, { day, ...NEW_DAY_WINDOW }]
        : hours.weekly.filter(window => window.day !== day),
    });

  return (
    <div className="flex flex-col gap-3">
      <Field
        id={timezoneId}
        label={text.timezone}
        tooltip={text.timezoneHint}
        error={errors["hours.tz"]}
      >
        <select
          id={timezoneId}
          value={hours.tz}
          onChange={event => onChange({ ...hours, tz: event.target.value })}
          className={`${inputClass} !w-72`}
        >
          {timezones.map(zone => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </Field>

      <ul className="flex flex-col gap-2">
        {WEEKDAYS_MONDAY_FIRST.map(day => {
          const name = dayName(day);
          const index = hours.weekly.findIndex(window => window.day === day);
          const window = index === -1 ? undefined : hours.weekly[index];
          const extraWindows = hours.weekly.filter(w => w.day === day).length - 1;
          const errorKey = `hours.day.${day}`;
          return (
            <li key={day} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-typography-900">{name}</span>
                <label className="flex items-center gap-2 text-sm text-typography-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(window)}
                    aria-label={`${name}: ${text.open}`}
                    onChange={event => setDayOpen(day, event.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-primary-500"
                  />
                  {text.open}
                </label>
                {window && (
                  <>
                    <input
                      type="time"
                      value={window.open}
                      aria-label={text.opensAt(name)}
                      aria-invalid={Boolean(errors[errorKey])}
                      onChange={event => setWindow(index, { open: event.target.value })}
                      className={`${inputClass} !w-32`}
                    />
                    <span aria-hidden="true" className="text-sm text-typography-700">
                      –
                    </span>
                    <input
                      type="time"
                      value={window.close}
                      aria-label={text.closesAt(name)}
                      aria-invalid={Boolean(errors[errorKey])}
                      onChange={event => setWindow(index, { close: event.target.value })}
                      className={`${inputClass} !w-32`}
                    />
                  </>
                )}
              </div>
              {extraWindows > 0 && (
                <span className="text-xs text-typography-700">
                  {text.extraWindows(extraWindows)}
                </span>
              )}
              <FieldError id={`${timezoneId}-${errorKey}`} message={errors[errorKey]} />
            </li>
          );
        })}
      </ul>
      <FieldError id={`${timezoneId}-hours`} message={errors.hours} />
    </div>
  );
};
