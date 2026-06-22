import { FC, useEffect, useRef } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { en } from "@constants";
import { CheckCircle, Document, FailIcon } from "@icons";

import { Accordion } from "../../accordion";
import type {
  FeedEntry,
  FieldItem,
  FieldProgressEntry,
  RoundEntry,
  StatusEntry,
  TerminalEntry,
  UserMessageEntry,
} from "./feedEntry.types";
import { scoreColor } from "./scoreColor";

const copy = en.simulation.agentBuilder;

export interface OpenDetailArgs {
  reportId: string;
  reportMarkdown?: string;
  metrics?: Record<string, number>;
  score?: number | null;
  round?: number;
}

interface CopilotFeedProps {
  feed: FeedEntry[];
  pendingMessage: { text: string; turnKind: "brief" | "revise" } | null;
  onOpenDetail: (args: OpenDetailArgs) => void;
}

const Spinner: FC = () => (
  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent" />
);

const StatusIcon: FC<{ status: "active" | "done" | "error" }> = ({ status }) => {
  if (status === "active") return <Spinner />;
  if (status === "error") return <FailIcon size={16} className="shrink-0 text-[#FE6F64]" />;
  return <CheckCircle size={16} className="shrink-0 text-[#43A047]" />;
};

const UserBubble: FC<{ text: string }> = ({ text }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary-500 px-4 py-2.5 text-sm text-white">
      {text}
    </div>
  </div>
);

const StatusLine: FC<{ entry: StatusEntry; onOpenDetail: CopilotFeedProps["onOpenDetail"] }> = ({
  entry,
  onOpenDetail,
}) => {
  if (entry.isHeader) {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-typography-900">
        <StatusIcon status={entry.status} />
        {entry.label}
      </div>
    );
  }
  const tone =
    entry.tone === "error"
      ? "text-[#FE6F64]"
      : entry.tone === "info"
        ? "text-typography-500 italic"
        : "text-typography-700";
  return (
    <div className="flex items-center gap-2 pl-1 text-sm">
      <StatusIcon status={entry.status} />
      <span className={tone}>{entry.label}</span>
      {entry.reportId && entry.status === "active" && (
        <button
          type="button"
          onClick={() => onOpenDetail({ reportId: entry.reportId! })}
          className="ml-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <Document size={14} />
          {copy.viewLiveConversation}
        </button>
      )}
    </div>
  );
};

const FieldItemRow: FC<{ item: FieldItem }> = ({ item }) => (
  <div className="flex items-center gap-2 py-1 text-sm">
    <StatusIcon status={item.status} />
    <span
      className={`capitalize ${item.status === "error" ? "text-[#FE6F64] line-through" : "text-typography-700"}`}
    >
      {item.label}
    </span>
  </div>
);

const FieldProgressBlock: FC<{ entry: FieldProgressEntry }> = ({ entry }) => {
  const done = entry.fields.filter(f => f.status !== "active").length;
  const anyActive = entry.fields.some(f => f.status === "active");
  return (
    <div className="rounded-md border border-border-light bg-neutral-50 p-3">
      <details open={anyActive}>
        <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-typography-800">
          {anyActive ? <Spinner /> : <StatusIcon status="done" />}
          {copy.generatingFields} ({done}/{entry.fields.length})
        </summary>
        <div className="mt-2 pl-1">
          {entry.fields.map(f => (
            <FieldItemRow key={f.fieldName} item={f} />
          ))}
        </div>
      </details>
    </div>
  );
};

const RoundBlock: FC<{ entry: RoundEntry; onOpenDetail: CopilotFeedProps["onOpenDetail"] }> = ({
  entry,
  onOpenDetail,
}) => {
  const scoreBadge =
    entry.score != null ? (
      <span
        className="inline-flex h-6 min-w-[36px] items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
        style={{ backgroundColor: scoreColor(entry.score) }}
      >
        {entry.score}
      </span>
    ) : null;

  return (
    <Accordion
      defaultExpanded
      headerTitle={
        <div className="flex items-center gap-3">
          <span className="text-base font-medium text-typography-900">
            {copy.roundLabel(entry.round)}
          </span>
          {scoreBadge}
        </div>
      }
      headerActions={
        entry.reportId ? (
          <button
            type="button"
            onClick={() =>
              onOpenDetail({
                reportId: entry.reportId!,
                reportMarkdown: entry.reportMarkdown,
                metrics: entry.metrics,
                score: entry.score,
                round: entry.round,
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-border-light px-3 py-1.5 text-xs text-typography-700 hover:bg-neutral-100"
          >
            <Document size={14} />
            {copy.viewDetails}
          </button>
        ) : undefined
      }
    >
      {entry.reportMarkdown ? (
        <div className="prose prose-sm max-w-none text-typography-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.reportMarkdown}</ReactMarkdown>
        </div>
      ) : (
        <span className="text-sm text-typography-500">{copy.noEvaluationYet}</span>
      )}
    </Accordion>
  );
};

const TerminalBanner: FC<{ entry: TerminalEntry }> = ({ entry }) => {
  const isSuccess = entry.outcome === "succeeded";
  return (
    <div
      className={`rounded-md border p-4 text-sm font-medium ${
        isSuccess
          ? "border-success-200 bg-success-50 text-typography-900"
          : "border-amber-200 bg-amber-50 text-typography-900"
      }`}
    >
      {entry.label}
      {entry.reason && !isSuccess && (
        <div className="mt-1 text-xs font-normal text-typography-600">{entry.reason}</div>
      )}
    </div>
  );
};

/** The scrolling activity feed. Sticks to the bottom unless the user scrolls up. */
export const CopilotFeed: FC<CopilotFeedProps> = ({ feed, pendingMessage, onOpenDetail }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [feed, pendingMessage]);

  const isEmpty = feed.length === 0 && !pendingMessage;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto custom-scrollbar"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-1 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm text-typography-600">{copy.emptyFeedHint}</p>
          </div>
        ) : (
          feed.map(entry => {
            switch (entry.kind) {
              case "user-message":
                return <UserBubble key={entry.id} text={(entry as UserMessageEntry).text} />;
              case "status":
                return <StatusLine key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />;
              case "field-progress":
                return <FieldProgressBlock key={entry.id} entry={entry} />;
              case "round":
                return <RoundBlock key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />;
              case "terminal":
                return <TerminalBanner key={entry.id} entry={entry} />;
              default:
                return null;
            }
          })
        )}
        {pendingMessage && (
          <>
            <UserBubble text={pendingMessage.text} />
            <div className="flex items-center gap-2 pl-1 text-sm">
              <Spinner />
              <span className="text-typography-500">{copy.startingBuild}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
