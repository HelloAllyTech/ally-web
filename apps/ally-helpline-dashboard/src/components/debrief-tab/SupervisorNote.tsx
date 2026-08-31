import { FC, Fragment, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { AskAiIcon } from "@assets";

import { DebriefSection, isLabelledSectionKey, parseDebriefSections } from "./debriefSections";

/**
 * Ally anchors specific moments in the note as `[[msg:<messageId>]]`. The
 * learner never sees the raw id — it becomes a chip that opens that moment in
 * the annotated transcript. The note is written so every sentence still reads
 * correctly with its anchor removed, which is what lets us drop an anchor we
 * cannot resolve instead of rendering a dead link.
 */
const MOMENT_ANCHOR = /\[\[msg:([^\]]+)\]\]/g;

/** Inline `**bold**`, matching how the chat bubbles already render emphasis. */
const BOLD = /\*\*(.+?)\*\*/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "moment"; messageId: string };

const parseSegments = (line: string): Segment[] => {
  const segments: Segment[] = [];
  const pattern = new RegExp(`${MOMENT_ANCHOR.source}|${BOLD.source}`, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", value: line.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "moment", messageId: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: "bold", value: match[2] });
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < line.length) segments.push({ type: "text", value: line.slice(cursor) });
  return segments;
};

interface SupervisorNoteProps {
  note: string;
  /**
   * Opens the anchored moment in the annotated transcript. When absent — e.g.
   * the transcript tab is switched off for this roleplay — anchors render as
   * plain text rather than as chips that would go nowhere.
   */
  onOpenMoment?: (messageId: string) => void;
  /**
   * Drops the note's closing invitation to reply. Set where there is no reply
   * thread to accept one — the Roleplay Logs surfaces — because a note that
   * ends "reply and we'll talk it through" next to nothing to reply in reads
   * like a broken screen. Only works on notes carrying the `[closing]` marker;
   * a note written before sections existed has the invitation buried in its
   * prose and keeps it.
   */
  hideClosing?: boolean;
}

export const SupervisorNote: FC<SupervisorNoteProps> = ({
  note,
  onOpenMoment,
  hideClosing = false,
}) => {
  const { t } = useTranslation();
  const sections = useMemo(() => {
    const parsed = parseDebriefSections(note);
    return hideClosing ? parsed.filter(section => section.key !== "closing") : parsed;
  }, [note, hideClosing]);

  const renderParagraph = (paragraph: string, paragraphIndex: number) => (
    <p key={paragraphIndex} className="font-primary text-base leading-relaxed text-typography-900">
      {paragraph.split("\n").map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {parseSegments(line).map((segment, segmentIndex) => {
            if (segment.type === "bold") {
              return (
                <strong key={segmentIndex} className="font-semibold">
                  {segment.value}
                </strong>
              );
            }
            if (segment.type === "moment") {
              if (!onOpenMoment) return null;
              return (
                <button
                  key={segmentIndex}
                  type="button"
                  onClick={() => onOpenMoment(segment.messageId)}
                  aria-label={t("postSim.debrief.momentLabel")}
                  title={t("postSim.debrief.momentLabel")}
                  className="mx-0.5 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 align-baseline font-primary text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                >
                  {t("postSim.debrief.momentLabel")}
                </button>
              );
            }
            return <span key={segmentIndex}>{segment.value}</span>;
          })}
        </Fragment>
      ))}
    </p>
  );

  const renderSection = (section: DebriefSection, sectionIndex: number) => (
    <div key={sectionIndex} className="flex flex-col gap-1.5">
      {/* The heading is a signpost, not a title: set quieter than the prose it
          introduces, so a scanning learner finds the part they want without the
          note starting to read like a report. */}
      {isLabelledSectionKey(section.key) && (
        <h3 className="font-primary text-xs font-semibold uppercase tracking-wide text-typography-700">
          {t(`postSim.debrief.section.${section.key}`)}
        </h3>
      )}
      <div className="flex flex-col gap-3">{section.paragraphs.map(renderParagraph)}</div>
    </div>
  );

  return (
    <div className="flex w-full gap-3" data-testid="supervisor-note">
      <AskAiIcon className="mt-1 h-8 w-8 shrink-0" />
      {/* Capped measure: the card is 896px wide and the note runs to five
          paragraphs, which at full width is ~110 characters a line — too long
          to track comfortably in prose this personal. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[68ch]">
        <div className="flex items-center gap-2">
          <span className="font-primary text-sm font-semibold text-typography-900">
            {t("postSim.debrief.from")}
          </span>
          {/* Disclosure sits next to the author, not buried in a footer: a note
              written in a supervisor's voice has to say plainly that a
              supervisor did not write it. */}
          <Tooltip label={t("postSim.debrief.aiTooltip")} align="top">
            <span className="cursor-help rounded-full bg-primary-50 px-2 py-0.5 font-primary text-[11px] font-medium uppercase tracking-wide text-primary-700">
              {t("postSim.debrief.aiLabel")}
            </span>
          </Tooltip>
        </div>

        {/* Sections sit further apart than the paragraphs inside them, which is
            what makes the structure readable without drawing rules across the
            note. An unsectioned note has exactly one child here and looks the
            way it always did. */}
        <div className="flex flex-col gap-5">{sections.map(renderSection)}</div>
      </div>
    </div>
  );
};
