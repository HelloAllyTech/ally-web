import { FC } from "react";

import { en } from "@src/constants";

import { NumberField, Section } from "./formControls";
import { SectionProps } from "./sectionProps";

export const RetentionSection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.retention;

  return (
    <Section title={text.title}>
      <NumberField
        label={text.days}
        tooltip={text.daysHint}
        value={form.retentionDays}
        min={0}
        error={errors.retentionDays}
        onChange={retentionDays => onChange({ retentionDays })}
      />
      {/* Said out loud rather than left to be inferred from a 0: keeping anonymous chats forever is
          a decision, and it should look like one on the screen where it is made. */}
      {form.retentionDays === 0 && (
        <div
          role="status"
          className="border-l-4 border-warning-300 bg-warning-50 px-3 py-2 text-sm text-typography-900"
        >
          {text.foreverWarning}
        </div>
      )}
    </Section>
  );
};
