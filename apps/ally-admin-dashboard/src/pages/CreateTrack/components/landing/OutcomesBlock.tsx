import { FC } from "react";

import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { LandingBlockPanel, LandingTextField } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";

const SLOTS = Array.from({ length: LANDING_LIMITS.outcomesMax }, (_, index) => index);

export const OutcomesBlock: FC<LandingBlockProps> = ({ page, update }) => {
  const copy = en.courseLanding.outcomes;

  const setItem = (index: number, value: string | null) =>
    update(draft => {
      const items = [...draft.outcomes.items];
      while (items.length < LANDING_LIMITS.outcomesMax) items.push("");
      items[index] = value ?? "";
      // Trailing blanks go; a blank in the middle stays so the other two inputs keep their place.
      while (items.length > 0 && items[items.length - 1].trim() === "") items.pop();
      draft.outcomes.items = items;
    });

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.outcomes}
      fallback={en.courseLanding.fallback.outcomes}
      isOff={!page.outcomes.enabled}
      intro={copy.helper}
    >
      {SLOTS.map(index => (
        <LandingTextField
          key={index}
          label={copy.itemLabel(index + 1)}
          value={page.outcomes.items[index] || null}
          onChange={value => setItem(index, value)}
          max={LANDING_LIMITS.outcomeMax}
          placeholder={copy.placeholders[index]}
        />
      ))}
    </LandingBlockPanel>
  );
};
