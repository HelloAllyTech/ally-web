import { FC, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { LandingSittingLength, PublicTrackOutline, PublicTrackStory } from "@types";

import { formatDuration, personaInitial } from "./storyUtils";

const SITTING_KEY: Record<LandingSittingLength, string> = {
  [LandingSittingLength.SHORT]: "courseLanding.story.sitting.short",
  [LandingSittingLength.MEDIUM]: "courseLanding.story.sitting.medium",
  [LandingSittingLength.LONG]: "courseLanding.story.sitting.long",
};

interface StoryHeroProps {
  outline: PublicTrackOutline;
  story: PublicTrackStory;
  chapterCount: number;
  roleplayCount: number;
  /** The Start button and login hint, or the "not available" box in their place. */
  action: ReactNode;
}

const Chip: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-background-tertiary px-3 py-0.5 text-xs text-gray-700">
    {children}
  </span>
);

/**
 * The opening scene: a person and a moment, then the question it puts to the
 * learner. The course's title sits under the hook rather than above it — the
 * page leads with the problem, not the syllabus.
 */
export const StoryHero: FC<StoryHeroProps> = ({
  outline,
  story,
  chapterCount,
  roleplayCount,
  action,
}) => {
  const { t } = useTranslation();
  const persona = story.persona;
  // Persona portrait first, then the course cover; a named persona with no
  // picture still gets a placeholder so the card has somewhere to sit.
  const imageUrl = persona?.imageUrl || outline.coverImageUrl;
  const hasVisual = Boolean(imageUrl || persona);
  const sitting = story.howItPlays?.sittingLength;

  return (
    <section
      className={`grid items-center gap-6 py-8 sm:gap-8 sm:py-10 ${
        hasVisual ? "md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]" : ""
      }`}
      data-testid="story-hero"
    >
      <div className="min-w-0">
        {/* On a phone the portrait card would push the first move a screen
            down, so the persona rides above the hook as one compact line. */}
        {persona && (
          <div className="mb-4 flex items-center gap-3 md:hidden" data-testid="story-persona-strip">
            {persona.imageUrl ? (
              <CustomImage
                src={persona.imageUrl}
                alt=""
                className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 font-primary text-lg font-medium text-gray-500"
              >
                {personaInitial(persona.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-primary text-sm font-medium text-gray-900">{persona.name}</p>
              {persona.descriptor && (
                <p className="font-secondary text-sm leading-snug text-gray-700">
                  {persona.descriptor}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {t("courseLanding.story.eyebrow", { count: chapterCount })}
        </p>
        <h1 className="mb-2 mt-2 break-words font-primary text-[26px] font-medium leading-[1.22] text-gray-900 sm:text-[32px]">
          {story.hook}
        </h1>
        {story.question && (
          <p className="mb-3 font-secondary text-lg italic leading-snug text-gray-700 sm:text-xl">
            {story.question}
          </p>
        )}
        <p className="mb-5 font-secondary text-base leading-relaxed text-gray-700">
          <span className="font-primary font-medium text-gray-900">{outline.title}</span>
          {story.courseLine && <> · {story.courseLine}</>}
        </p>
        <div className="mb-4">{action}</div>
        <div className="flex flex-wrap gap-1.5">
          {!!outline.estimatedDurationMinutes && (
            <Chip>{formatDuration(outline.estimatedDurationMinutes, t)}</Chip>
          )}
          {sitting && <Chip>{t(SITTING_KEY[sitting])}</Chip>}
          {roleplayCount > 0 && (
            <Chip>{t("courseLanding.story.roleplayCount", { count: roleplayCount })}</Chip>
          )}
        </div>
      </div>

      {hasVisual && (
        <div
          className={`relative overflow-hidden rounded-2xl bg-background-tertiary md:h-[260px] ${
            persona ? "hidden md:block" : "order-first h-[160px] md:order-none"
          }`}
        >
          {imageUrl ? (
            <CustomImage
              src={imageUrl}
              alt={persona?.name ?? outline.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-start justify-center pt-10" aria-hidden="true">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 font-primary text-4xl font-medium text-gray-500">
                {personaInitial(persona!.name)}
              </span>
            </div>
          )}
          {persona && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border-light bg-white px-3 py-2.5">
              <p className="font-primary text-sm font-medium text-gray-900">{persona.name}</p>
              {persona.descriptor && (
                <p className="font-secondary text-sm leading-snug text-gray-700">
                  {persona.descriptor}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
