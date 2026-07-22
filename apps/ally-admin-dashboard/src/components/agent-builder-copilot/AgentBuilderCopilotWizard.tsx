import { useState } from "react";

import { CheckCircle, FailIcon } from "@icons";
import { UseFormReturn } from "react-hook-form";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useGetAgentTestCasesQuery } from "@api";

import { Button } from "../button";
import { Competency } from "../competency";
import { ButtonVariant } from "../types";
import {
  GenerationTask,
  GenerationTaskStatus,
  useAgentBuilderGeneration,
} from "./useAgentBuilderGeneration";

/**
 * Chat-style wizard on the RIGHT half of the "Agent Builder Copilot" tab.
 *
 * Flow:
 *   1. "Describe roleplay actor"   — long free-text input
 *   2. "Select one competency"     — the shared Basic Settings competency dropdown
 *   3. "Select agent test cases" — multi-select from the live catalog
 *   4. Generation                  — on submit, the copilot combines the three
 *      inputs and fires ONE LLM call per Basic Settings field IN PARALLEL. Each
 *      result is parsed and painted into the mirrored Basic Settings form on the
 *      LEFT the moment it returns; the chat here streams per-task logs. The user
 *      can Stop at any time (native request abort).
 *
 * All field writes flow through the shared `formMethods`, so the left pane and
 * the Basic Settings tab stay in sync automatically.
 */

type WizardStepId = "describe" | "competency" | "goals" | "generate";

const QUESTIONS: Record<Exclude<WizardStepId, "generate">, string> = {
  describe: "Describe roleplay actor",
  competency: "Select one competency",
  goals: "Select agent test cases",
};

interface ChatEntry {
  question: string;
  answer: string;
}

interface AgentBuilderCopilotWizardProps {
  // Shared react-hook-form instance — the competency pick + generated values
  // all write here, keeping the Basic Settings tab in sync.
  formMethods: UseFormReturn<any>;
}

const Spinner = () => (
  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent" />
);

const TaskStatusIcon = ({ status }: { status: GenerationTaskStatus }) => {
  if (status === "active") return <Spinner />;
  if (status === "done") return <CheckCircle size={16} className="shrink-0 text-[#43A047]" />;
  if (status === "error") return <FailIcon size={16} className="shrink-0 text-[#FE6F64]" />;
  // empty / aborted — muted dash.
  return <span className="inline-block h-4 w-4 shrink-0 text-center text-typography-400">–</span>;
};

const taskNote = (task: GenerationTask): string | null => {
  if (task.status === "error") return task.error || "generation failed";
  if (task.status === "empty") return "no content generated";
  if (task.status === "aborted") return "cancelled";
  return null;
};

