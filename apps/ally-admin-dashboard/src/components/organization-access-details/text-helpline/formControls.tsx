import { FC, ReactNode, useId } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@src/assets";
import { en } from "@src/constants";

export const inputClass =
  "w-full border border-border-light rounded-md h-10 px-3 text-base text-typography-900 bg-transparent focus:outline-none focus-visible:border-border-blue";
export const textareaClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-base text-typography-900 bg-transparent focus:outline-none focus-visible:border-border-blue";
const invalidClass = "!border-destructive-500";

export const primaryButtonClass =
  "h-10 px-4 text-base text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";
export const secondaryButtonClass =
  "h-10 px-4 text-base text-primary-500 border border-primary-500 hover:bg-secondary-50 disabled:text-neutral-500 disabled:border-neutral-300 disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";
export const linkButtonClass =
  "text-sm text-primary-500 hover:underline disabled:text-neutral-500 disabled:no-underline disabled:cursor-not-allowed";

/**
 * The help marker, as in the rest of the admin console (see ally-web's CLAUDE.md), with one
 * deliberate difference: the hint goes in Carbon's `description`, not its `label`.
 *
 * `label` makes Carbon point `aria-labelledby` at the tooltip text, and `aria-labelledby` outranks
 * `aria-label` — so the button's name would be the whole hint paragraph and "About <field>" would
 * never be announced. `description` uses `aria-describedby` instead: the name says what the button
 * is about, the hint is read after it. Looks the same.
 */
export const HelpTip: FC<{ label: string; subject: string }> = ({ label, subject }) => (
  <Tooltip description={label} align="top">
    <button
      type="button"
      className="cursor-pointer inline-flex items-center"
      aria-label={en.textHelpline.moreInfoAbout(subject)}
    >
      <TooltipIcon />
    </button>
  </Tooltip>
);

export const Section: FC<{
  title: string;
  tooltip?: string;
  description?: string;
  children: ReactNode;
}> = ({ title, tooltip, description, children }) => (
  <section className="flex flex-col gap-4 border border-border-light rounded-md p-4">
    <div className="flex flex-col gap-1">
      <h3 className="flex items-center gap-2 text-base font-medium text-typography-900">
        {title}
        {tooltip && <HelpTip label={tooltip} subject={title} />}
      </h3>
      {description && <p className="text-sm text-typography-700">{description}</p>}
    </div>
    {children}
  </section>
);

export const FieldError: FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <span id={id} role="alert" className="text-xs text-destructive-600">
      {message}
    </span>
  ) : null;

/** Label, optional tooltip, the control, help text and its inline error — one field's chrome. */
export const Field: FC<{
  id: string;
  label: string;
  tooltip?: string;
  help?: string;
  error?: string;
  children: ReactNode;
}> = ({ id, label, tooltip, help, error, children }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-typography-900">
        {label}
      </label>
      {tooltip && <HelpTip label={tooltip} subject={label} />}
    </div>
    {children}
    {help && <span className="text-xs text-typography-700">{help}</span>}
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined);

export const TextField: FC<{
  label: string;
  tooltip?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}> = ({ label, tooltip, value, onChange, error, placeholder, autoComplete = "off" }) => {
  const id = useId();
  return (
    <Field id={id} label={label} tooltip={tooltip} error={error}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
        onChange={event => onChange(event.target.value)}
        className={`${inputClass} ${error ? invalidClass : ""}`}
      />
    </Field>
  );
};

export const TextAreaField: FC<{
  label: string;
  tooltip?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
}> = ({ label, tooltip, value, onChange, error, placeholder, rows = 3 }) => {
  const id = useId();
  return (
    <Field id={id} label={label} tooltip={tooltip} error={error}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
        onChange={event => onChange(event.target.value)}
        className={`${textareaClass} ${error ? invalidClass : ""}`}
      />
    </Field>
  );
};

/**
 * Number input over a plain `number` value. An emptied box becomes `NaN` rather than `0`, so
 * "I cleared it" is reported by validation instead of silently saving a zero.
 */
export const NumberField: FC<{
  label: string;
  tooltip?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  help?: string;
}> = ({ label, tooltip, value, onChange, min, max, step = 1, error, help }) => {
  const id = useId();
  return (
    <Field id={id} label={label} tooltip={tooltip} error={error} help={help}>
      <input
        id={id}
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
        onChange={event => onChange(event.target.value === "" ? NaN : Number(event.target.value))}
        className={`${inputClass} !w-40 ${error ? invalidClass : ""}`}
      />
    </Field>
  );
};

export const CheckboxField: FC<{
  label: string;
  tooltip?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, tooltip, checked, onChange }) => (
  <div className="flex items-center gap-2">
    <label className="flex items-center gap-2 text-sm text-typography-900 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-primary-500"
      />
      {label}
    </label>
    {tooltip && <HelpTip label={tooltip} subject={label} />}
  </div>
);
