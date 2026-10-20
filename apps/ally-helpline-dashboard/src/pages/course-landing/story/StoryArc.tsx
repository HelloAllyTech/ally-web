import { FC } from "react";

import { useTranslation } from "react-i18next";

import { TrackTypeIcon } from "@components";
import { PublicTrackOutlineSection, PublicTrackStory, StoryBeat, TrackItemType } from "@types";

import {
  ARC_HEIGHT,
  ARC_WIDTH,
  arcPath,
  arcPoints,
  chapterKinds,
  chaptersWithNotes,
} from "./storyUtils";

const BEAT_KEY: Record<StoryBeat, string> = {
  [StoryBeat.SETUP]: "courseLanding.story.beats.setup",
  [StoryBeat.CONFLICT]: "courseLanding.story.beats.conflict",
  [StoryBeat.CHALLENGE]: "courseLanding.story.beats.challenge",
  [StoryBeat.CLIMAX]: "courseLanding.story.beats.climax",
  [StoryBeat.RESOLUTION]: "courseLanding.story.beats.resolution",
};

const KIND_KEY: Record<TrackItemType, string> = {
  [TrackItemType.ROLEPLAY]: "tracks2.meta.roleplay",
  [TrackItemType.CASE]: "tracks2.meta.case",
  [TrackItemType.QUIZ]: "tracks2.meta.quiz",
  [TrackItemType.ARTICLE]: "tracks2.meta.article",
  [TrackItemType.VIDEO]: "tracks2.meta.video",
  [TrackItemType.JOURNAL]: "tracks2.meta.journal",
  [TrackItemType.ANNOTATED_ARTIFACT]: "tracks2.meta.annotationTranscript",
  [TrackItemType.GAME]: "courseLanding.story.kinds.game",
};

interface StoryArcProps {
  sections: PublicTrackOutlineSection[];
  story: PublicTrackStory;
}

/**
 * The course as a story: a tension curve that peaks at the hard call, then
 * one row per chapter with its teaser. A teaser peeks at what happens without
 * locking anything — nothing on this page is locked, it is a preview.
 */
export const StoryArc: FC<StoryArcProps> = ({ sections, story }) => {
  const { t } = useTranslation();
  const configured = new Map(
    (story.arc?.chapters ?? []).map(chapter => [chapter.sectionId, chapter]),
  );
  const hardCallId = story.arc?.hardCallSectionId ?? null;
  const notes = chaptersWithNotes(story);

  const chapters = sections.map(section => ({
    section,
    beat: configured.get(section.id)?.beat ?? null,
    teaser: configured.get(section.id)?.teaser ?? null,
    isHardCall: section.id === hardCallId,
  }));
  const points = arcPoints(chapters);
  // The curve only earns its space when there is a shape to show, and on a
  // phone its labels would be too small to read, so it starts at `sm`. With
  // the arc switched off the chapters still list, as a plain outline.
  const showCurve = Boolean(story.arc) && chapters.length >= 3;

  return (
    <section
      className="border-t border-border-light py-8"
      aria-labelledby="story-arc-heading"
      data-testid="story-arc"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {t("courseLanding.story.arc.eyebrow")}
      </p>
      <h2
        id="story-arc-heading"
        className="mb-2 mt-1 font-primary text-xl font-medium text-gray-900"
      >
        {t("courseLanding.story.arc.title", { count: chapters.length })}
      </h2>

      {showCurve && (
        <svg
          viewBox={`0 0 ${ARC_WIDTH} ${ARC_HEIGHT}`}
          className="my-2 hidden h-auto w-full sm:block"
          role="img"
          aria-label={t("courseLanding.story.arc.curveLabel")}
        >
          <path d={arcPath(points)} fill="none" className="stroke-gray-300" strokeWidth={2} />
          {points.map((point, index) => (
            <g key={chapters[index].section.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.isHardCall ? 10 : 6.5}
                className={
                  point.isHardCall
                    ? "fill-primary-50 stroke-primary-500"
                    : "fill-white stroke-gray-500"
                }
                strokeWidth={point.isHardCall ? 2 : 1.5}
              />
              <text
                x={point.x}
                y={point.isHardCall ? point.y - 17 : point.y + 21}
                textAnchor="middle"
                className={`font-primary text-[12px] ${
                  point.isHardCall ? "fill-primary-600" : "fill-gray-500"
                }`}
              >
                {point.isHardCall
                  ? t("courseLanding.story.arc.hardCall")
                  : point.beat
                    ? t(BEAT_KEY[point.beat])
                    : t("courseLanding.story.arc.chapterShort", { number: index + 1 })}
              </text>
            </g>
          ))}
        </svg>
      )}

      <ol className="mt-2">
        {chapters.map(({ section, teaser, isHardCall }, index) => {
          const kinds = chapterKinds(section);
          const blurb = teaser || section.description;
          return (
            <li
              key={section.id}
              className={`grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-4 ${
                isHardCall
                  ? "my-1 rounded-xl border border-primary-200 bg-white px-3"
                  : index > 0 && !chapters[index - 1].isHardCall
                    ? "border-t border-border-light"
                    : ""
              }`}
              data-testid={isHardCall ? "story-chapter-hard-call" : "story-chapter"}
            >
              <span
                className={`font-primary text-xl font-medium ${
                  isHardCall ? "text-primary-500" : "text-gray-500"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="mb-1 break-words font-primary text-base font-medium text-gray-900 sm:text-[17px]">
                  {section.title}
                </h3>
                {blurb ? (
                  <p
                    className={`break-words font-secondary text-base leading-relaxed text-gray-700 ${
                      teaser ? "italic" : ""
                    }`}
                  >
                    {blurb}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t("courseLanding.sectionItems", { count: section.items.length })}
                  </p>
                )}
                {(kinds.length > 0 || isHardCall || notes.has(index + 1)) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isHardCall && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-600">
                        {t("courseLanding.story.arc.hardCall")}
                      </span>
                    )}
                    {kinds.map(kind => (
                      <span
                        key={kind}
                        className="inline-flex items-center gap-1 rounded-full bg-background-tertiary px-2.5 py-0.5 text-xs text-gray-700"
                      >
                        <TrackTypeIcon type={kind} className="h-3.5 w-3.5" />
                        {t(KIND_KEY[kind])}
                      </span>
                    ))}
                    {notes.has(index + 1) && (
                      <span className="inline-flex items-center rounded-full bg-status-ochreBg px-2.5 py-0.5 text-xs text-status-ochreFg">
                        {t("courseLanding.story.arc.contentNote")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
