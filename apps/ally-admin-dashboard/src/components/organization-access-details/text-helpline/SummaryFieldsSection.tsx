import { FC } from "react";

import { en } from "@src/constants";
import { HelplineSummaryField } from "@src/types";

import {
  FieldError,
  Section,
  inputClass,
  linkButtonClass,
  secondaryButtonClass,
} from "./formControls";
import { SectionProps } from "./sectionProps";

export const SummaryFieldsSection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.summaryFields;
  const fields = form.summaryFields;

  const setField = (index: number, patch: Partial<HelplineSummaryField>) =>
    onChange({
      summaryFields: fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    });

  return (
    <Section title={text.title} tooltip={text.hint}>
      {fields.length === 0 && <p className="text-sm text-typography-700">{text.empty}</p>}

      <ul className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const position = index + 1;
          const keyError = errors[`summaryFields.${index}.key`];
          const labelError = errors[`summaryFields.${index}.label`];
          return (
            <li key={index} className="flex flex-col gap-1">
              <div className="grid grid-cols-1 md:grid-cols-[12rem_14rem_1fr_auto] gap-2 items-start">
                <input
                  type="text"
                  value={field.key}
                  placeholder={text.key}
                  aria-label={text.keyFor(position)}
                  aria-invalid={Boolean(keyError)}
                  onChange={event => setField(index, { key: event.target.value })}
                  className={`${inputClass} font-mono ${keyError ? "!border-destructive-500" : ""}`}
                />
                <input
                  type="text"
                  value={field.label}
                  placeholder={text.label}
                  aria-label={text.labelFor(position)}
                  aria-invalid={Boolean(labelError)}
                  onChange={event => setField(index, { label: event.target.value })}
                  className={`${inputClass} ${labelError ? "!border-destructive-500" : ""}`}
                />
                <input
                  type="text"
                  value={field.description}
                  placeholder={text.description}
                  aria-label={text.descriptionFor(position)}
                  onChange={event => setField(index, { description: event.target.value })}
                  className={inputClass}
                />
                <button
                  type="button"
                  className={`${linkButtonClass} h-10`}
                  aria-label={text.removeField(position)}
                  onClick={() => onChange({ summaryFields: fields.filter((_, i) => i !== index) })}
                >
                  {text.remove}
                </button>
              </div>
              <FieldError id={`text-helpline-summary-${index}-key-error`} message={keyError} />
              <FieldError id={`text-helpline-summary-${index}-label-error`} message={labelError} />
            </li>
          );
        })}
      </ul>

      <div>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            onChange({ summaryFields: [...fields, { key: "", label: "", description: "" }] })
          }
        >
          {text.add}
        </button>
      </div>
    </Section>
  );
};
