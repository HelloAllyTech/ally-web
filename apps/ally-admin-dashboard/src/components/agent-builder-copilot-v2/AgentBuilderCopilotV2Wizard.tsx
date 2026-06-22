import { useState } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useGetOptimisationGoalsQuery } from "@api";

import { Button } from "../button";
import { Competency } from "../competency";
import { ButtonVariant } from "../types";

/**
 * Chat-style wizard shown on the LEFT half of the "Agent Builder Copilot V2"
 * tab. Questions are surfaced one at a time at the bottom of the panel; once
 * answered, the question + answer scroll up into the conversation area above
 * (like a chat thread) and the next question's input replaces the one below.
 *
 * Step order:
 *   1. "Describe roleplay actor"   — long free-text input
 *   2. "Select one competency"     — the SAME competency dropdown used on the
 *                                     Basic Settings tab (bound to the shared
 *                                     `formMethods`, so the pick also lands on
 *                                     the mirrored Basic Settings form)
 *   3. "Select optimisation goals" — multi-select (illustrative options for now)
 */

type WizardStepId = "describe" | "competency" | "goals" | "done";

const QUESTIONS: Record<Exclude<WizardStepId, "done">, string> = {
  describe: "Describe roleplay actor",
  competency: "Select one competency",
  goals: "Select optimisation goals",
};

interface ChatEntry {
  question: string;
  answer: string;
}

interface AgentBuilderCopilotV2WizardProps {
  // Shared react-hook-form instance — the competency pick writes here so it
  // stays in sync with the Basic Settings tab.
  formMethods: any;
}

export const AgentBuilderCopilotV2Wizard: React.FC<AgentBuilderCopilotV2WizardProps> = ({
  formMethods,
}) => {
  const [step, setStep] = useState<WizardStepId>("describe");
  const [history, setHistory] = useState<ChatEntry[]>([]);

  // Optimisation goals are managed under the superadmin "Optimisation Goals"
  // tab and fetched here so the wizard always reflects the live catalog.
  const { data: goalsData, isLoading: isLoadingGoals } = useGetOptimisationGoalsQuery();
  const goalOptions = goalsData?.data ?? [];

  // Per-step working input.
  const [description, setDescription] = useState("");
  // Holds selected optimisation-goal ids.
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

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

  const handleGoalsNext = () => {
    if (selectedGoals.length === 0) return;
    const titles = goalOptions
      .filter(goal => selectedGoals.includes(goal.id))
      .map(goal => goal.title);
    pushHistory(QUESTIONS.goals, titles.join(", "));
    setStep("done");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Conversation area — answered questions scroll up here, chat-style. */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-4">
        {history.map((entry, index) => (
          <div key={index} className="flex flex-col gap-2">
            {/* Question (assistant) bubble, left-aligned. */}
            <div className="self-start max-w-[85%] rounded-lg bg-background-secondary px-4 py-2 text-sm text-typography-800">
              {entry.question}
            </div>
            {/* Answer (user) bubble, right-aligned. */}
            <div className="self-end max-w-[85%] rounded-lg bg-primary-50 px-4 py-2 text-sm text-typography-900 whitespace-pre-wrap">
              {entry.answer}
            </div>
          </div>
        ))}
        {step === "done" && (
          <div className="self-start max-w-[85%] rounded-lg bg-background-secondary px-4 py-2 text-sm text-typography-800">
            All set — your answers are captured above.
          </div>
        )}
      </div>

      {/* Active question, pinned to the bottom like a chat composer. */}
      {step !== "done" && (
        <div className="shrink-0 border-t border-border-light pt-4 flex flex-col gap-3">
          <h3 className="text-base font-medium text-typography-900">{QUESTIONS[step]}</h3>

          {step === "describe" && (
            <>
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
              {/* Reuses the Basic Settings competency dropdown, same options. */}
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
              <div className="flex flex-col gap-2">
                {isLoadingGoals ? (
                  <p className="text-sm text-typography-700">Loading optimisation goals…</p>
                ) : goalOptions.length === 0 ? (
                  <p className="text-sm text-typography-700">
                    No optimisation goals configured yet. Add some under the Optimisation Goals tab.
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
                          <span className="text-xs text-typography-600">{goal.category}</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={handleGoalsNext}
                  disabled={selectedGoals.length === 0}
                  className="h-[40px] px-6"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
