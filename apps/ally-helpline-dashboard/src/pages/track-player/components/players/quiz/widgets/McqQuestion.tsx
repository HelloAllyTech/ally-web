import { FC } from "react";

import { useTranslation } from "react-i18next";

import { SanitizedQuizQuestion } from "@types";

import { QuizAnswerState } from "../quizAnswerState";

interface McqQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/** Multiple-choice question — radio for mcq_single, checkbox for mcq_multi. */
export const McqQuestion: FC<McqQuestionProps> = ({ question, state, onChange }) => {
  const { t } = useTranslation();
  const isMulti = question.type === "mcq_multi";
  const selected = state.selectedOptionIds ?? [];

  const toggle = (optionId: string) => {
    if (isMulti) {
      const next = selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId];
      onChange({ selectedOptionIds: next });
    } else {
      onChange({ selectedOptionIds: [optionId] });
    }
  };

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-typography-600">
        {isMulti
          ? t("tracks2.quiz.question.selectMultiple")
          : t("tracks2.quiz.question.selectPrompt")}
      </p>
      <div className="flex flex-col gap-2" role={isMulti ? "group" : "radiogroup"}>
        {(question.options ?? []).map(option => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={isSelected}
              onClick={() => toggle(option.id)}
              className={`flex items-center gap-3 rounded-[12px] border p-3 text-left transition-colors ${
                isSelected
                  ? "border-primary-500 bg-primary-50"
                  : "border-border-light bg-white hover:border-primary-300"
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 ${
                  isMulti ? "rounded-[6px]" : "rounded-full"
                } ${isSelected ? "border-primary-500 bg-primary-500" : "border-neutral-300"}`}
              >
                {isSelected && (
                  <span
                    className={`bg-white ${isMulti ? "h-2 w-2.5 rotate-45 rounded-[1px]" : "h-2 w-2 rounded-full"}`}
                  />
                )}
              </span>
              <span className="text-base text-typography-900">{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
