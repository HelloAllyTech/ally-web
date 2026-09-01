import { FC, Fragment, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Table, TableBody, TableRow, TableCell } from "@ally-ui-mono/ui-shared";
import { AskAiIcon } from "@assets";
import { Citation } from "@types";

/**
 * A timestamp Ally wrote to point at a moment in the transcript, e.g. `[4:12]`.
 * The chat prompt tells it to format these exactly as the transcript does and
 * never to invent one, and the backend resolves each into a `Citation` against
 * the real transcript row — see `processCitations` in
 * scenario-session-chat.service.ts.
 */
const TIMESTAMP = /\[(\d{1,2}:\d{2})\]/g;

/** Inline `**bold**`, matching how the note itself renders emphasis. */
const BOLD = /\*\*(.+?)\*\*/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "timestamp"; value: string };

const parseSegments = (line: string): Segment[] => {
  const segments: Segment[] = [];
  const pattern = new RegExp(`${TIMESTAMP.source}|${BOLD.source}`, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", value: line.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "timestamp", value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "bold", value: match[2] });
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < line.length) segments.push({ type: "text", value: line.slice(cursor) });
  return segments.length ? segments : [{ type: "text", value: line }];
};

/**
 * The transcript lines Ally's answer rests on, listed under it.
 *
 * The inline timestamp says WHERE it is looking; this says WHAT was said there,
 * which is the part the learner can actually check the claim against. Both,
 * rather than one or the other, is also what the mobile app renders.
 */
const ReplyCitations: FC<{
  citations: Citation[];
  counsellorName: string;
  agentName?: string;
}> = ({ citations, counsellorName, agentName }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-primary-100">
      <div className="w-full bg-[#E2F2FF80] px-3 py-2 font-primary text-sm">
        {t("postSim.debrief.transcriptReferences")}
      </div>
      <Table className="w-full font-primary text-xs">
        <TableBody className="text-sm">
          {citations.map(citation => (
            <TableRow key={citation.transcriptId} className="w-full">
              <TableCell className="w-[8%] min-w-[50px] px-3 py-2 align-top text-typography-800">
                {citation.timestamp}
              </TableCell>
              <TableCell className="w-[92%] font-primary text-typography-900">
                <span className="pr-1 font-medium">
                  {/* -1 is the simulated client; anything else is the learner. */}
                  {citation.senderId === -1
                    ? `${agentName} (${t("transcription.aiClientSuffix")})`
                    : counsellorName}
                  :
                </span>
                {citation.content}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface ReplyBubbleProps {
  role: string;
  content: string;
  /** Transcript rows the backend resolved from the timestamps in `content`. */
  citations?: Citation[];
  /**
   * Opens a cited moment in the annotated transcript. Absent when there is no
   * transcript tab to open — the roleplay has it switched off — in which case
   * timestamps render as plain text rather than as chips that go nowhere,
   * mirroring how SupervisorNote handles its own anchors.
   */
  onOpenMoment?: (messageId: string) => void;
  counsellorName?: string;
  agentName?: string;
}

/**
 * A reply in the conversation the debrief note opened. Deliberately plainer
 * than the note itself: the note is the thing being read, the replies are a
 * conversation about it.
 *
 * Ally is told to ground every factual claim in the transcript, so its replies
 * carry timestamps. Those used to render as literal `[4:12]` text and the
 * resolved citations were dropped on the floor — the backend computed them and
 * nothing displayed them.
 */
export const ReplyBubble: FC<ReplyBubbleProps> = ({
  role,
  content,
  citations = [],
  onOpenMoment,
  counsellorName,
  agentName,
}) => {
  const { t } = useTranslation();
  const isLearner = role === "user";

  // A timestamp is only worth making clickable if the backend actually
  // resolved it to a transcript row; an unresolved one stays plain text.
  const citationByTimestamp = useMemo(
    () => new Map(citations.map(citation => [citation.timestamp, citation])),
    [citations],
  );

  const lines = useMemo(() => content.split("\n"), [content]);

  return (
    <div className={`flex w-full ${isLearner ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-[20px] px-4 py-2.5 ${isLearner ? "bg-primary-50" : ""}`}>
        <div className="flex items-start gap-3">
          {!isLearner && <AskAiIcon className="mt-0.5 h-8 w-8 shrink-0" />}
          <div className="flex flex-col gap-1">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex} className="break-words font-primary text-base">
                {parseSegments(line).map((segment, segmentIndex) => {
                  if (segment.type === "bold") {
                    return (
                      <strong key={segmentIndex} className="font-semibold">
                        {segment.value}
                      </strong>
                    );
                  }
                  if (segment.type === "timestamp") {
                    const citation = citationByTimestamp.get(segment.value);
                    if (!citation || !onOpenMoment) {
                      return <Fragment key={segmentIndex}>[{segment.value}]</Fragment>;
                    }
                    return (
                      <button
                        key={segmentIndex}
                        type="button"
                        onClick={() => onOpenMoment(String(citation.transcriptId))}
                        aria-label={t("postSim.debrief.momentLabel")}
                        className="border-none bg-transparent p-0 font-medium text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        [{segment.value}]
                      </button>
                    );
                  }
                  return <Fragment key={segmentIndex}>{segment.value}</Fragment>;
                })}
              </span>
            ))}
            {citations.length > 0 && (
              <ReplyCitations
                citations={citations}
                counsellorName={counsellorName || t("transcription.youLabel")}
                agentName={agentName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
