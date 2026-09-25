import { FC, useState } from "react";

import { useTranslation } from "react-i18next";

import { ArrowDownFilled, TickGreenBackground, CrossRedBackground } from "@assets";
import { CircularProgress } from "@components";
import { QuizAttemptResult, QuizQuestionResult, SanitizedQuizQuestion } from "@types";

import { QuestionMedia } from "../QuestionMedia";
import { QuizAnswerState } from "./quizAnswerState";
import {
  formatCorrectAnswer,
  formatLikertResponses,
  isGraded,
  isPendingResult,
  isSurveyQuiz,
} from "./quizHelpers";

interface QuizResultsProps {
  result: QuizAttemptResult;
  questions: SanitizedQuizQuestion[];
  /** What the learner submitted — only Likert rows read it back. */
  answers?: Record<string, QuizAnswerState>;
  /** True while a regrade request is in flight. */
  isRegrading: boolean;
  canRetry: boolean;
  onRegrade: () => void;
  onRetry: () => void;
  onNext: () => void;
}

const QuestionRow: FC<{
  index: number;
  question: SanitizedQuizQuestion | undefined;
  result: QuizQuestionResult;
  answer: QuizAnswerState | undefined;
}> = ({ index, question, result, answer }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isPending = isPendingResult(result);
  const graded = isGraded(result);
  // Ungraded with no key: there is no right or wrong to report.
  const hasVerdict = result.correct !== null;

  const statusIcon = isPending ? (
    <span className="h-4 w-4 rounded-full bg-warning-300" aria-hidden />
  ) : !hasVerdict ? (
    <span className="h-4 w-4 rounded-full bg-neutral-300" aria-hidden />
  ) : result.correct ? (
    <TickGreenBackground className="h-4 w-4" />
  ) : (
    <CrossRedBackground className="h-4 w-4" />
  );

  const correctAnswerLines = formatCorrectAnswer(question, result.correctAnswer, {
    true: t("tracks2.quiz.question.true"),
    false: t("tracks2.quiz.question.false"),
  });
  const likertResponses =
    question?.type === "likert_scale" ? formatLikertResponses(question, answer?.ratings) : [];

  const verdictLabel = isPending
    ? t("tracks2.quiz.results.pendingGrading")
    : !hasVerdict
      ? null
      : result.correct
        ? t("tracks2.quiz.results.correct")
        : t("tracks2.quiz.results.incorrect");

  return (
    <div className="rounded-[12px] border border-border-light bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span className="mt-0.5">{statusIcon}</span>
        <span className="min-w-0 flex-1 text-sm font-medium text-typography-900">
          {index + 1}. {question?.prompt ?? ""}
        </span>
        <span className="flex-shrink-0 text-xs text-typography-600">
          {graded
            ? `${result.pointsAwarded}/${result.pointsPossible}`
            : t("tracks2.quiz.results.notScored")}
        </span>
        <ArrowDownFilled
          className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border-light px-3 py-3 text-sm">
          {/* A learner reviewing a wrong answer needs what they were looking
              at, not just the words that framed it. */}
          <QuestionMedia media={question?.media} />
          {verdictLabel && (
            <div className="mb-1 font-medium text-typography-800">{verdictLabel}</div>
          )}
          {likertResponses.length > 0 && (
            <div className="mt-1">
              <p className="mb-1 font-medium text-typography-800">
                {t("tracks2.quiz.results.yourResponses")}
              </p>
              <ul className="flex flex-col gap-1">
                {likertResponses.map(row => (
                  <li key={row.statement} className="text-typography-700">
                    {row.statement}
                    {" — "}
                    <span className="font-medium text-typography-900">
                      {row.rating ?? t("tracks2.quiz.results.noResponse")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* The key, when the trainer allows it and the learner could use it:
              a right answer needs no correcting. Without it they still have
              the verdict above. */}
          {correctAnswerLines.length > 0 && result.correct === false && (
            <div className="mt-2">
              <span className="font-medium text-typography-800">
                {t("tracks2.quiz.results.correctAnswer")}:{" "}
              </span>
              {correctAnswerLines.length === 1 ? (
                <span className="text-typography-700">{correctAnswerLines[0]}</span>
              ) : (
                <ul className="mt-1 flex flex-col gap-0.5 text-typography-700">
                  {correctAnswerLines.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {result.explanation && (
            <p className="mt-2 text-typography-700">
              <span className="font-medium text-typography-800">
                {t("tracks2.quiz.results.explanation")}:{" "}
              </span>
              {result.explanation}
            </p>
          )}
          {result.llmFeedback && (
            <p className="mt-2 rounded-[8px] bg-neutral-50 p-2 text-typography-700">
              <span className="font-medium text-typography-800">
                {t("tracks2.quiz.results.feedback")}:{" "}
              </span>
              {result.llmFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Quiz results screen: a circular score ring, pass/fail banner, per-question
 * accordion (with explanation + AI feedback), and the appropriate CTA —
 * finish-grading when pending, retry on a failed attempt with attempts left,
 * or Next once passed.
 */
export const QuizResults: FC<QuizResultsProps> = ({
  result,
  questions,
  answers,
  isRegrading,
  canRetry,
  onRegrade,
  onRetry,
  onNext,
}) => {
  const { t } = useTranslation();
  const questionById = new Map(questions.map(q => [q.id, q]));
  const hasPending = result.status === "PENDING_GRADING" || result.questions.some(isPendingResult);
  // A survey has no score to ring or pass mark to be judged against.
  const isSurvey = result.scorePct === null || isSurveyQuiz(result.questions);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {isSurvey ? (
          <>
            <TickGreenBackground className="h-16 w-16" />
            <p className="mt-4 text-lg font-semibold text-typography-900">
              {t("tracks2.quiz.results.responsesSubmitted")}
            </p>
            <p className="mt-1 text-sm text-typography-700">
              {t("tracks2.quiz.results.responsesSubmittedBody")}
            </p>
          </>
        ) : (
          <>
            <CircularProgress
              current={Math.round(result.scorePct ?? 0)}
              total={100}
              size={96}
              strokeWidth={8}
              progressColor={result.passed ? "#4e6b54" : "#EF5350"}
              textColor="text-typography-900"
            />
            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
                result.passed
                  ? "bg-success-50 text-success-800"
                  : "bg-destructive-50 text-destructive-500"
              }`}
            >
              {result.passed ? t("tracks2.quiz.results.passed") : t("tracks2.quiz.results.failed")}
            </div>
          </>
        )}
        {result.maxAttempts !== null && (
          <p className="mt-2 text-xs text-typography-600">
            {t("tracks2.quiz.results.attemptsUsed", {
              used: result.attemptsUsed,
              max: result.maxAttempts,
            })}
          </p>
        )}

        <div className="mt-6 flex w-full flex-col gap-2">
          {result.questions.map((q, i) => (
            <QuestionRow
              key={q.questionId}
              index={i}
              question={questionById.get(q.questionId)}
              result={q}
              answer={answers?.[q.questionId]}
            />
          ))}
        </div>

        <div className="mt-6 flex w-full flex-col items-center gap-3">
          {hasPending && (
            <button
              onClick={onRegrade}
              disabled={isRegrading}
              className="rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {isRegrading
                ? t("tracks2.quiz.results.grading")
                : t("tracks2.quiz.results.finishGrading")}
            </button>
          )}
          {!hasPending && result.passed && (
            <button
              onClick={onNext}
              className="rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              {t("tracks2.quiz.results.next")}
            </button>
          )}
          {!hasPending && !result.passed && canRetry && (
            <button
              onClick={onRetry}
              className="rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              {t("tracks2.quiz.results.retry")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
