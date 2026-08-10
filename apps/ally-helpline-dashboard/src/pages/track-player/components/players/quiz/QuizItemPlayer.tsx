import { FC, useEffect, useState } from "react";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useRegradeQuizAttemptMutation,
  useStartTrackItemMutation,
  useSubmitQuizAttemptMutation,
} from "@api";
import { ArrowLeft, ArrowRight } from "@assets";
import {
  QuizAttemptResult,
  SanitizedQuiz,
  StartQuizItemPayload,
  TrackItemCompletionResult,
  TrackItemType,
} from "@types";

import { QuizAnswerState, initialAnswerState, isAnswered, toAnswerInput } from "./quizAnswerState";
import { QuizIntro } from "./QuizIntro";
import { QuizResults } from "./QuizResults";
import { FillBlankQuestion } from "./widgets/FillBlankQuestion";
import { MatchingQuestion } from "./widgets/MatchingQuestion";
import { McqQuestion } from "./widgets/McqQuestion";
import { OpenEndedQuestion } from "./widgets/OpenEndedQuestion";
import { OrderingQuestion } from "./widgets/OrderingQuestion";
import { TrueFalseQuestion } from "./widgets/TrueFalseQuestion";

interface QuizItemPlayerProps {
  payload: StartQuizItemPayload;
  itemId: string;
  onCompleted: (result: TrackItemCompletionResult) => void;
  onRequestNext: () => void;
}

type Phase = "intro" | "questions" | "results";

const fireConfetti = () => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { x: 0.5, y: 0.6 },
    disableForReducedMotion: true,
  });
};

/**
 * Quiz item player — intro card, one question per screen, single-shot
 * submit, and a results screen. Handles PENDING_GRADING via regrade, and
 * retry (which re-fetches start for a reshuffled question set) when the
 * attempt fails and attempts remain.
 */
export const QuizItemPlayer: FC<QuizItemPlayerProps> = ({
  payload,
  itemId,
  onCompleted,
  onRequestNext,
}) => {
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<SanitizedQuiz>(payload.quiz);
  const [attemptsUsed, setAttemptsUsed] = useState(payload.attemptsUsed);
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerState>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  const [submitQuizAttempt, { isLoading: isSubmitting }] = useSubmitQuizAttemptMutation();
  const [regradeQuizAttempt, { isLoading: isRegrading }] = useRegradeQuizAttemptMutation();
  const [startTrackItem] = useStartTrackItemMutation();

  const questions = quiz.questions;
  const maxAttempts = payload.maxAttempts;

  const resetAnswers = (q: SanitizedQuiz) => {
    const seed: Record<string, QuizAnswerState> = {};
    q.questions.forEach(question => {
      seed[question.id] = initialAnswerState(question);
    });
    setAnswers(seed);
  };

  // Seed answer state once on mount from the initial payload.
  useEffect(() => {
    resetAnswers(payload.quiz);
  }, []);

  const startQuiz = () => {
    resetAnswers(quiz);
    setCurrent(0);
    setResult(null);
    setPhase("questions");
  };

  const setAnswer = (questionId: string, state: QuizAnswerState) =>
    setAnswers(prev => ({ ...prev, [questionId]: state }));

  const applyAttemptResult = (attempt: QuizAttemptResult) => {
    setResult(attempt);
    setAttemptsUsed(attempt.attemptsUsed);
    setPhase("results");
    if (attempt.passed && attempt.itemCompleted) {
      fireConfetti();
      onCompleted({
        completed: attempt.itemCompleted,
        unlockedItemIds: attempt.unlockedItemIds,
        sectionCompleted: attempt.sectionCompleted,
        trackCompleted: attempt.trackCompleted,
      });
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    try {
      const answerInputs = questions.map(q => toAnswerInput(q, answers[q.id] ?? {}));
      const attempt = await submitQuizAttempt({
        itemId,
        answers: answerInputs,
      }).unwrap();
      applyAttemptResult(attempt);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const handleRegrade = async () => {
    if (!result || isRegrading) return;
    try {
      const attempt = await regradeQuizAttempt({
        itemId,
        attemptId: result.attemptId,
      }).unwrap();
      applyAttemptResult(attempt);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const handleRetry = async () => {
    try {
      const fresh = await startTrackItem({ itemId }).unwrap();
      if (fresh.type === TrackItemType.QUIZ) {
        setQuiz(fresh.quiz);
        setAttemptsUsed(fresh.attemptsUsed);
        resetAnswers(fresh.quiz);
      } else {
        resetAnswers(quiz);
      }
      setCurrent(0);
      setResult(null);
      setPhase("questions");
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  if (phase === "intro") {
    return (
      <QuizIntro
        quiz={quiz}
        attemptsUsed={attemptsUsed}
        maxAttempts={maxAttempts}
        onStart={startQuiz}
      />
    );
  }

  if (phase === "results" && result) {
    const attemptsLeft = maxAttempts === null ? Infinity : maxAttempts - attemptsUsed;
    return (
      <QuizResults
        result={result}
        questions={questions}
        isRegrading={isRegrading}
        canRetry={attemptsLeft > 0}
        onRegrade={handleRegrade}
        onRetry={handleRetry}
        onNext={onRequestNext}
      />
    );
  }

  const question = questions[current];
  const answerState = answers[question.id] ?? {};
  const answered = isAnswered(question, answerState);
  const isLast = current === questions.length - 1;

  const renderWidget = () => {
    switch (question.type) {
      case "mcq_single":
      case "mcq_multi":
        return (
          <McqQuestion
            question={question}
            state={answerState}
            onChange={s => setAnswer(question.id, s)}
          />
        );
      case "true_false":
        return <TrueFalseQuestion state={answerState} onChange={s => setAnswer(question.id, s)} />;
      case "ordering":
        return (
          <OrderingQuestion
            question={question}
            state={answerState}
            onChange={s => setAnswer(question.id, s)}
          />
        );
      case "matching":
        return (
          <MatchingQuestion
            question={question}
            state={answerState}
            onChange={s => setAnswer(question.id, s)}
          />
        );
      case "fill_blank":
        return (
          <FillBlankQuestion
            question={question}
            state={answerState}
            onChange={s => setAnswer(question.id, s)}
          />
        );
      case "open_ended":
        return (
          <OpenEndedQuestion
            question={question}
            state={answerState}
            onChange={s => setAnswer(question.id, s)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 px-4 pt-4 sm:px-6">
        <p className="text-xs font-medium text-typography-600">
          {t("tracks2.quiz.question.progress", {
            current: current + 1,
            total: questions.length,
          })}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-4 text-lg font-semibold text-typography-900">{question.prompt}</h2>
              {renderWidget()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-border-light bg-white px-4 py-3 sm:px-6">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-sm font-medium text-typography-800 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("tracks2.quiz.question.back")}
        </button>
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!answered || isSubmitting}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {t("tracks2.quiz.question.submit")}
          </button>
        ) : (
          <button
            onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
            disabled={!answered}
            className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {t("tracks2.quiz.question.next")}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
