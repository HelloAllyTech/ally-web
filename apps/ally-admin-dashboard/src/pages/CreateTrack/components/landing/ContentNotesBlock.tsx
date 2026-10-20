import { FC } from "react";

import { Locked } from "@assets";
import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { LandingBlockPanel, LandingTextField } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";

export const ContentNotesBlock: FC<LandingBlockProps> = ({ page, update }) => {
  const copy = en.courseLanding.contentNotes;

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.contentNotes}
      fallback={en.courseLanding.fallback.contentNotes}
      intro={
        <span className="inline-flex items-start gap-1.5">
          <Locked className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          {copy.explainer}
        </span>
      }
    >
      <LandingTextField
        label={copy.extraNote.label}
        value={page.contentNotes.extraNote}
        onChange={value => {
          update(draft => {
            draft.contentNotes.extraNote = value;
          });
        }}
        max={LANDING_LIMITS.extraNoteMax}
        placeholder={copy.extraNote.placeholder}
        hint={copy.extraNote.hint}
        multiline
      />
    </LandingBlockPanel>
  );
};
