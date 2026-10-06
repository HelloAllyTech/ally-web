import { FC } from "react";

import { en } from "@src/constants";

import { CheckboxField, NumberField, Section } from "./formControls";
import { NUMBER_LIMITS } from "./helpers";
import { SectionProps } from "./sectionProps";

export const CopilotSection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.copilot;
  const setCopilot = (patch: Partial<typeof form.copilot>) =>
    onChange({ copilot: { ...form.copilot, ...patch } });

  return (
    <Section title={text.title}>
      <div className="flex flex-col gap-3">
        <CheckboxField
          label={text.suggestions}
          tooltip={text.suggestionsHint}
          checked={form.copilot.suggestions}
          onChange={suggestions => setCopilot({ suggestions })}
        />
        <CheckboxField
          label={text.nudges}
          tooltip={text.nudgesHint}
          checked={form.copilot.nudges}
          onChange={nudges => setCopilot({ nudges })}
        />
        <CheckboxField
          label={text.riskClassifier}
          tooltip={text.riskClassifierHint}
          checked={form.copilot.riskClassifier}
          onChange={riskClassifier => setCopilot({ riskClassifier })}
        />
      </div>
      <NumberField
        label={text.rollingSummary}
        tooltip={text.rollingSummaryHint}
        value={form.copilot.rollingSummaryEveryTurns}
        {...NUMBER_LIMITS.rollingSummaryEveryTurns}
        error={errors.rollingSummaryEveryTurns}
        onChange={rollingSummaryEveryTurns => setCopilot({ rollingSummaryEveryTurns })}
      />
    </Section>
  );
};
