import { FC } from "react";

import { useTranslation } from "react-i18next";

import { SanitizedQuiz } from "@types";

interface QuizIntroProps {
  quiz: SanitizedQuiz;
  attemptsUsed: number;
  maxAttempts: number | null;
  onStart: () => void;
}

/** Quiz landing card: question count, pass score, attempts remaining. */
export const QuizIntro: FC<QuizIntroProps> = ({ quiz, attemptsUsed, maxAttempts, onStart }) => {
  const { t } = useTranslation();
  const questionCount = quiz.questions.length;
  const attemptsLeft = maxAttempts === null ? null : Math.max(0, maxAttempts - attemptsUsed);
  const canStart = attemptsLeft === null || attemptsLeft > 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3xl">
        📝
      </div>
      <h2 className="mt-5 text-xl font-bold text-typography-900">
        {t("tracks2.quiz.intro.title")}
      </h2>

      <div className="mt-4 flex flex-col gap-1.5 text-sm text-typography-700">
        <span>{t("tracks2.quiz.intro.questionCount", { count: questionCount })}</span>
        <span>{t("tracks2.quiz.intro.passScore", { score: quiz.settings.passScore })}</span>
        <span>
          {attemptsLeft === null
            ? t("tracks2.quiz.intro.unlimitedAttempts")
            : t("tracks2.quiz.intro.attemptsLeft", { count: attemptsLeft })}
        </span>
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        className="mt-6 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
      >
        {canStart ? t("tracks2.quiz.intro.start") : t("tracks2.quiz.intro.noAttemptsLeft")}
      </button>
    </div>
  );
};
