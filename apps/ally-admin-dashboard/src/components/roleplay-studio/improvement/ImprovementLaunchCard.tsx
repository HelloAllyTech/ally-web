import React, { useState } from "react";

import { toast } from "sonner";

import { useGetAgentTestCasesQuery, useStartImprovementRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

import { TestCaseSelect } from "../rehearsal/TestCaseSelect";

interface ImprovementLaunchCardProps {
  specId: string;
  versionId: string;
  /** A RUNNING run blocks a new launch. */
  hasActiveRun: boolean;
}

/**
 * Auto-improve launch config: stop targets (min overall + all-tests-pass),
 * max rounds, cheap-intermediate-rounds toggle, and the agent test cases the
 * loop optimizes against.
 */
export const ImprovementLaunchCard: React.FC<ImprovementLaunchCardProps> = ({
  specId,
  versionId,
  hasActiveRun,
}) => {
  const strings = en.roleplayStudio.improvement;
  const [startRun, { isLoading }] = useStartImprovementRunMutation();
  const { data: testCasesData, isLoading: isLoadingTestCases } = useGetAgentTestCasesQuery();
  const testCases = testCasesData?.data ?? [];

  const [maxRounds, setMaxRounds] = useState(3);
  const [minOverall, setMinOverall] = useState(70);
  const [requireAllTestCasesPass, setRequireAllTestCasesPass] = useState(true);
  const [cheapIntermediateRounds, setCheapIntermediateRounds] = useState(true);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<string[]>([]);

  const handleStart = async () => {
    try {
      await startRun({
        specId,
        versionId,
        maxRounds,
        targets: { minOverall, requireAllTestCasesPass },
        agentTestCaseIds: selectedTestCaseIds,
        cheapIntermediateRounds,
      }).unwrap();
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(message || strings.launchFailed);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h3 className="text-base font-medium text-typography-900">{strings.launchTitle}</h3>
      <p className="mt-1 text-sm text-typography-700">{strings.launchSubtitle}</p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-typography-800">
          {strings.maxRounds}
          <input
            type="number"
            min={1}
            max={6}
            value={maxRounds}
            onChange={event => setMaxRounds(Number(event.target.value) || 3)}
            className="h-9 rounded-md border border-border-light px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-typography-800">
          {strings.minOverall}
          <input
            type="number"
            min={0}
            max={100}
            value={minOverall}
            onChange={event => setMinOverall(Number(event.target.value) || 0)}
            className="h-9 rounded-md border border-border-light px-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-typography-800">
          <input
            type="checkbox"
            checked={requireAllTestCasesPass}
            onChange={event => setRequireAllTestCasesPass(event.target.checked)}
          />
          {strings.requireAllTestCasesPass}
        </label>
        <label className="flex items-start gap-2 text-sm text-typography-800">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={cheapIntermediateRounds}
            onChange={event => setCheapIntermediateRounds(event.target.checked)}
          />
          <span>
            {strings.cheapIntermediateRounds}
            <span className="block text-xs text-typography-600">
              {strings.cheapIntermediateRoundsHelp}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4">
        <TestCaseSelect
          testCases={testCases}
          selectedIds={selectedTestCaseIds}
          onChange={setSelectedTestCaseIds}
          isLoading={isLoadingTestCases}
          disabled={isLoading || hasActiveRun}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant={ButtonVariant.PRIMARY}
          className="h-[36px] px-4 text-sm"
          onClick={handleStart}
          disabled={isLoading || hasActiveRun}
          title={hasActiveRun ? strings.activeRunBlocks : undefined}
        >
          {isLoading ? strings.starting : strings.start}
        </Button>
      </div>
    </div>
  );
};
