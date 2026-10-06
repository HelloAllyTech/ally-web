import { FC } from "react";

import { en } from "@src/constants";

import {
  FieldError,
  HelpTip,
  linkButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "./formControls";
import { ValidationErrors } from "./helpers";

interface ChecklistEditorProps {
  steps: string[];
  onChange: (steps: string[]) => void;
  errors: ValidationErrors;
}

/** The ordered escalation checklist: edit in place, add, remove, move up or down. */
export const ChecklistEditor: FC<ChecklistEditorProps> = ({ steps, onChange, errors }) => {
  const text = en.textHelpline.safety;

  const setStep = (index: number, value: string) =>
    onChange(steps.map((step, i) => (i === index ? value : step)));
  const removeStep = (index: number) => onChange(steps.filter((_, i) => i !== index));
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-typography-900">
        {text.escalationChecklist}
        <HelpTip label={text.escalationChecklistHint} />
      </div>

      {steps.length === 0 && <p className="text-sm text-typography-700">{text.checklistEmpty}</p>}

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const position = index + 1;
          const error = errors[`escalationChecklist.${index}`];
          return (
            <li key={index} className="flex flex-col gap-1">
              <div className="flex items-start gap-3">
                <span className="w-5 pt-2 text-sm text-typography-700">{position}.</span>
                <textarea
                  rows={2}
                  value={step}
                  aria-label={text.checklistStep(position)}
                  aria-invalid={Boolean(error)}
                  onChange={event => setStep(index, event.target.value)}
                  className={`${textareaClass} ${error ? "!border-destructive-500" : ""}`}
                />
                <div className="flex flex-col items-start gap-1 pt-1">
                  <button
                    type="button"
                    className={linkButtonClass}
                    disabled={index === 0}
                    aria-label={text.stepAction(text.moveUp, position)}
                    onClick={() => move(index, -1)}
                  >
                    {text.moveUp}
                  </button>
                  <button
                    type="button"
                    className={linkButtonClass}
                    disabled={index === steps.length - 1}
                    aria-label={text.stepAction(text.moveDown, position)}
                    onClick={() => move(index, 1)}
                  >
                    {text.moveDown}
                  </button>
                  <button
                    type="button"
                    className={linkButtonClass}
                    aria-label={text.stepAction(text.remove, position)}
                    onClick={() => removeStep(index)}
                  >
                    {text.remove}
                  </button>
                </div>
              </div>
              <FieldError id={`text-helpline-checklist-${index}-error`} message={error} />
            </li>
          );
        })}
      </ol>

      <div>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => onChange([...steps, ""])}
        >
          {text.addStep}
        </button>
      </div>
    </div>
  );
};
