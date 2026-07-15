import { FC, useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { SanitizedQuizQuestion } from "@types";

import { QuizAnswerState, wordCount } from "../quizAnswerState";

interface OpenEndedQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

/**
 * Open-ended question — an auto-expanding textarea with a live word count
 * against the minimum, plus an "AI graded" hint.
 */
export const OpenEndedQuestion: FC<OpenEndedQuestionProps> = ({ question, state, onChange }) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = state.text ?? "";
  const minWords = question.minWords ?? 0;
  const count = wordCount(text);

  // Auto-grow to fit content.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => onChange({ text: e.target.value })}
        placeholder={t("tracks2.journal.placeholder")}
        rows={4}
        className="w-full resize-none overflow-hidden rounded-[12px] border border-border-light bg-neutral-50 px-3 py-2 text-base text-typography-900 outline-none transition-colors focus:border-primary-400"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-typography-600">
        <span>{t("tracks2.quiz.question.aiGraded")}</span>
        {minWords > 0 && (
          <span className={count >= minWords ? "text-success-800" : "text-typography-600"}>
            {t("tracks2.quiz.question.wordCount", { count, min: minWords })}
          </span>
        )}
      </div>
    </div>
  );
};
