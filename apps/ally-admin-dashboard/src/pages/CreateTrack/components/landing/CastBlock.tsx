import { FC } from "react";

import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { LandingBlockPanel, LandingTextField, hintClass, labelClass } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";

export const CastBlock: FC<LandingBlockProps> = ({ page, update }) => {
  const copy = en.courseLanding.cast;
  const callerName = page.persona.name?.trim();

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.cast}
      fallback={en.courseLanding.fallback.cast}
      isOff={!page.cast.enabled}
    >
      <div className="flex flex-col gap-1">
        <span className={labelClass}>{copy.callerName}</span>
        <span className="text-sm text-typography-900" data-testid="landing-caller-name">
          {callerName || copy.callerNameUnset}
        </span>
        {callerName && <span className={hintClass}>{copy.callerNameFromHero}</span>}
      </div>
      <LandingTextField
        label={copy.callerLine.label}
        value={page.cast.callerLine}
        onChange={value => {
          update(draft => {
            draft.cast.callerLine = value;
          });
        }}
        max={LANDING_LIMITS.callerLineMax}
        placeholder={copy.callerLine.placeholder}
        hint={copy.callerLine.hint}
      />

      <div className="flex flex-col gap-4 border-t border-border-light pt-4">
        <h4 className="text-sm font-semibold text-typography-900">{copy.guideHeading}</h4>
        <LandingTextField
          label={copy.guideName.label}
          value={page.cast.guide.name}
          onChange={value => {
            update(draft => {
              draft.cast.guide.name = value;
            });
          }}
          max={LANDING_LIMITS.guideNameMax}
          placeholder={copy.guideName.placeholder}
        />
        <LandingTextField
          label={copy.guideRole.label}
          value={page.cast.guide.role}
          onChange={value => {
            update(draft => {
              draft.cast.guide.role = value;
            });
          }}
          max={LANDING_LIMITS.guideRoleMax}
          placeholder={copy.guideRole.placeholder}
        />
        <LandingTextField
          label={copy.guideLine.label}
          value={page.cast.guide.line}
          onChange={value => {
            update(draft => {
              draft.cast.guide.line = value;
            });
          }}
          max={LANDING_LIMITS.guideLineMax}
          placeholder={copy.guideLine.placeholder}
          multiline
        />
      </div>
    </LandingBlockPanel>
  );
};
