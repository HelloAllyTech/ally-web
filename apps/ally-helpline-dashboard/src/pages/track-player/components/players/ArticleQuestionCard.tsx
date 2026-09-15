import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubmitArticleQuestionAnswerMutation } from "@api";
import { ArticleQuestion, SubmitArticleQuestionAnswerResponse } from "@types";

interface ArticleQuestionCardProps {
  itemId: string;
  question: ArticleQuestion;
  /** Called with the server's response once an answer lands. */
  onAnswered: (result: SubmitArticleQuestionAnswerResponse) => void;
}

/** What the card knows about this question's outcome, however it learned it. */
interface Resolution {
  selectedOptionId: string;
  correct: boolean;
  correctOptionId: string | null;
  explanation: string | null;
}

/**
 * One inline article question, rendered where its placeholder sat in the
 * prose.
 *
 * Selecting an option is not the same as answering it. The answer is final —
 * the server refuses a second one — so committing on the first tap would turn
 * a mis-tap into a permanent wrong answer. The learner picks, then confirms,
 * matching how a video interjection is answered.
 *
 * Once answered the card shows the verdict and marks the correct option,
 * whichever way it went: being told only that you were wrong leaves you with
 * nothing to correct.
 */
export const ArticleQuestionCard: FC<ArticleQuestionCardProps> = ({
  itemId,
  question,
  onAnswered,
}) => {
  const { t } = useTranslation();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitAnswer, { isLoading }] = useSubmitArticleQuestionAnswerMutation();

  // Answered in an earlier visit: the payload already carries the outcome.
  const [resolution, setResolution] = useState<Resolution | null>(() =>
    question.answered
      ? {
          selectedOptionId: question.answered.selectedOptionId,
          correct: question.answered.correct,
          correctOptionId: question.correctOptionId,
          explanation: question.explanation,
        }
      : null,
  );

  const handleSubmit = async () => {
    if (!selectedOptionId || isLoading || resolution) return;
    try {
      const result = await submitAnswer({
        itemId,
        questionId: question.id,
        selectedOptionId,
      }).unwrap();
      setResolution({
        selectedOptionId: result.selectedOptionId,
        correct: result.correct,
        correctOptionId: result.correctOptionId,
        explanation: result.explanation,
      });
      onAnswered(result);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const optionStateClasses = (optionId: string) => {
    if (!resolution) {
      return selectedOptionId === optionId
        ? "border-primary-500 bg-primary-50"
        : "border-border-light bg-white hover:border-primary-300";
    }
    if (resolution.correctOptionId === optionId) {
      return "border-success-500 bg-success-50";
    }
    if (resolution.selectedOptionId === optionId) {
      return "border-destructive-500 bg-destructive-50";
    }
    return "border-border-light bg-white opacity-60";
  };

  return (
    <section
      data-testid={`article-question-${question.id}`}
      aria-label={t("tracks2.article.question.title")}
      className="my-6 rounded-[16px] border border-border-light bg-neutral-50/60 p-4 text-base sm:p-5"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-typography-600">
        {t("tracks2.article.question.title")}
      </p>
      <h3 className="mb-4 text-[1em] font-semibold text-typography-900">{question.prompt}</h3>

      <div className="flex flex-col gap-2" role="radiogroup">
        {(question.options ?? []).map(option => {
          const isChecked = resolution
            ? resolution.selectedOptionId === option.id
            : selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isChecked}
              disabled={!!resolution || isLoading}
              onClick={() => setSelectedOptionId(option.id)}
              className={`flex items-center gap-3 rounded-[12px] border p-3 text-left transition-colors disabled:cursor-default ${optionStateClasses(option.id)}`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  isChecked ? "border-primary-500 bg-primary-500" : "border-neutral-300"
                }`}
              >
                {isChecked && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className="text-[0.95em] text-typography-900">{option.text}</span>
            </button>
          );
        })}
      </div>

      {resolution ? (
        <div className="mt-4 flex flex-col gap-2">
          <p
            className={`rounded-[12px] px-4 py-2 text-[0.9em] font-medium ${
              resolution.correct
                ? "bg-success-50 text-success-800"
                : "bg-destructive-50 text-destructive-500"
            }`}
          >
            {resolution.correct
              ? t("tracks2.article.question.correct")
              : `${t("tracks2.article.question.incorrect")} — ${t("tracks2.article.question.correctAnswerIs")}`}
          </p>
          {resolution.explanation && (
            <p className="text-[0.9em] text-typography-700">{resolution.explanation}</p>
          )}
          <p className="text-xs text-typography-500">
            {t("tracks2.article.question.answeredHint")}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedOptionId || isLoading}
          className="mt-4 rounded-full bg-primary-500 px-6 py-2 text-[0.9em] font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
        >
          {t("tracks2.article.question.submit")}
        </button>
      )}
    </section>
  );
};
