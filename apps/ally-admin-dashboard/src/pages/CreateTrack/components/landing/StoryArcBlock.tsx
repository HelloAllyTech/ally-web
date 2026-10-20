import { FC } from "react";

import { en } from "@constants";
import { LANDING_LIMITS, LandingChapter, StoryBeat } from "@types";

import {
  HelpTooltip,
  LandingBlockPanel,
  LandingTextField,
  hintClass,
  inputClass,
  labelClass,
} from "./LandingFields";
import { LandingBlockProps, LandingSectionsProps } from "./landingTypes";

const BEAT_ORDER: StoryBeat[] = [
  StoryBeat.SETUP,
  StoryBeat.CONFLICT,
  StoryBeat.CHALLENGE,
  StoryBeat.CLIMAX,
  StoryBeat.RESOLUTION,
];

export const StoryArcBlock: FC<LandingBlockProps & LandingSectionsProps> = ({
  page,
  update,
  sections,
}) => {
  const copy = en.courseLanding.arc;
  const chaptersBySection = new Map(page.arc.chapters.map(chapter => [chapter.sectionId, chapter]));

  const setChapter = (sectionId: string, patch: Partial<Pick<LandingChapter, "beat" | "teaser">>) =>
    update(draft => {
      const existing = draft.arc.chapters.find(chapter => chapter.sectionId === sectionId);
      if (existing) Object.assign(existing, patch);
      else draft.arc.chapters.push({ sectionId, beat: null, teaser: null, ...patch });
    });

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.arc}
      fallback={en.courseLanding.fallback.arc}
      isOff={!page.arc.enabled}
      intro={copy.helper}
    >
      {sections.length === 0 && <p className={hintClass}>{copy.empty}</p>}

      <div className="flex flex-col gap-3">
        {sections.map((section, index) => {
          const sectionId = section.serverId;
          const chapter = sectionId ? chaptersBySection.get(sectionId) : undefined;
          const title = section.title?.trim() || `Section ${index + 1}`;
          return (
            <div
              key={section.localId}
              className="flex flex-col gap-3 border border-border-light rounded-md p-3"
              data-testid="landing-chapter"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-typography-500">
                    {copy.chapterHeading(index + 1)}
                  </span>
                  <span className="text-sm font-medium text-typography-900 truncate">{title}</span>
                </div>
                {sectionId && (
                  <span className="inline-flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1.5 text-sm text-typography-800">
                      <input
                        type="radio"
                        name="landing-hard-call"
                        className="accent-primary-500"
                        checked={page.arc.hardCallSectionId === sectionId}
                        onChange={() => {
                          update(draft => {
                            draft.arc.hardCallSectionId = sectionId;
                          });
                        }}
                        aria-label={`${copy.hardCall.label}: ${title}`}
                      />
                      {copy.hardCall.label}
                    </label>
                    <HelpTooltip label={copy.hardCall.tooltip} name={copy.hardCall.label} />
                  </span>
                )}
              </div>

              {sectionId ? (
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      <label htmlFor={`landing-beat-${sectionId}`} className={labelClass}>
                        {copy.beat.label}
                      </label>
                      <HelpTooltip label={copy.beat.tooltip} name={copy.beat.label} />
                    </span>
                    <select
                      id={`landing-beat-${sectionId}`}
                      className={inputClass}
                      value={chapter?.beat ?? ""}
                      onChange={event =>
                        setChapter(sectionId, {
                          beat:
                            event.target.value === "" ? null : (event.target.value as StoryBeat),
                        })
                      }
                    >
                      <option value="">{copy.beat.none}</option>
                      {BEAT_ORDER.map(beat => (
                        <option key={beat} value={beat}>
                          {copy.beat.options[beat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <LandingTextField
                    label={copy.teaser.label}
                    value={chapter?.teaser ?? null}
                    onChange={value => setChapter(sectionId, { teaser: value })}
                    max={LANDING_LIMITS.teaserMax}
                    placeholder={copy.teaser.placeholder}
                  />
                </div>
              ) : (
                <p className={hintClass}>{copy.unsaved}</p>
              )}
            </div>
          );
        })}
      </div>

      {page.arc.hardCallSectionId && (
        <button
          type="button"
          onClick={() => {
            update(draft => {
              draft.arc.hardCallSectionId = null;
            });
          }}
          className="self-start text-xs text-primary-500 hover:underline"
        >
          {copy.hardCall.clear}
        </button>
      )}
    </LandingBlockPanel>
  );
};
