import React, { useEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderBuildEvent } from "@types";

import {
  builderTransition,
  prefersReducedMotion,
  staggerDelayMs,
} from "../../pages/Builder/builderMotion";
import { roleplayMarkdownComponents } from "../roleplay-studio/markdownComponents";

/** Human labels for engine tool names — the raw names leak plumbing. */
const TOOL_LABELS: Record<string, string> = {
  Bash: "Ran a command",
  Read: "Read a file",
  Glob: "Looked for files",
  Grep: "Searched the code",
  Task: "Asked a sub-agent",
  WebFetch: "Fetched a page",
};

const toolLabel = (name: string) => TOOL_LABELS[name] ?? name;

/**
 * Events that carry no reader value on their own. `tool_result` in particular
 * arrives for every single call and is almost always the previous row's
 * output restated — showing both doubles the feed for nothing.
 */
const HIDDEN_TYPES = new Set(["cost", "done", "tool_result", "todo"]);

interface BuildActivityFeedProps {
  events: BuilderBuildEvent[];
  /** True while the run is live — drives auto-scroll and the live pill. */
  isLive: boolean;
}

/** A collapsed row that expands to its full payload. */
const ExpandableRow: React.FC<{
  icon: React.ReactNode;
  summary: React.ReactNode;
  detail?: string;
}> = ({ icon, summary, detail }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-neutral-50 disabled:cursor-default"
        disabled={!detail}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="shrink-0 text-typography-400">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-typography-600">{summary}</span>
        {detail && <span className="shrink-0 text-typography-400">{open ? "−" : "+"}</span>}
      </button>
      {open && detail && (
        <pre className="mt-1 max-h-64 overflow-auto rounded bg-neutral-50 p-2 text-[11px] text-typography-700">
          {detail}
        </pre>
      )}
    </div>
  );
};

/** A file edit, shown as a compact diff rather than a tool row. */
const FileEditRow: React.FC<{ payload: Record<string, any> }> = ({ payload }) => {
  const [open, setOpen] = useState(false);
  const oldText = String(payload.oldText ?? "");
  const newText = String(payload.newText ?? "");

  return (
    <div className="rounded border border-neutral-200 text-xs">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-neutral-50"
        onClick={() => setOpen(prev => !prev)}
      >
        <Tag type="purple" size="sm">
          {payload.operation === "write" ? "new" : "edit"}
        </Tag>
        <span className="min-w-0 flex-1 truncate font-mono text-typography-700">
          {String(payload.path ?? "")}
        </span>
        <span className="shrink-0 text-typography-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="max-h-72 overflow-auto border-t border-neutral-200 p-2 font-mono text-[11px]">
          {oldText && (
            <pre className="whitespace-pre-wrap bg-red-50 p-1 text-red-900">{oldText}</pre>
          )}
          {newText && (
            <pre className="mt-1 whitespace-pre-wrap bg-green-50 p-1 text-green-900">{newText}</pre>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * The build transcript.
 *
 * Read the way a terminal is read, so it defaults to the agent's narration
 * and milestones, with tool detail collapsed behind a click. Showing every
 * tool call expanded would be more transparent and much less useful — the
 * point is to be able to follow along, not to audit every step.
 */
export const BuildActivityFeed: React.FC<BuildActivityFeedProps> = ({ events, isLive }) => {
  const strings = en.builder.build;
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  // Auto-scroll only while the reader is already at the bottom. Yanking the
  // view back down while someone is reading earlier output is the single most
  // irritating thing a live log can do.
  useEffect(() => {
    if (!pinnedToBottom || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [events, pinnedToBottom]);

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    setPinnedToBottom(distance < 80);
  };

  const jumpToLive = () => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    setPinnedToBottom(true);
  };

  const visible = events.filter(event => !HIDDEN_TYPES.has(event.type));

  const renderEvent = (event: BuilderBuildEvent, index: number) => {
    const payload = event.payload ?? {};
    const style = prefersReducedMotion()
      ? undefined
      : {
          animation: "builderFadeIn 240ms both",
          animationDelay: `${staggerDelayMs(index)}ms`,
          transition: builderTransition(["opacity"], "fast"),
        };

    switch (event.type) {
      case "text":
        return (
          <div key={event.id} style={style} className="prose prose-sm max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
              {String(payload.text ?? "")}
            </ReactMarkdown>
          </div>
        );

      case "tool_call":
        return (
          <div key={event.id} style={style}>
            <ExpandableRow
              icon="›"
              summary={
                <>
                  <span className="font-medium">{toolLabel(String(payload.name ?? ""))}</span>
                  {payload.summary ? ` — ${payload.summary}` : ""}
                </>
              }
            />
          </div>
        );

      case "file_edit":
        return (
          <div key={event.id} style={style}>
            <FileEditRow payload={payload} />
          </div>
        );

      case "stage_change":
        return (
          <div key={event.id} style={style} className="flex items-center gap-2 py-1">
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-typography-500">
              {en.builder.stages[String(payload.stage ?? "")] ?? payload.stage}
            </span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
        );

      case "plan":
        return (
          <Tile key={event.id} style={style} className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-typography-500">
              {strings.planHeading}
            </p>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
                {String(payload.text ?? "")}
              </ReactMarkdown>
            </div>
          </Tile>
        );

      case "test_output":
        return (
          <div key={event.id} style={style}>
            <ExpandableRow
              icon="⌘"
              summary={strings.testOutput}
              detail={String(payload.text ?? "")}
            />
          </div>
        );

      case "verification":
        return (
          <Tile key={event.id} style={style} className="border-l-4 border-l-primary-500 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-typography-500">
              {strings.verificationHeading}
            </p>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
                {String(payload.text ?? "")}
              </ReactMarkdown>
            </div>
          </Tile>
        );

      case "e2e_evidence":
        return (
          <div key={event.id} style={style}>
            <ExpandableRow
              icon="◉"
              summary={strings.e2eEvidence}
              detail={String(payload.text ?? "")}
            />
          </div>
        );

      case "e2e_skipped":
        return (
          <p key={event.id} style={style} className="text-xs italic text-typography-500">
            {strings.e2eSkipped(String(payload.text ?? ""))}
          </p>
        );

      case "pr_opened":
        return (
          <Tile key={event.id} style={style} className="text-sm">
            <a
              href={String(payload.prUrl ?? "#")}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary-600 hover:underline"
            >
              {payload.repo} #{payload.prNumber}
            </a>
          </Tile>
        );

      case "report":
        return (
          <Tile key={event.id} style={style} className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-typography-500">
              {strings.reportHeading}
            </p>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
                {String(payload.text ?? payload.contentMd ?? "")}
              </ReactMarkdown>
            </div>
          </Tile>
        );

      case "error":
        return (
          <p key={event.id} style={style} className="text-sm text-support-error">
            {String(payload.text ?? payload.message ?? "")}
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3">
        {visible.length === 0 ? (
          <p className="mt-8 text-center text-sm text-typography-500">
            {isLive ? strings.feedStarting : strings.feedEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((event, index) => renderEvent(event, index))}
          </div>
        )}
      </div>

      {/* Only offered when it would actually do something: a pill inviting you
          to jump to a place you are already at is noise. */}
      {!pinnedToBottom && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <Button kind="secondary" size="sm" onClick={jumpToLive}>
            {strings.jumpToLive}
          </Button>
        </div>
      )}
    </div>
  );
};
