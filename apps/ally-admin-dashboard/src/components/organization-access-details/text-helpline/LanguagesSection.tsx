import { FC } from "react";

import { en } from "@src/constants";

import { FieldError, Section } from "./formControls";
import { KNOWN_LANGUAGE_CODES, languageName, sortLanguages } from "./helpers";
import { SectionProps } from "./sectionProps";

export const LanguagesSection: FC<SectionProps> = ({ form, errors, onChange }) => {
  const text = en.textHelpline.languages;
  // A language saved earlier that this list doesn't know still shows (by its code) while the form
  // holds anything for it, so it can be switched back on after being switched off.
  const options = sortLanguages([
    ...KNOWN_LANGUAGE_CODES,
    ...form.languages,
    ...Object.keys(form.emergencyResources),
    ...Object.keys(form.closingMessage),
  ]);

  const toggle = (code: string, offered: boolean) =>
    onChange({
      languages: sortLanguages(
        offered ? [...form.languages, code] : form.languages.filter(c => c !== code),
      ),
    });

  return (
    <Section title={text.title} tooltip={text.hint}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map(code => (
          <label
            key={code}
            className="flex items-center gap-2 text-sm text-typography-900 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={form.languages.includes(code)}
              onChange={event => toggle(code, event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary-500"
            />
            {languageName(code)}
          </label>
        ))}
      </div>
      <FieldError id="text-helpline-languages-error" message={errors.languages} />
    </Section>
  );
};
