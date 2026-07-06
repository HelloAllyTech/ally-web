import { FC, ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { DropdownField } from "@ally-ui-mono/ui-shared";
import { TextField } from "@components";
import { carbonField } from "@constants/carbonFieldStyles";
import { SummaryFieldKey } from "@types";

import { FieldType, SummaryField } from "../types";

interface SummaryFieldInputProps {
  field: SummaryField;
  /** Display/edit value for the field ("--" placeholder is applied by the caller's value). */
  value: string | null;
  /** Whether the input is read-only/disabled. */
  disabled: boolean;
  /** Resolved options for Dropdown fields (already includes any dynamic options). */
  options?: string[];
  /** Whether to render the field label above a Multiline input (CallSummary's labelShownSections). */
  showLabel?: boolean;
  onChange: (key: string, value: string) => void;
  /** Search handler for the Location dropdown. */
  onSearch?: (query: string) => void;
  /** Enhance affordances (post-call summary only). */
  isEnhancing?: boolean;
  enhanceStartAdornment?: ReactNode;
  enhanceEndAdornment?: ReactNode;
  /**
   * Visual language. "default" (post-call summary page) is unchanged; "carbon"
   * renders IBM Carbon-style raw controls (label above, gray fill, bottom
   * border) for the manual "New note" drawer.
   */
  variant?: "default" | "carbon";
}

/**
 * Presentational renderer for a single built-in summary field. Extracted from
 * CallSummary so the post-call summary page and the manual "New note" drawer
 * render built-in fields identically. The host computes the value, disabled
 * state, dropdown options and (optionally) enhance affordances and passes them
 * in — this component only renders.
 */
const SummaryFieldInput: FC<SummaryFieldInputProps> = ({
  field,
  value,
  disabled,
  options,
  showLabel,
  onChange,
  onSearch,
  isEnhancing = false,
  enhanceStartAdornment,
  enhanceEndAdornment,
  variant = "default",
}) => {
  if (variant === "carbon") {
    const labelEl = <label className={carbonField.label}>{field.label}</label>;

    if (field.type === FieldType.Dropdown) {
      return (
        <div className={carbonField.group}>
          {labelEl}
          <div className="relative">
            <select
              className={carbonField.select}
              disabled={disabled}
              value={value ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
            >
              <option value="">{field.placeholder ?? "--"}</option>
              {(options ?? []).map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className={carbonField.selectChevron} />
          </div>
        </div>
      );
    }

    if (field.type === FieldType.Multiline) {
      return (
        <div className={carbonField.group}>
          {labelEl}
          <textarea
            className={carbonField.textarea}
            disabled={disabled}
            rows={field.key === SummaryFieldKey.SessionSummary ? 8 : 4}
            placeholder={field.placeholder}
            value={value ?? ""}
            onChange={e => onChange(field.key, e.target.value)}
          />
        </div>
      );
    }

    return (
      <div className={carbonField.group}>
        {labelEl}
        <input
          className={carbonField.input}
          type={field.type === FieldType.Number ? "number" : "text"}
          disabled={disabled}
          placeholder={field.placeholder}
          value={value ?? ""}
          onChange={e => onChange(field.key, e.target.value)}
          // Scrolling over a focused number input silently changes its value
          // in the browser — blur so the page scrolls instead of the value.
          onWheel={e => {
            if (field.type === FieldType.Number) {
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    );
  }

  switch (field.type) {
    case FieldType.Dropdown:
      return (
        <div className="flex gap-1">
          <span className="font-medium text-lg text-typography-800 whitespace-nowrap bg-green">{`${field.label}: `}</span>
          <DropdownField
            disabled={disabled}
            value={value ?? field.placeholder ?? "--"}
            valueClassName={`${field.isEditable ? "text-typography-900" : "text-typography-800"}
                text-lg font-primary`}
            onChange={selected => onChange(field.key, selected)}
            onHandleSearch={field.key === SummaryFieldKey.Location ? onSearch : undefined}
            options={options ?? []}
          />
        </div>
      );
    case FieldType.Multiline:
      return (
        <div className="flex flex-col gap-1">
          {showLabel && (
            <span className="font-medium text-lg text-typography-800">{`${field.label}: `}</span>
          )}
          <TextField
            value={isEnhancing ? "" : value || ""}
            onChange={e => onChange(field.key, e.target.value)}
            multiline
            rows={field.key === SummaryFieldKey.SessionSummary ? 10 : 4}
            className="w-full"
            inputStyles={{
              color: field.isEditable ? "#1A1A1A" : "#9CA3AF",
              fontSize: "16px",
              fontFamily: "IBM_Plex_Serif",
              cursor: isEnhancing ? "not-allowed" : "auto",
            }}
            placeholder={isEnhancing ? "" : field.placeholder}
            showBorder={false}
            InputProps={{
              readOnly: disabled,
              startAdornment: enhanceStartAdornment,
              endAdornment: enhanceEndAdornment,
            }}
          />
        </div>
      );
    case FieldType.Number:
    case FieldType.Text:
    default:
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium text-lg text-typography-800">{`${field.label}: `}</span>
            <div className="flex-1">
              <TextField
                value={value ?? "--"}
                onChange={e => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                inputStyles={{
                  color: field.isEditable ? "#1A1A1A" : "#9CA3AF",
                  fontSize: "16px",
                  fontFamily: "IBM_Plex_Serif",
                }}
                InputProps={{ readOnly: disabled }}
                showBorder={false}
              />
            </div>
          </div>
          {field.key === "clientId" && (
            <hr className="border-0 border-t" style={{ width: "90%", marginTop: "6px" }} />
          )}
        </div>
      );
  }
};

export default SummaryFieldInput;
