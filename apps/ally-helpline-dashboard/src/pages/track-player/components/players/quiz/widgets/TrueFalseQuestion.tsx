import { FC } from "react";

import { useTranslation } from "react-i18next";

import { QuizAnswerState } from "../quizAnswerState";

interface TrueFalseQuestionProps {
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/** True/false question — two large tappable option cards. */
export const TrueFalseQuestion: FC<TrueFalseQuestionProps> = ({ state, onChange }) => {
  const { t } = useTranslation();

  const options: { value: boolean; label: string }[] = [
    { value: true, label: t("tracks2.quiz.question.true") },
    { value: false, label: t("tracks2.quiz.question.false") },
  ];

  return (
    <div className="flex gap-3" role="radiogroup">
      {options.map(option => {
        const isSelected = state.booleanAnswer === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange({ booleanAnswer: option.value })}
            className={`flex-1 rounded-[14px] border p-5 text-center text-lg font-medium transition-colors ${
              isSelected
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-border-light bg-white text-typography-900 hover:border-primary-300"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
