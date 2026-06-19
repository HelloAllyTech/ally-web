import { FC, useState } from "react";

import { Terminal } from "@icons";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  COPILOT_TERMINAL_STATUSES,
  useCancelCopilotRunMutation,
  useGetAutofillModelsQuery,
  useGetCopilotRunQuery,
  useStartCopilotRunMutation,
} from "@api";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS, en, ROUTES } from "@constants";

import { AgentBuilderSystemSkillPanel } from "./AgentBuilderSystemSkillPanel";
import { CopilotBuildProgress } from "./CopilotBuildProgress";
import { Button } from "../button";
import { DropdownField } from "../dropdown-field";
import { FormLabel } from "../form-label";
import { InputField } from "../input-field";
import { MainAgentPromptPicker } from "../main-agent-prompt-picker";
import { ButtonVariant } from "../types";

const AGENT_DESCRIPTION_FIELD = "agentBuilderDescription";
const MAX_DESCRIPTION_LENGTH = 10000;
const POLL_INTERVAL_MS = 2500;

interface AgentBuilderCopilotProps {
  formMethods: UseFormReturn<any>;
  simulationId?: string;
  /**
   * Kept for API compatibility with the parent (tab switch). The Copilot
   * pipeline now navigates to the built draft scenario on success instead.
   */
  onApplied?: () => void;
}

/**
 * Agent Builder Copilot tab (Create Simulation). The superadmin describes a
 * roleplay actor, picks a skill + model, and clicks Build. That kicks off a
 * server-side pipeline (generate Basic Settings -> run a practice conversation
 * -> evaluate -> refine until it scores well or the round budget runs out).
 * The screen polls the run and shows per-round progress, scores, and the
 * evaluation recommendations; on success it opens the built draft scenario in
 * Basic Settings for review.
 */
export const AgentBuilderCopilot: FC<AgentBuilderCopilotProps> = ({ formMethods }) => {
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [startCopilotRun, { isLoading: isStarting }] = useStartCopilotRunMutation();
  const [cancelCopilotRun, { isLoading: isCancelling }] = useCancelCopilotRunMutation();

  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const [isSkillPanelOpen, setIsSkillPanelOpen] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const modelOptions = allModelOptions.map(model => ({ label: model.label, value: model.value }));

  const description = (formMethods.watch(AGENT_DESCRIPTION_FIELD) as string) ?? "";
  const selectedMainPromptCode =
    (formMethods.watch("selectedMainPromptCode") as string | undefined) ?? undefined;

  // Poll the run while one is active. Stop polling once it reaches a terminal
  // state (RTK Query treats pollingInterval 0 as "do not poll").
  const { data: run } = useGetCopilotRunQuery(runId ?? "", {
    skip: !runId,
    pollingInterval: POLL_INTERVAL_MS,
  });

  const isTerminal = !!run && COPILOT_TERMINAL_STATUSES.includes(run.status);
  const isRunning = !!runId && (!run || !isTerminal);

  const handleBuild = async () => {
    if (isStarting || isRunning) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      toast.error(en.simulation.agentBuilder.emptyDescription);
      return;
    }

    try {
      const { runId: newRunId } = await startCopilotRun({
        brief: trimmedDescription,
        skillPromptCode: selectedMainPromptCode,
        model: selectedModel,
      }).unwrap();
      setRunId(newRunId);
    } catch {
      toast.error(en.simulation.agentBuilder.failedToStart);
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    try {
      await cancelCopilotRun(runId).unwrap();
    } catch {
      // Best-effort: the poll will reflect the eventual state.
    }
  };

  const handleOpenDraft = () => {
    if (run?.draftScenarioId != null) {
      // Hard navigation (not react-router navigate): the CreateSimulation page
      // reads the route :id into state only once on mount, so a client-side
      // route change to the draft's edit URL would not reload the scenario.
      // A full document navigation remounts the page so the built draft loads.
      window.location.assign(ROUTES.EDIT_SIMULATION(run.draftScenarioId));
    }
  };

  const buildLabel = run
    ? en.simulation.agentBuilder.rebuild
    : en.simulation.agentBuilder.build;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl text-typography-900 font-secondary">
          {en.simulation.agentBuilder.heading}
        </h2>
      </div>

      <InputField
        label=""
        id={AGENT_DESCRIPTION_FIELD}
        formMethods={formMethods}
        multiline
        maxLength={MAX_DESCRIPTION_LENGTH}
        minHeight="200"
        placeholder={en.simulation.agentBuilder.descriptionPlaceholder}
        disabled={isRunning}
      />

      <div className="flex flex-col gap-4">
        <MainAgentPromptPicker
          id="selectedMainPromptCode"
          label="Select agent skill version"
          formMethods={formMethods}
          className="w-72 max-w-full"
        />

        <div className="flex flex-col gap-2 w-72 max-w-full">
          <FormLabel>Select AI model for this task</FormLabel>
          <DropdownField
            id="agentBuilderModel"
            label="Select AI model for this task"
            options={modelOptions}
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleBuild}
            disabled={isStarting || isRunning || !description.trim()}
            className="px-4 h-[40px]"
          >
            {isStarting || isRunning ? en.simulation.agentBuilder.building : buildLabel}
          </Button>
          <button
            type="button"
            onClick={() => setIsSkillPanelOpen(true)}
            title={en.simulation.agentBuilder.viewSystemSkill}
            aria-label={en.simulation.agentBuilder.viewSystemSkill}
            className="flex items-center justify-center w-9 h-9 rounded-md text-typography-500 hover:bg-neutral-100 transition-colors"
          >
            <Terminal size={20} />
          </button>
        </div>
      </div>

      {runId && run && (
        <CopilotBuildProgress
          run={run}
          onOpenDraft={handleOpenDraft}
          onCancel={handleCancel}
          isCancelling={isCancelling}
        />
      )}

      <AgentBuilderSystemSkillPanel
        isOpen={isSkillPanelOpen}
        onClose={() => setIsSkillPanelOpen(false)}
      />
    </div>
  );
};
