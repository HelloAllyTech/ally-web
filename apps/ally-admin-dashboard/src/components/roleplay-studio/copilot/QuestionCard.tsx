import React, { useState } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { CopilotQuestionEvent } from "@src/types/roleplayStudio";

interface QuestionCardProps {
  question: CopilotQuestionEvent;
  /** On resume: the answer the trainer already gave (locks the card). */
  answeredWith?: string;
  /** Answering sends a normal next chat message, tagged with the question id. */
  onAnswer: (answer: string, questionId: string) => void;
  disabled?: boolean;
}

/**
 * Structured `question` SSE events render as an answer card: choice questions
 * get one button per option, free-text questions get a small inline composer.
 * Once answered the card locks, showing the chosen answer (also on resume).
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  answeredWith,
  onAnswer,
  disabled = false,
}) => {
  const [freeText, setFreeText] = useState("");
  const strings = en.roleplayStudio.copilot;
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(answeredWith ?? null);

  const answered = submittedAnswer !== null;

  const submit = (answer: string) => {
    const trimmed = answer.trim();
    if (!trimmed || answered || disabled) return;
    setSubmittedAnswer(trimmed);
    onAnswer(trimmed, question.id);
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] w-full rounded-xl border border-primary-200 bg-primary-50/40 px-4 py-3">
        <p className="text-sm font-medium text-typography-900">{question.prompt}</p>

        {question.kind === "choice" && (question.options?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {question.options?.map(option => {
              const isChosen = submittedAnswer === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={answered || disabled}
                  onClick={() => submit(option)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isChosen
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-border-light bg-white text-typography-900 hover:border-primary-300"
                  } ${answered && !isChosen ? "opacity-50" : ""} disabled:cursor-not-allowed`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : answered ? (
          <p className="mt-2 text-sm italic text-typography-700">{submittedAnswer}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <AutoExpandableTextarea
              value={freeText}
              onChange={setFreeText}
              placeholder={strings.freeTextPlaceholder}
              disabled={disabled}
              minHeight={40}
              maxLines={6}
              className="w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-primary-500"
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(freeText);
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                variant={ButtonVariant.PRIMARY}
                className="h-[32px] px-3 text-sm"
                disabled={disabled || !freeText.trim()}
                onClick={() => submit(freeText)}
              >
                {strings.submitAnswer}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
