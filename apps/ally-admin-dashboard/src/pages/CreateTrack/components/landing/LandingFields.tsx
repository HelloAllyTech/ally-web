import { FC, ReactNode, useId } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import { en } from "@constants";

export const labelClass = "text-sm font-medium text-typography-800";
export const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400 disabled:opacity-60";
export const hintClass = "text-xs text-typography-500";

/** The help-icon pattern from ally-web's CLAUDE.md. */
export const HelpTooltip: FC<{ label: string; name: string }> = ({ label, name }) => (
  <Tooltip label={label} align="top">
    <button
      type="button"
      className="cursor-pointer inline-flex items-center"
      aria-label={`Help: ${name}`}
    >
      <TooltipIcon />
    </button>
  </Tooltip>
);

interface LandingTextFieldProps {
  label: string;
  value: string | null;
  /** Null when the field is emptied, matching how the backend stores it. */
  onChange: (value: string | null) => void;
  /** Hard limit: the box stops accepting text here, and the counter shows how close it is. */
  max: number;
  placeholder?: string;
  hint?: string;
  tooltip?: string;
  multiline?: boolean;
  rows?: number;
}

/** A label, a text box, a character counter against the contract's limit, and optional help. */
export const LandingTextField: FC<LandingTextFieldProps> = ({
  label,
  value,
  onChange,
  max,
  placeholder,
  hint,
  tooltip,
  multiline = false,
  rows = 2,
}) => {
  const id = useId();
  const used = value?.length ?? 0;
  const common = {
    id,
    value: value ?? "",
    placeholder,
    maxLength: max,
    className: `${inputClass} ${multiline ? "resize-y" : ""}`,
  };
  const handle = (next: string) => onChange(next === "" ? null : next);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1">
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
          {tooltip && <HelpTooltip label={tooltip} name={label} />}
        </span>
        <span
          className={`text-xs tabular-nums ${used >= max ? "text-destructive-500" : "text-typography-500"}`}
          data-testid="landing-char-count"
        >
          {en.courseLanding.charactersLeft(used, max)}
        </span>
      </div>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={event => handle(event.target.value)} />
      ) : (
        <input type="text" {...common} onChange={event => handle(event.target.value)} />
      )}
      {hint && <span className={hintClass}>{hint}</span>}
    </div>
  );
};

interface LandingBlockPanelProps {
  title: string;
  /** What the public page does when this block is empty or off. */
  fallback: string;
  /** The block is switched off: the fields stay editable, with a note saying so. */
  isOff?: boolean;
  intro?: ReactNode;
  children: ReactNode;
}

/** Frame for one block's fields: title, intro, the fields, then the muted fallback line. */
export const LandingBlockPanel: FC<LandingBlockPanelProps> = ({
  title,
  fallback,
  isOff = false,
  intro,
  children,
}) => (
  <section className="flex flex-col gap-4" aria-label={title}>
    <h3 className="text-base font-semibold text-typography-900">{title}</h3>
    {isOff && (
      <p className="text-xs text-typography-700 bg-secondary-50 rounded-md px-3 py-2">
        {en.courseLanding.offNote}
      </p>
    )}
    {intro && <div className={hintClass}>{intro}</div>}
    {children}
    <p
      className="border-t border-border-light pt-3 text-xs text-typography-500"
      data-testid="landing-fallback"
    >
      {fallback}
    </p>
  </section>
);
