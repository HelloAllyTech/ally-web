import React, { useState } from "react";

import { Button, TextArea, Tile } from "@ally-ui-mono/ui-shared";
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
      <Tile className="max-w-[92%] w-full">
        <p className="text-sm font-medium text-typography-900">{question.prompt}</p>

        {question.kind === "choice" && (question.options?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {question.options?.map(option => {
              const isChosen = submittedAnswer === option;
              return (
                <Button
                  key={option}
                  kind={isChosen ? "primary" : "tertiary"}
                  size="sm"
                  disabled={answered || disabled}
                  onClick={() => submit(option)}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        ) : answered ? (
          <p className="mt-2 text-sm italic text-typography-700">{submittedAnswer}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <TextArea
              id={`copilot-question-${question.id}`}
              labelText={strings.freeTextPlaceholder}
              hideLabel
              value={freeText}
              onChange={event => setFreeText(event.target.value)}
              placeholder={strings.freeTextPlaceholder}
              disabled={disabled}
              rows={2}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(freeText);
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                kind="primary"
                size="sm"
                disabled={disabled || !freeText.trim()}
                onClick={() => submit(freeText)}
              >
                {strings.submitAnswer}
              </Button>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
};
