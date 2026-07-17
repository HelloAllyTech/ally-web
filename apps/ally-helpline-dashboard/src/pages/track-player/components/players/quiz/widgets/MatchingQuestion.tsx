import { FC, useState } from "react";

import { useTranslation } from "react-i18next";

import { SanitizedQuizQuestion } from "@types";

import { QuizAnswerState } from "../quizAnswerState";
import { applyMatchSelection, breakMatch, leftIdForRight, rightIdForLeft } from "../quizHelpers";

interface MatchingQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/**
 * A stable colour per pair index so a matched left/right share a chip colour.
 * Uses theme-token backgrounds only.
 */
const PAIR_COLORS = [
  "bg-primary-100 text-primary-700 border-primary-300",
  "bg-success-50 text-success-800 border-success-300",
  "bg-warning-50 text-warning-800 border-warning-300",
  "bg-secondary-100 text-secondary-700 border-secondary-300",
];

/**
 * Matching question — tap a left item, then a right item to pair them (the
 * pairing reducer lives in quizHelpers). Tap a paired item to break it. The
 * right column arrives pre-shuffled from the server.
 */
export const MatchingQuestion: FC<MatchingQuestionProps> = ({ question, state, onChange }) => {
  const { t } = useTranslation();
  const pairs = state.pairs ?? [];
  const [pendingLeft, setPendingLeft] = useState<string | null>(null);

  const pairIndexForLeft = (leftId: string) => pairs.findIndex(p => p.leftId === leftId);

  const handleLeftClick = (leftId: string) => {
    const existingRight = rightIdForLeft(pairs, leftId);
    if (existingRight) {
      // Break the existing pair.
      onChange({ pairs: breakMatch(pairs, "left", leftId) });
      setPendingLeft(null);
      return;
    }
    setPendingLeft(prev => (prev === leftId ? null : leftId));
  };

  const handleRightClick = (rightId: string) => {
    const existingLeft = leftIdForRight(pairs, rightId);
    if (existingLeft && !pendingLeft) {
      onChange({ pairs: breakMatch(pairs, "right", rightId) });
      return;
    }
    if (pendingLeft) {
      onChange({ pairs: applyMatchSelection(pairs, pendingLeft, rightId) });
      setPendingLeft(null);
    }
  };

  const colorForLeft = (leftId: string) => {
    const idx = pairIndexForLeft(leftId);
    return idx >= 0 ? PAIR_COLORS[idx % PAIR_COLORS.length] : null;
  };
  const colorForRight = (rightId: string) => {
    const left = leftIdForRight(pairs, rightId);
    return left ? colorForLeft(left) : null;
  };

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-typography-600">
        {t("tracks2.quiz.question.matchPrompt")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {(question.left ?? []).map(option => {
            const color = colorForLeft(option.id);
            const isPending = pendingLeft === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleLeftClick(option.id)}
                className={`rounded-[10px] border p-3 text-left text-sm transition-colors ${
                  color ??
                  (isPending
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-border-light bg-white text-typography-900 hover:border-primary-300")
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {(question.right ?? []).map(option => {
            const color = colorForRight(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleRightClick(option.id)}
                className={`rounded-[10px] border p-3 text-left text-sm transition-colors ${
                  color ??
                  "border-border-light bg-white text-typography-900 hover:border-primary-300"
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
