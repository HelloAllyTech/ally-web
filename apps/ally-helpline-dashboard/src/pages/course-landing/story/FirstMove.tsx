import { FC, useState } from "react";

import { useTranslation } from "react-i18next";

import { PublicTrackStory } from "@types";

interface FirstMoveProps {
  firstMove: NonNullable<PublicTrackStory["firstMove"]>;
  /** Null hides Continue — the visitor has been told the course isn't theirs. */
  onContinue: (() => void) | null;
  isBusy: boolean;
  isSignedIn: boolean;
  onPick: (replyIndex: number) => void;
}

/**
 * One playable moment from chapter one, before any login. Each reply answers
 * with what the learner just did and why it matters — never a score, and never
 * a verdict on how the person on the other end is doing. Nothing is saved: the
 * moment is a taste of the course, not its first step.
 */
export const FirstMove: FC<FirstMoveProps> = ({
  firstMove,
  onContinue,
  isBusy,
  isSignedIn,
  onPick,
}) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const reply = picked === null ? null : firstMove.replies[picked];

  const pick = (index: number) => {
    setPicked(index);
    onPick(index);
  };

  return (
    <section
      className="bg-gray-950 px-4 py-8 text-gray-50 sm:px-6 sm:py-10"
      aria-labelledby="first-move-heading"
      data-testid="story-first-move"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="first-move-heading"
            className="text-xs font-medium uppercase tracking-wide text-gray-300"
          >
            {t("courseLanding.story.firstMove.eyebrow")}
          </h2>
          <span className="rounded-full border border-gray-700 px-2.5 py-0.5 text-xs text-gray-300">
            {t("courseLanding.story.firstMove.noScore")}
          </span>
        </div>
        {firstMove.sceneLine && (
          <p className="mt-4 font-mono text-xs text-gray-300">
            <span
              className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-status-sageBg align-middle"
              aria-hidden="true"
            />
            {firstMove.sceneLine}
          </p>
        )}
        <blockquote className="mb-2 mt-3 break-words font-secondary text-2xl italic leading-snug text-gray-50">
          “{firstMove.personaLine}”
        </blockquote>
        {firstMove.prompt && (
          <p className="mb-1 font-primary text-base text-gray-300">{firstMove.prompt}</p>
        )}

        <div
          className="flex flex-col gap-2 pt-1"
          role="group"
          aria-label={firstMove.prompt ?? undefined}
        >
          {firstMove.replies.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => pick(index)}
              aria-pressed={picked === index}
              className={`w-full rounded-[10px] border px-4 py-3 text-left font-secondary text-base leading-normal transition-colors max-md:min-h-11 ${
                picked === index
                  ? "border-primary-200 bg-gray-800 text-gray-50"
                  : "border-gray-700 bg-gray-900 text-gray-50 hover:border-gray-500"
              }`}
            >
              “{option.text}”
            </button>
          ))}
        </div>

        {reply && (
          <div
            className="mt-5 border-t border-gray-700 pt-4"
            aria-live="polite"
            data-testid="first-move-feedback"
          >
            <p className="font-primary text-base font-medium text-gray-50">{reply.label}</p>
            {reply.why && (
              <p className="mt-1 font-secondary text-base leading-relaxed text-gray-300">
                {reply.why}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {onContinue && (
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={isBusy}
                  className="rounded-full bg-primary-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60 max-md:min-h-11"
                >
                  {isBusy ? t("common.starting") : t("courseLanding.story.firstMove.continue")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="rounded-full border border-gray-700 px-5 py-2 text-sm font-medium text-gray-50 transition-colors hover:border-gray-500 max-md:min-h-11"
              >
                {t("courseLanding.story.firstMove.tryAnother")}
              </button>
            </div>
            {onContinue && !isSignedIn && (
              <p className="mt-3 text-xs text-gray-300">
                {t("courseLanding.story.firstMove.loginHint")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
