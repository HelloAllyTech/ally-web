import { FC, ReactNode, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { PublicTrackOutline, PublicTrackStory, TrackItemType } from "@types";

import { FirstMove } from "./FirstMove";
import { StoryArc } from "./StoryArc";
import { ContentNotes, HowItPlays, StoryCastAndXp, StoryOutcomes } from "./StoryBlocks";
import { StoryHero } from "./StoryHero";
import { formatDuration, sortSections } from "./storyUtils";

/**
 * Whether an element is on screen, through a callback ref so the observer
 * follows the node if React replaces it. Without IntersectionObserver (old
 * browsers, jsdom) it reports "visible", which keeps the sticky bar away.
 */
const useOnScreen = <T extends HTMLElement>(): [(node: T | null) => void, boolean] => {
  const [node, setNode] = useState<T | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, onScreen];
};

interface StoryLandingProps {
  outline: PublicTrackOutline;
  story: PublicTrackStory;
  /** Start, or null once the visitor has been told the course isn't theirs. */
  onStart: (() => void) | null;
  isBusy: boolean;
  isSignedIn: boolean;
  /** The "not available for your account" box, shown in place of Start. */
  denied: ReactNode;
  onFirstMovePick: (replyIndex: number) => void;
}

/**
 * The story layout of a course's landing page, used once the author has
 * written a hook. It opens on the situation and a playable first move, and
 * only then lists what the course contains — the order a trailer works in.
 * Every block is optional: the server sends only the ones that are on and
 * complete enough to show.
 */
export const StoryLanding: FC<StoryLandingProps> = ({
  outline,
  story,
  onStart,
  isBusy,
  isSignedIn,
  denied,
  onFirstMovePick,
}) => {
  const { t } = useTranslation();
  const sections = sortSections(outline.sections);
  const roleplayCount = sections.reduce(
    (sum, section) =>
      sum + section.items.filter(item => item.type === TrackItemType.ROLEPLAY).length,
    0,
  );
  const startLabel = story.buttonLabel || t("courseLanding.story.start");
  const [heroActionRef, heroActionOnScreen] = useOnScreen<HTMLDivElement>();
  const [closingRef, closingOnScreen] = useOnScreen<HTMLElement>();
  // On a phone the hero's button is gone after one swipe; keep a way to start
  // within reach until the closing one comes into view.
  const showStickyBar = Boolean(onStart) && !heroActionOnScreen && !closingOnScreen;

  const startButton = onStart && (
    <button
      type="button"
      onClick={onStart}
      disabled={isBusy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-2 font-tertiary text-base font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-60 max-md:min-h-11 sm:w-auto"
    >
      {isBusy ? t("common.starting") : startLabel}
      {!isBusy && (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </button>
  );

  const heroAction = onStart ? (
    <div ref={heroActionRef} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {startButton}
      {!isSignedIn && <span className="text-xs text-gray-700">{t("courseLanding.loginHint")}</span>}
    </div>
  ) : (
    denied
  );

  const container = "mx-auto w-full max-w-4xl px-4 sm:px-6";

  return (
    <main className="w-full pb-4" data-testid="story-landing">
      <div className={container}>
        <StoryHero
          outline={outline}
          story={story}
          chapterCount={sections.length}
          roleplayCount={roleplayCount}
          action={heroAction}
        />
      </div>

      {story.firstMove && (
        <FirstMove
          firstMove={story.firstMove}
          onContinue={onStart}
          isBusy={isBusy}
          isSignedIn={isSignedIn}
          onPick={onFirstMovePick}
        />
      )}

      <div className={container}>
        <StoryArc sections={sections} story={story} />
        {story.outcomes && <StoryOutcomes outcomes={story.outcomes} />}
        {story.howItPlays && (
          <HowItPlays sections={sections} personaName={story.persona?.name ?? null} />
        )}
        <StoryCastAndXp cast={story.cast} xp={story.xp} />
        {story.contentNotes && <ContentNotes notes={story.contentNotes} />}
      </div>

      {onStart && (
        <section
          ref={closingRef}
          className="border-t border-border-light bg-white px-4 py-10 text-center sm:px-6"
          data-testid="story-closing"
        >
          <h2 className="mb-1.5 font-primary text-xl font-medium text-gray-900">
            {t("courseLanding.story.closing.title")}
          </h2>
          {!isSignedIn && (
            <p className="mb-5 font-secondary text-base text-gray-700">
              {t("courseLanding.story.closing.body")}
            </p>
          )}
          <div className={isSignedIn ? "mt-4" : ""}>{startButton}</div>
        </section>
      )}

      {showStickyBar && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-border-light bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:hidden"
          data-testid="story-sticky-start"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-primary text-sm font-medium text-gray-900">
              {outline.title}
            </p>
            {!!outline.estimatedDurationMinutes && (
              <p className="text-xs text-gray-500">
                {formatDuration(outline.estimatedDurationMinutes, t)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onStart!}
            disabled={isBusy}
            className="flex-shrink-0 rounded-full bg-primary-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 max-md:min-h-11"
          >
            {isBusy ? t("common.starting") : startLabel}
          </button>
        </div>
      )}
    </main>
  );
};
