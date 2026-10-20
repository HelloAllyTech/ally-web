import { FC, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { TrackTypeIcon } from "@components";
import { PublicTrackOutlineSection, PublicTrackStory, TrackItemType } from "@types";

import { countItemsByKind, describeWarnings, personaInitial, personaShortName } from "./storyUtils";

const SectionHeading: FC<{ id: string; children: ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="mb-4 font-primary text-xl font-medium text-gray-900">
    {children}
  </h2>
);

/** "By the end, you'll be able to" — placed after the story, never before it. */
export const StoryOutcomes: FC<{ outcomes: string[] }> = ({ outcomes }) => {
  const { t } = useTranslation();
  return (
    <section
      className="border-t border-border-light py-8"
      aria-labelledby="story-outcomes-heading"
      data-testid="story-outcomes"
    >
      <SectionHeading id="story-outcomes-heading">
        {t("courseLanding.story.outcomes.title")}
      </SectionHeading>
      <ul className="grid gap-3 sm:grid-cols-3">
        {outcomes.map((outcome, index) => (
          <li key={index} className="rounded-xl border border-border-light bg-white p-4">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-primary-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            <p className="mt-2 break-words font-secondary text-base leading-snug text-gray-900">
              {outcome}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

const KIND_TITLE_KEY: Record<TrackItemType, string> = {
  [TrackItemType.ROLEPLAY]: "courseLanding.story.howItPlays.kinds.roleplay",
  [TrackItemType.CASE]: "courseLanding.story.howItPlays.kinds.case",
  [TrackItemType.QUIZ]: "courseLanding.story.howItPlays.kinds.quiz",
  [TrackItemType.ARTICLE]: "courseLanding.story.howItPlays.kinds.article",
  [TrackItemType.VIDEO]: "courseLanding.story.howItPlays.kinds.video",
  [TrackItemType.JOURNAL]: "courseLanding.story.howItPlays.kinds.journal",
  [TrackItemType.ANNOTATED_ARTIFACT]: "courseLanding.story.howItPlays.kinds.annotation",
  [TrackItemType.GAME]: "courseLanding.story.howItPlays.kinds.game",
};

/**
 * What the course is made of and the rules of play, stated before the learner
 * commits: counts per component type, then the promises the platform keeps.
 */
export const HowItPlays: FC<{
  sections: PublicTrackOutlineSection[];
  personaName: string | null;
}> = ({ sections, personaName }) => {
  const { t } = useTranslation();
  const kinds = countItemsByKind(sections);
  const hasRoleplays = kinds.some(kind => kind.type === TrackItemType.ROLEPLAY);

  const promises = [
    ...(hasRoleplays
      ? [t("courseLanding.story.howItPlays.retry"), t("courseLanding.story.howItPlays.debrief")]
      : []),
    t("courseLanding.story.howItPlays.keep"),
  ];

  return (
    <section
      className="border-t border-border-light py-8"
      aria-labelledby="story-plays-heading"
      data-testid="story-how-it-plays"
    >
      <SectionHeading id="story-plays-heading">
        {t("courseLanding.story.howItPlays.title")}
      </SectionHeading>
      <ul className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {kinds.map(({ type, count }) => (
          <li key={type} className="rounded-[10px] bg-background-tertiary p-3">
            <span className="flex items-center gap-1.5 text-gray-500">
              <TrackTypeIcon type={type} className="h-4 w-4" />
            </span>
            <p className="mt-1 font-primary text-2xl font-medium leading-tight text-gray-900">
              {count}
            </p>
            <p className="font-primary text-sm font-medium text-gray-900">
              {t(`${KIND_TITLE_KEY[type]}.title`, { count })}
            </p>
            <p className="text-sm text-gray-700">
              {type === TrackItemType.ROLEPLAY && personaName
                ? t("courseLanding.story.howItPlays.kinds.roleplay.withPersona", {
                    name: personaShortName(personaName),
                  })
                : t(`${KIND_TITLE_KEY[type]}.hint`)}
            </p>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2">
        {promises.map(promise => (
          <li key={promise} className="flex gap-2 font-secondary text-base text-gray-700">
            <svg
              viewBox="0 0 24 24"
              className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            {promise}
          </li>
        ))}
      </ul>
    </section>
  );
};

const Portrait: FC<{ name: string; imageUrl?: string | null; tone: "persona" | "guide" }> = ({
  name,
  imageUrl,
  tone,
}) =>
  imageUrl ? (
    <img src={imageUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-primary text-base font-medium ${
        tone === "guide" ? "bg-primary-50 text-primary-600" : "bg-gray-200 text-gray-600"
      }`}
    >
      {personaInitial(name)}
    </span>
  );

/** Who the learner will meet, with the XP the course can pay alongside. */
export const StoryCastAndXp: FC<{
  cast: PublicTrackStory["cast"];
  xp: PublicTrackStory["xp"];
}> = ({ cast, xp }) => {
  const { t } = useTranslation();
  const hasCast = Boolean(cast?.caller || cast?.guide);
  if (!hasCast && !xp) return null;

  return (
    <section
      className={`grid gap-6 border-t border-border-light py-8 ${hasCast && xp ? "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}
      data-testid="story-cast"
    >
      {hasCast && (
        <div aria-labelledby="story-cast-heading">
          <SectionHeading id="story-cast-heading">
            {t("courseLanding.story.cast.title")}
          </SectionHeading>
          <ul className="flex flex-col gap-4">
            {cast?.caller && (
              <li className="flex gap-3">
                <Portrait name={cast.caller.name} imageUrl={cast.caller.imageUrl} tone="persona" />
                <div className="min-w-0">
                  <p className="font-primary text-[15px] font-medium text-gray-900">
                    {t("courseLanding.story.cast.caller", { name: cast.caller.name })}
                  </p>
                  {cast.caller.line && (
                    <p className="break-words font-secondary text-base leading-snug text-gray-700">
                      {cast.caller.line}
                    </p>
                  )}
                </div>
              </li>
            )}
            {cast?.guide && (
              <li className="flex gap-3">
                <Portrait name={cast.guide.name} tone="guide" />
                <div className="min-w-0">
                  <p className="font-primary text-[15px] font-medium text-gray-900">
                    {cast.guide.role ? `${cast.guide.name} · ${cast.guide.role}` : cast.guide.name}
                  </p>
                  {cast.guide.line && (
                    <p className="break-words font-secondary text-base leading-snug text-gray-700">
                      {cast.guide.line}
                    </p>
                  )}
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
      {xp && (
        <div
          className="self-start rounded-xl border border-border-light bg-white p-4"
          data-testid="story-xp"
        >
          <p className="font-primary text-[15px] font-medium text-gray-900">
            {t("courseLanding.story.xp.title")}
          </p>
          <p className="mt-1 font-secondary text-base leading-snug text-gray-700">
            {xp.hasRoleplays
              ? t("courseLanding.story.xp.withPractice", { xp: xp.activityXp })
              : t("courseLanding.story.xp.activitiesOnly", { xp: xp.activityXp })}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t("courseLanding.story.xp.keep")}</p>
        </div>
      )}
    </section>
  );
};

/**
 * What the course contains that could be hard to meet unprepared, said before
 * the learner starts, with the promise that they can stop at any point.
 */
export const ContentNotes: FC<{ notes: NonNullable<PublicTrackStory["contentNotes"]> }> = ({
  notes,
}) => {
  const { t } = useTranslation();
  return (
    <section className="border-t border-border-light py-8" data-testid="story-content-notes">
      <div className="flex gap-3 rounded-xl border border-status-ochreDot/30 bg-status-ochreBg px-4 py-3.5">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-ochreFg"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        <div className="min-w-0">
          <h2 className="font-primary text-[15px] font-medium text-status-ochreFg">
            {t("courseLanding.story.notes.title")}
          </h2>
          <p className="break-words font-secondary text-base leading-relaxed text-status-ochreFg">
            {notes.warnings.length > 0 &&
              `${t("courseLanding.story.notes.includes", {
                warnings: describeWarnings(notes.warnings, t),
              })} `}
            {t("courseLanding.story.notes.pause")}
          </p>
          {notes.extraNote && (
            <p className="mt-2 break-words font-secondary text-base leading-relaxed text-status-ochreFg">
              {notes.extraNote}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
