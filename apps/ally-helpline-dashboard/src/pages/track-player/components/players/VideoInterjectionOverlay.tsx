import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubmitInterjectionAnswerMutation } from "@api";
import { SubmitInterjectionAnswerResponse, VideoInterjection } from "@types";

import {
  initialAnswerState,
  isAnswered,
  QuizAnswerState,
  toAnswerInput,
} from "./quiz/quizAnswerState";
import { FillBlankQuestion } from "./quiz/widgets/FillBlankQuestion";
import { MatchingQuestion } from "./quiz/widgets/MatchingQuestion";
import { McqQuestion } from "./quiz/widgets/McqQuestion";
import { OrderingQuestion } from "./quiz/widgets/OrderingQuestion";
import { TrueFalseQuestion } from "./quiz/widgets/TrueFalseQuestion";

interface VideoInterjectionOverlayProps {
  itemId: string;
  interjection: VideoInterjection;
  /** Resume playback and mark this interjection answered — called from the "Continue" button. */
  onContinue: () => void;
}

/**
 * Hard-pause overlay shown when the video player crosses an interjection's
 * timestamp. Blocks the video (absolutely positioned over it by the caller)
 * until the learner submits an answer; once graded, shows a correct/
 * incorrect banner and a Continue button that hands control back to
 * `VideoItemPlayer` to resume playback. `open_ended` questions never reach
 * here — they are excluded from interjection authoring since LLM grading
 * doesn't fit a synchronous hard-pause.
 */
export const VideoInterjectionOverlay: FC<VideoInterjectionOverlayProps> = ({
  itemId,
  interjection,
  onContinue,
}) => {
  const { t } = useTranslation();
  const { question } = interjection;
  const [answerState, setAnswerState] = useState<QuizAnswerState>(() =>
    initialAnswerState(question),
  );
  const [result, setResult] = useState<SubmitInterjectionAnswerResponse | null>(null);
  const [submitInterjectionAnswer, { isLoading }] = useSubmitInterjectionAnswerMutation();

  const answered = isAnswered(question, answerState);

  const handleSubmit = async () => {
    if (isLoading) return;
    try {
      const response = await submitInterjectionAnswer({
        itemId,
        interjectionId: interjection.id,
        answer: toAnswerInput(question, answerState),
      }).unwrap();
      setResult(response);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const renderWidget = () => {
    switch (question.type) {
      case "mcq_single":
      case "mcq_multi":
        return <McqQuestion question={question} state={answerState} onChange={setAnswerState} />;
      case "true_false":
        return <TrueFalseQuestion state={answerState} onChange={setAnswerState} />;
      case "ordering":
        return (
          <OrderingQuestion question={question} state={answerState} onChange={setAnswerState} />
        );
      case "matching":
        return (
          <MatchingQuestion question={question} state={answerState} onChange={setAnswerState} />
        );
      case "fill_blank":
        return (
          <FillBlankQuestion question={question} state={answerState} onChange={setAnswerState} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-y-auto rounded-[16px] bg-white p-5 shadow-xl max-h-full">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-typography-600">
          {t("tracks2.video.interjection.title")}
        </p>
        <h2 className="mb-4 text-lg font-semibold text-typography-900">{question.prompt}</h2>

        {renderWidget()}

        {result ? (
          <div className="mt-4 flex flex-col gap-3">
            <div
              className={`rounded-[12px] px-4 py-2 text-sm font-medium ${
                result.correct === true
                  ? "bg-success-50 text-success-800"
                  : result.correct === false
                    ? "bg-destructive-50 text-destructive-500"
                    : "bg-warning-50 text-warning-800"
              }`}
            >
              {result.correct === null
                ? t("tracks2.video.interjection.pending")
                : result.correct
                  ? t("tracks2.video.interjection.correct")
                  : t("tracks2.video.interjection.incorrect")}
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              {t("tracks2.video.interjection.continue")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answered || isLoading}
            className="mt-4 w-full rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {t("tracks2.video.interjection.submit")}
          </button>
        )}
      </div>
    </div>
  );
};
