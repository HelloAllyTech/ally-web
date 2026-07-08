import React from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  AutoExpandableTextarea,
  DropdownField as SharedDropdownField,
} from "@ally-ui-mono/ui-shared";
import { FormLabel } from "@components";
import { DIFFICULTY_LEVEL_OPTIONS, en } from "@constants";
import { selectRoleplaySpec, setDifficulty, setOpeningStatement } from "@reducer";

import { DisclosureLedgerSection } from "./DisclosureLedgerSection";
import { EngineeredEventsSection } from "./EngineeredEventsSection";
import { NaturalnessSettingsSection } from "./NaturalnessSettingsSection";
import { PersonaBibleSection } from "./PersonaBibleSection";
import { RubricSection } from "./RubricSection";
import { SpecSectionCard } from "./SpecSectionCard";
import { VoiceLanguageSection } from "./VoiceLanguageSection";

interface SpecPanelProps {
  /** Read-only during the interview step; editable on the spec step. */
  readOnly?: boolean;
}

/**
 * Stacked live view of the spec document. Every section is wrapped in a
 * SpecPatchFlash so streamed copilot patches visibly light up the parts of
 * the spec they touched.
 */
export const SpecPanel: React.FC<SpecPanelProps> = ({ readOnly = false }) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  if (!spec) return null;

  const difficultyLabel =
    DIFFICULTY_LEVEL_OPTIONS.find(option => option.value === spec.difficulty)?.label ??
    spec.difficulty ??
    "";

  return (
    <div className="flex flex-col gap-4 pb-6" data-testid="roleplay-spec-panel">
      <SpecSectionCard
        title={strings.openingStatement}
        sections={["openingStatement", "difficulty", "title"]}
      >
        <div className="flex flex-col gap-4">
          <AutoExpandableTextarea
            value={spec.openingStatement}
            onChange={value => dispatch(setOpeningStatement(value))}
            placeholder={strings.openingStatement}
            disabled={readOnly}
            minHeight={48}
            maxLines={8}
            className="w-full rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
          />
          <div className="flex flex-col gap-2">
            <FormLabel>{strings.difficulty}</FormLabel>
            <div className="w-48">
              <SharedDropdownField
                options={DIFFICULTY_LEVEL_OPTIONS.map(option => option.label)}
                value={difficultyLabel}
                onChange={label => {
                  const option = DIFFICULTY_LEVEL_OPTIONS.find(item => item.label === label);
                  if (option) dispatch(setDifficulty(option.value));
                }}
                label=""
                disabled={readOnly}
                valueClassName="font-primary text-base text-typography-700"
              />
            </div>
          </div>
        </div>
      </SpecSectionCard>

      <PersonaBibleSection persona={spec.persona} readOnly={readOnly} />
      <DisclosureLedgerSection ledger={spec.disclosureLedger} readOnly={readOnly} />
      <RubricSection rubric={spec.rubric} readOnly={readOnly} />
      <EngineeredEventsSection events={spec.engineeredEvents} readOnly={readOnly} />
      <VoiceLanguageSection voice={spec.voice} language={spec.language} readOnly={readOnly} />
      <NaturalnessSettingsSection readOnly={readOnly} />
    </div>
  );
};