export const AgentBuilderCopilotWizard: React.FC<AgentBuilderCopilotWizardProps> = ({
  formMethods,
}) => {
  const [step, setStep] = useState<WizardStepId>("describe");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [description, setDescription] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const { data: goalsData, isLoading: isLoadingGoals } = useGetAgentTestCasesQuery();
  const goalOptions = goalsData?.data ?? [];

  const { phase, tasks, start, abort, reset, doneCount, appliedCount } =
    useAgentBuilderGeneration(formMethods);

  const pushHistory = (question: string, answer: string) =>
    setHistory(prev => [...prev, { question, answer }]);

  const handleDescribeNext = () => {
    if (!description.trim()) return;
    pushHistory(QUESTIONS.describe, description.trim());
    setStep("competency");
  };

  const handleCompetencyNext = () => {
    const competency = formMethods.getValues("competency");
    if (!competency?.name) return;
    pushHistory(QUESTIONS.competency, competency.name);
    setStep("goals");
  };

  const toggleGoal = (goalId: string) =>
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId],
    );

  const handleGenerate = () => {
    if (selectedGoals.length === 0) return;
    const selected = goalOptions.filter(goal => selectedGoals.includes(goal.id));
    const goalTitles = selected.map(goal => goal.title);
    pushHistory(QUESTIONS.goals, goalTitles.join(", "));

    // Persist the selection on the scenario (rides the normal save payload →
    // scenarios.metadata.agentTestCaseIds) and steer every field prompt.
    formMethods.setValue("agentTestCaseIds", selectedGoals, { shouldDirty: true });

    setStep("generate");
    start({
      actorDescription: description.trim(),
      competency: formMethods.getValues("competency")?.name,
      agentTestCases: goalTitles.join(", "),
    });
  };

  const handleStartOver = () => {
    reset();
    setHistory([]);
    setDescription("");
    setSelectedGoals([]);
    setStep("describe");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Conversation area — answered questions + live generation logs. */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-4">
        {history.length === 0 && step === "describe" && (
          <div className="self-start max-w-[90%] rounded-lg bg-background-secondary px-4 py-2 text-sm text-typography-700">
            Answer three quick questions and I&apos;ll generate the Basic Settings on the left in
            parallel — each field fills in as it&apos;s ready, and you can stop anytime.
          </div>
        )}

        {history.map((entry, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="self-start max-w-[85%] rounded-lg bg-background-secondary px-4 py-2 text-sm text-typography-800">
              {entry.question}
            </div>
            <div className="self-end max-w-[85%] rounded-lg bg-primary-50 px-4 py-2 text-sm text-typography-900 whitespace-pre-wrap">
              {entry.answer}
            </div>
          </div>
        ))}

        {step === "generate" && (
          <div className="flex flex-col gap-3">
            {/* Per-task progress block. */}
            <div className="rounded-md border border-border-light bg-neutral-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-typography-800">
                {phase === "running" ? (
                  <Spinner />
                ) : (
                  <CheckCircle size={16} className="text-[#43A047]" />
                )}
                Generating settings ({doneCount}/{tasks.length})
              </div>
              <div className="mt-2 flex flex-col gap-0.5 pl-1">
                {tasks.map(task => {
                  const note = taskNote(task);
                  return (
                    <div key={task.field} className="flex items-center gap-2 py-1 text-sm">
                      <TaskStatusIcon status={task.status} />
                      <span
                        className={
                          task.status === "error"
                            ? "text-[#FE6F64]"
                            : task.status === "empty" || task.status === "aborted"
                              ? "text-typography-500"
                              : "text-typography-800"
                        }
                      >
                        {task.label}
                      </span>
                      {note && <span className="text-xs text-typography-500">· {note}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terminal banner. */}
            {phase === "done" && (
              <div className="rounded-md border border-success-200 bg-success-50 p-3 text-sm text-typography-900">
                Filled {appliedCount} of {tasks.length} fields — review them in Basic Settings on
                the left, then Save or Publish.
              </div>
            )}
            {phase === "aborted" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-typography-900">
                Generation stopped. Fields that finished before you stopped were kept — review them
                on the left.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom composer — the active question, or the generation controls. */}
      <div className="shrink-0 border-t border-border-light pt-4 flex flex-col gap-3">
        {step === "describe" && (
          <>
            <h3 className="text-base font-medium text-typography-900">{QUESTIONS.describe}</h3>
            <AutoExpandableTextarea
              value={description}
              onChange={setDescription}
              placeholder="Describe the person the AI should role-play — who they are, their background, what's bringing them to this session, how they speak and behave..."
              minHeight={96}
              maxLines={12}
              className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
            />
            <div className="flex justify-end">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleDescribeNext}
                disabled={!description.trim()}
                className="h-[40px] px-6"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {step === "competency" && (
          <>
            <h3 className="text-base font-medium text-typography-900">{QUESTIONS.competency}</h3>
            <Competency
              id="competency"
              formMethods={formMethods}
              label="Select one competency"
              isMandatory
              dropUp
            />
            <div className="flex justify-end">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleCompetencyNext}
                className="h-[40px] px-6"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {step === "goals" && (
          <>
            <h3 className="text-base font-medium text-typography-900">{QUESTIONS.goals}</h3>
            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {isLoadingGoals ? (
                <p className="text-sm text-typography-700">Loading agent test cases…</p>
              ) : goalOptions.length === 0 ? (
                <p className="text-sm text-typography-700">
                  No agent test cases configured yet. Add some under the Agent Test Cases tab.
                </p>
              ) : (
                goalOptions.map(goal => {
                  const checked = selectedGoals.includes(goal.id);
                  return (
                    <label
                      key={goal.id}
                      className={`flex items-start gap-3 rounded border px-3 py-2 cursor-pointer transition-colors ${
                        checked
                          ? "border-primary bg-primary-50"
                          : "border-border-light hover:bg-background-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGoal(goal.id)}
                        className="accent-primary mt-1"
                      />
                      <span className="flex flex-col">
                        <span className="text-sm text-typography-900">{goal.title}</span>
                        <span className="text-xs text-typography-600">{goal.tags?.join(", ")}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleGenerate}
                disabled={selectedGoals.length === 0}
                className="h-[40px] px-6"
              >
                Generate
              </Button>
            </div>
          </>
        )}

        {step === "generate" && (
          <div className="flex justify-end">
            {phase === "running" ? (
              <Button variant={ButtonVariant.SECONDARY} onClick={abort} className="h-[40px] px-6">
                Stop generating
              </Button>
            ) : (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={handleStartOver}
                className="h-[40px] px-6"
              >
                Start over
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
