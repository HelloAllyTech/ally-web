import { FC } from "react";

import { en } from "@src/constants";

import { Section, TextAreaField } from "./formControls";
import { languageName } from "./helpers";
import { SectionProps } from "./sectionProps";

export const TalkerTextSection: FC<SectionProps> = ({ form, defaults, errors, onChange }) => {
  const text = en.textHelpline.talkerText;

  return (
    <Section title={text.title} description={text.description}>
      {form.languages.map(code => {
        const language = languageName(code);
        return (
          <div key={code} className="flex flex-col gap-4">
            <TextAreaField
              label={text.emergencyResources(language)}
              tooltip={text.emergencyResourcesHint}
              value={form.emergencyResources[code] ?? ""}
              placeholder={defaults.emergencyResources[code]}
              error={errors[`emergencyResources.${code}`]}
              rows={3}
              onChange={value =>
                onChange({ emergencyResources: { ...form.emergencyResources, [code]: value } })
              }
            />
            <TextAreaField
              label={text.closingMessage(language)}
              tooltip={text.closingMessageHint}
              value={form.closingMessage[code] ?? ""}
              placeholder={defaults.closingMessage[code]}
              rows={2}
              onChange={value =>
                onChange({ closingMessage: { ...form.closingMessage, [code]: value } })
              }
            />
          </div>
        );
      })}

      <TextAreaField
        label={text.ageNotice}
        tooltip={text.ageNoticeHint}
        value={form.ageNotice ?? ""}
        placeholder={defaults.ageNotice ?? undefined}
        rows={2}
        onChange={ageNotice => onChange({ ageNotice })}
      />
    </Section>
  );
};
