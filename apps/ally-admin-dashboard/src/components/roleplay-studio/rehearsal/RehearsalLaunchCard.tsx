import React, { useEffect, useRef, useState } from "react";

import { ArrowDown } from "@icons";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { useCreateRoleplayRehearsalMutation, useGetAgentTestCasesQuery } from "@api";
import { Button, ToggleSwitch } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { selectRoleplaySpecState } from "@reducer";
import { RoleplayTraineeProfile } from "@src/types/roleplayStudio";

import { TestCaseSelect } from "./TestCaseSelect";

const ALL_PROFILES: RoleplayTraineeProfile[] = ["SKILLED", "POOR", "ADVERSARIAL"];
const DEFAULT_TURNS = 8;
const MIN_TURNS = 2;
const MAX_TURNS = 30;
/** Mirrors the BE's REHEARSAL_MAX_UNITS (profiles + test cases per run). */
const MAX_TOTAL_UNITS = 12;

/**
 * Clamp the raw input to [MIN_TURNS, MAX_TURNS]. Applied on blur + at submit,
 * NOT per-keystroke — clamping every keystroke to MIN would rewrite the '1' in
 * "15" to "2", making every value 10-19 impossible to type.
 */
const clampTurns = (raw: string): number => {
  const parsed = Math.floor(Number(raw));
  if (Number.isNaN(parsed)) return DEFAULT_TURNS;
  return Math.min(MAX_TURNS, Math.max(MIN_TURNS, parsed));
};

interface RehearsalLaunchCardProps {
  specId: string;
  versionId: string;
}

/**
 * Profile toggles + turns-per-profile input + agent test-case multi-select;
 * POSTs a new rehearsal run. A run needs at least one unit (profile OR test
 * case) and at most MAX_TOTAL_UNITS in total.
 */
export const RehearsalLaunchCard: React.FC<RehearsalLaunchCardProps> = ({ specId, versionId }) => {
  const strings = en.roleplayStudio.rehearsal;
  const { spec } = useSelector(selectRoleplaySpecState);
  const [createRehearsal, { isLoading }] = useCreateRoleplayRehearsalMutation();
  const { data: testCasesData, isLoading: isLoadingTestCases } = useGetAgentTestCasesQuery();
  const testCases = testCasesData?.data ?? [];

  const [profiles, setProfiles] = useState<Record<RoleplayTraineeProfile, boolean>>({
    SKILLED: true,
    POOR: true,
    ADVERSARIAL: true,
  });
  const [turnsInput, setTurnsInput] = useState(String(DEFAULT_TURNS));
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);
  const [testCasesExpanded, setTestCasesExpanded] = useState(false);

  // Pre-seed the selection ONCE from the spec's agentTestCaseIds, dropping ids
  // no longer in the live library (it is hard-deleted). Never re-seed after —
  // user edits must win over later spec/library refetches.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !testCasesData || !spec) return;
    seededRef.current = true;
    const specIds = spec.agentTestCaseIds ?? [];
    if (specIds.length === 0) return;
    const libraryIds = new Set(testCasesData.data.map(testCase => testCase.id));
    const seeded = specIds.filter(id => libraryIds.has(id));
    if (seeded.length > 0) setSelectedTestCaseIds(seeded);
  }, [testCasesData, spec]);

  const selectedProfiles = ALL_PROFILES.filter(profile => profiles[profile]);
  const totalUnits = selectedProfiles.length + selectedTestCaseIds.length;
  const canStart = totalUnits >= 1 && totalUnits <= MAX_TOTAL_UNITS;

  const handleStart = async () => {
    if (totalUnits === 0) {
      toast.error(strings.selectAtLeastOneUnit);
      return;
    }
    try {
      await createRehearsal({
        specId,
        versionId,
        traineeProfiles: selectedProfiles,
        turnsPerProfile: clampTurns(turnsInput),
        agentTestCaseIds: selectedTestCaseIds,
        languageId:
          spec?.language?.languageId != null ? Number(spec.language.languageId) : undefined,
      }).unwrap();
    } catch {
      toast.error(strings.launchFailed);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h3 className="text-base font-medium text-typography-900">{strings.launchTitle}</h3>
      <p className="mt-0.5 text-sm text-typography-700">{strings.launchSubtitle}</p>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-typography-900">{strings.traineeProfiles}</span>
          <div className="flex items-center gap-5">
            {ALL_PROFILES.map(profile => (
              <label key={profile} className="flex items-center gap-2 text-sm text-typography-800">
                <ToggleSwitch
                  enabled={profiles[profile]}
                  onChange={enabled => setProfiles(prev => ({ ...prev, [profile]: enabled }))}
                  label={strings.profiles[profile]}
                  disabled={isLoading}
                />
                {strings.profiles[profile]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-typography-900">
          {strings.turnsPerProfile}
          <input
            type="number"
            min={MIN_TURNS}
            max={MAX_TURNS}
            value={turnsInput}
            disabled={isLoading}
            onChange={event => setTurnsInput(event.target.value)}
            onBlur={() => setTurnsInput(String(clampTurns(turnsInput)))}
            className="w-24 rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <Button
          variant={ButtonVariant.PRIMARY}
          className="h-[40px] px-5"
          onClick={handleStart}
          disabled={isLoading || !canStart}
        >
          {isLoading ? strings.starting : strings.start}
        </Button>
      </div>

      <div className="mt-4 border-t border-border-light pt-3">
        <button
          type="button"
          onClick={() => setTestCasesExpanded(expanded => !expanded)}
          aria-expanded={testCasesExpanded}
          data-testid="test-cases-toggle"
          className="flex w-full items-center gap-2 text-left"
        >
          <ArrowDown
            size={16}
            className={`shrink-0 text-typography-600 transition-transform ${
              testCasesExpanded ? "rotate-180" : ""
            }`}
          />
          <span className="text-sm text-typography-900">{strings.testCases}</span>
          {!testCasesExpanded && selectedTestCaseIds.length > 0 && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-500">
              {strings.testCasesSelected(selectedTestCaseIds.length)}
            </span>
          )}
        </button>

        {testCasesExpanded && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-typography-600">{strings.testCasesHint}</p>
            <TestCaseSelect
              testCases={testCases}
              selectedIds={selectedTestCaseIds}
              onChange={setSelectedTestCaseIds}
              isLoading={isLoadingTestCases}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
