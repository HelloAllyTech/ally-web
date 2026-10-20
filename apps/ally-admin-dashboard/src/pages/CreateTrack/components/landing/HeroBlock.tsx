import { FC } from "react";

import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { CharacterPicker } from "./CharacterPicker";
import { personaFromCharacter } from "./landingBlocks";
import { LandingBlockPanel, LandingTextField, hintClass } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";
import { PersonaImageField } from "./PersonaImageField";

export const HeroBlock: FC<LandingBlockProps> = ({ page, update }) => {
  const copy = en.courseLanding.hero;
  const { hero, persona } = page;

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.hero}
      fallback={en.courseLanding.fallback.hero}
    >
      <LandingTextField
        label={copy.hook.label}
        value={hero.hook}
        onChange={value =>
          update(draft => {
            draft.hero.hook = value;
          })
        }
        max={LANDING_LIMITS.hookMax}
        placeholder={copy.hook.placeholder}
        hint={copy.hook.hint}
        multiline
      />
      <LandingTextField
        label={copy.question.label}
        value={hero.question}
        onChange={value =>
          update(draft => {
            draft.hero.question = value;
          })
        }
        max={LANDING_LIMITS.questionMax}
        placeholder={copy.question.placeholder}
        hint={copy.question.hint}
      />
      <LandingTextField
        label={copy.courseLine.label}
        value={hero.courseLine}
        onChange={value =>
          update(draft => {
            draft.hero.courseLine = value;
          })
        }
        max={LANDING_LIMITS.courseLineMax}
        placeholder={copy.courseLine.placeholder}
        hint={copy.courseLine.hint}
        multiline
      />
      <LandingTextField
        label={copy.buttonLabel.label}
        value={hero.buttonLabel}
        onChange={value =>
          update(draft => {
            draft.hero.buttonLabel = value;
          })
        }
        max={LANDING_LIMITS.buttonLabelMax}
        placeholder={copy.buttonLabel.placeholder}
        hint={copy.buttonLabel.hint}
      />

      <div className="flex flex-col gap-4 border-t border-border-light pt-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-typography-900">{copy.personaHeading}</h4>
          <span className={hintClass}>{copy.personaHint}</span>
        </div>
        <CharacterPicker
          onPick={character =>
            update(draft => {
              const picked = personaFromCharacter(character);
              draft.persona.name = picked.name || null;
              draft.persona.characterId = picked.characterId;
              if (picked.imageUrl) draft.persona.imageUrl = picked.imageUrl;
            })
          }
        />
        <LandingTextField
          label={copy.personaName.label}
          value={persona.name}
          onChange={value =>
            update(draft => {
              draft.persona.name = value;
            })
          }
          max={LANDING_LIMITS.personaNameMax}
          placeholder={copy.personaName.placeholder}
        />
        <LandingTextField
          label={copy.personaDescriptor.label}
          value={persona.descriptor}
          onChange={value =>
            update(draft => {
              draft.persona.descriptor = value;
            })
          }
          max={LANDING_LIMITS.personaDescriptorMax}
          placeholder={copy.personaDescriptor.placeholder}
        />
        <PersonaImageField
          imageUrl={persona.imageUrl}
          onChange={imageUrl =>
            update(draft => {
              draft.persona.imageUrl = imageUrl;
            })
          }
        />
      </div>
    </LandingBlockPanel>
  );
};
