import React from "react";

import { useDispatch, useSelector } from "react-redux";

import { CarbonDropdown, Stack, Tag, TextArea } from "@ally-ui-mono/ui-shared";
import { DIFFICULTY_LEVEL_OPTIONS, en } from "@constants";
import { selectRoleplaySpec, setDifficulty, setOpeningStatement } from "@reducer";

import { AgentTestCasesSection } from "./AgentTestCasesSection";
import { DisclosureLedgerSection } from "./DisclosureLedgerSection";
import { EngineeredEventsSection } from "./EngineeredEventsSection";
import { NaturalnessSettingsSection } from "./NaturalnessSettingsSection";
import { PersonaBibleSection } from "./PersonaBibleSection";
import { RubricSection } from "./RubricSection";
import { SpecSectionCard } from "./SpecSectionCard";
import { SpecValue } from "./SpecField";
import { VoiceLanguageSection } from "./VoiceLanguageSection";

interface SpecPanelProps {
  /**
   * When true, every field renders disabled (the spec is copilot-driven) —
   * except the voice-naturalness toggles, which stay trainer-editable.
   */
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
        <Stack gap={5}>
          {readOnly ? (
            <SpecValue label={strings.openingStatement} value={spec.openingStatement} />
          ) : (
            <TextArea
              id="roleplay-opening-statement"
              labelText={strings.openingStatement}
              value={spec.openingStatement}
              onChange={event => dispatch(setOpeningStatement(event.target.value))}
              rows={3}
            />
          )}

          {readOnly ? (
            <SpecValue
              label={strings.difficulty}
              value={difficultyLabel ? <Tag type="cool-gray">{difficultyLabel}</Tag> : undefined}
              isEmpty={!difficultyLabel}
            />
          ) : (
            <div className="w-48">
              <CarbonDropdown
                id="roleplay-difficulty"
                titleText={strings.difficulty}
                label={strings.difficulty}
                items={DIFFICULTY_LEVEL_OPTIONS.map(option => option.label)}
                selectedItem={difficultyLabel}
                onChange={({ selectedItem }) => {
                  const option = DIFFICULTY_LEVEL_OPTIONS.find(item => item.label === selectedItem);
                  if (option) dispatch(setDifficulty(option.value));
                }}
              />
            </div>
          )}
        </Stack>
      </SpecSectionCard>

      <PersonaBibleSection persona={spec.persona} readOnly={readOnly} />
      <DisclosureLedgerSection ledger={spec.disclosureLedger} readOnly={readOnly} />
      <RubricSection rubric={spec.rubric} readOnly={readOnly} />
      {/* Agent test cases are the trainer's to choose (which behavioral checks
          the rehearsal runs against), so this stays editable even when the rest
          of the spec is read-only. */}
      <AgentTestCasesSection agentTestCaseIds={spec.agentTestCaseIds} />
      <EngineeredEventsSection events={spec.engineeredEvents} readOnly={readOnly} />
      <VoiceLanguageSection voice={spec.voice} language={spec.language} readOnly={readOnly} />
      {/* Voice-naturalness toggles stay trainer-editable even when the rest of
          the spec is view-only — these are realism levers the trainer tunes
          directly rather than through the copilot. */}
      <NaturalnessSettingsSection />
    </div>
  );
};
