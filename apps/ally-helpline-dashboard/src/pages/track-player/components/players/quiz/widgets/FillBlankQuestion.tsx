import { FC } from "react";

import { SanitizedQuizQuestion } from "@types";

import { QuizAnswerState } from "../quizAnswerState";
import { splitFillBlankTemplate } from "../quizHelpers";

interface FillBlankQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/**
 * Fill-in-the-blank question — renders the template with inline inputs at
 * each `{{blankId}}` token (split by the pure template helper).
 */
export const FillBlankQuestion: FC<FillBlankQuestionProps> = ({ question, state, onChange }) => {
  const segments = splitFillBlankTemplate(question.template ?? "");
  const blanks = state.blanks ?? {};

  const setBlank = (blankId: string, value: string) =>
    onChange({ blanks: { ...blanks, [blankId]: value } });

  return (
    <p className="text-lg leading-loose text-typography-900">
      {segments.map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i}>{segment.value}</span>
        ) : (
          <input
            key={i}
            type="text"
            value={blanks[segment.blankId] ?? ""}
            onChange={e => setBlank(segment.blankId, e.target.value)}
            aria-label={`blank ${segment.blankId}`}
            className="mx-1 inline-block min-w-[6rem] max-w-[12rem] border-b-2 border-primary-400 bg-primary-50 px-2 py-0.5 text-base text-typography-900 outline-none focus:border-primary-600"
          />
        ),
      )}
    </p>
  );
};
