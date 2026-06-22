import { FC, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { useGetAutofillModelsQuery } from "@api";
import { DEFAULT_AUTOFILL_MODEL, en, FALLBACK_AUTOFILL_MODEL_OPTIONS, ROUTES } from "@constants";

import { AgentBuilderSystemSkillPanel } from "./AgentBuilderSystemSkillPanel";
import { CopilotComposer } from "./chat/CopilotComposer";
import { CopilotDetailPanel } from "./chat/CopilotDetailPanel";
import { CopilotFeed, type OpenDetailArgs } from "./chat/CopilotFeed";
import { useCopilotConversation } from "./chat/useCopilotConversation";
import { scoreColor } from "./chat/scoreColor";
import { Button } from "../button";
import { ButtonVariant } from "../types";
import { applyAgentBuilderOutputToForm } from "../../utils/agentBuilderOutput";

const copy = en.simulation.agentBuilder;

interface AgentBuilderCopilotProps {
  formMethods: UseFormReturn<any>;
  simulationId?: string;
  /** Fallback when the built draft has no id to navigate to (rare). */
  onApplied?: () => void;
}

/**
 * Agent Builder Copilot tab (Create Simulation), reshaped into a Claude-Coding-
 * style chat. The superadmin describes a roleplay actor in a bottom-docked
 * composer; their message pins to the feed and the composer greys out while a
 * server-side pipeline (generate → practice conversation → evaluate → refine)
 * streams detailed activity into the feed. Tested rounds expand inline and open
 * a side panel with the transcript + evaluation. Once a run finishes, the
 * composer re-enables to take free-text revision instructions, which re-run the
 * build & test loop on the same draft — all in one continuous conversation.
 */
export const AgentBuilderCopilot: FC<AgentBuilderCopilotProps> = ({ formMethods, onApplied }) => {
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const [isSkillPanelOpen, setIsSkillPanelOpen] = useState(false);
  const [detail, setDetail] = useState<OpenDetailArgs | null>(null);

  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const modelOptions = allModelOptions.map(model => ({ label: model.label, value: model.value }));

  const { run, feed, phase, isRunning, pendingMessage, submit, revise, cancel } =
    useCopilotConversation();

  const composerMode = phase === "terminal" ? "revise" : "brief";

  const handleSubmit = (text: string): Promise<boolean> =>
    composerMode === "revise"
      ? revise(text)
      : submit(text, {
          skillPromptCode:
            (formMethods.watch("selectedMainPromptCode") as string | undefined) ?? undefined,
          model: selectedModel,
        });

  const handleApply = () => {
    if (run?.draftScenarioId != null) {
      // Hard navigation: CreateSimulation reads the route :id only once on mount,
      // so a full document load is needed to open the built draft.
      window.location.assign(ROUTES.EDIT_SIMULATION(run.draftScenarioId));
      return;
    }
    if (run?.bestFieldValues) {
      applyAgentBuilderOutputToForm(run.bestFieldValues as Record<string, unknown>, formMethods);
    }
    onApplied?.();
  };

  const showApplyBar =
    phase === "terminal" &&
    run != null &&
    (run.status === "SUCCEEDED" || run.status === "FAILED") &&
    (run.draftScenarioId != null || run.bestFieldValues != null);
  const succeeded = run?.status === "SUCCEEDED";

  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[520px] flex-col">
      <CopilotFeed feed={feed} pendingMessage={pendingMessage} onOpenDetail={setDetail} />

      {showApplyBar && (
        <div
          className={`mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-md border px-4 py-3 ${
            succeeded ? "border-success-200 bg-success-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <span className="flex items-center gap-2 text-sm text-typography-900">
            {run?.bestScore != null && (
              <span
                className="inline-flex h-6 min-w-[36px] items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
                style={{ backgroundColor: scoreColor(run.bestScore) }}
              >
                {run.bestScore}
              </span>
            )}
            {succeeded ? copy.applyReadyLabel : copy.applyBestSoFarLabel}
          </span>
          <Button variant={ButtonVariant.PRIMARY} onClick={handleApply} className="h-9 shrink-0 px-4">
            {copy.reviewAndApply}
          </Button>
        </div>
      )}

      <CopilotComposer
        mode={composerMode}
        disabled={isRunning}
        isRunning={isRunning}
        formMethods={formMethods}
        model={selectedModel}
        onModelChange={setSelectedModel}
        modelOptions={modelOptions}
        onSubmit={handleSubmit}
        onCancel={cancel}
        onOpenSkillPanel={() => setIsSkillPanelOpen(true)}
      />

      <AgentBuilderSystemSkillPanel
        isOpen={isSkillPanelOpen}
        onClose={() => setIsSkillPanelOpen(false)}
      />

      {detail && (
        <CopilotDetailPanel
          reportId={detail.reportId}
          reportMarkdown={detail.reportMarkdown}
          metrics={detail.metrics}
          score={detail.score}
          round={detail.round}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
};
