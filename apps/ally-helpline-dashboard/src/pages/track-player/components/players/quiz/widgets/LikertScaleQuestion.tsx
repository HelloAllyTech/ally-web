import { FC } from "react";

import { useTranslation } from "react-i18next";

import { SanitizedQuizQuestion } from "@types";

import { QuizAnswerState } from "../quizAnswerState";

interface LikertScaleQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/**
 * Rating-scale question — one card per statement, each with the same scale
 * of points to choose from, lowest first. A radiogroup per statement, so a
 * keyboard or screen-reader user rates row by row the way a sighted learner
 * scans them.
 */
export const LikertScaleQuestion: FC<LikertScaleQuestionProps> = ({
  question,
  state,
  onChange,
}) => {
  const { t } = useTranslation();
  const ratings = state.ratings ?? {};
  const scale = question.scale ?? [];

  const rate = (statementId: string, scaleOptionId: string) =>
    onChange({ ratings: { ...ratings, [statementId]: scaleOptionId } });

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-typography-600">
        {t("tracks2.quiz.question.ratePrompt")}
      </p>
      <div className="flex flex-col gap-3">
        {(question.statements ?? []).map(statement => (
          <div
            key={statement.id}
            className="rounded-[12px] border border-border-light bg-white p-3"
          >
            <p
              id={`likert-${question.id}-${statement.id}`}
              className="mb-3 text-base text-typography-900"
            >
              {statement.text}
            </p>
            <div
              role="radiogroup"
              aria-labelledby={`likert-${question.id}-${statement.id}`}
              className="grid gap-2"
              // One column per scale point on wider screens keeps every row's
              // points aligned under each other; on a phone they wrap.
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${scale.length > 5 ? 72 : 96}px, 1fr))`,
              }}
            >
              {scale.map(point => {
                const isSelected = ratings[statement.id] === point.id;
                return (
                  <button
                    key={point.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => rate(statement.id, point.id)}
                    className={`rounded-[10px] border px-2 py-2 text-center text-sm leading-tight transition-colors ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 font-medium text-primary-700"
                        : "border-border-light bg-white text-typography-800 hover:border-primary-300"
                    }`}
                  >
                    {point.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
