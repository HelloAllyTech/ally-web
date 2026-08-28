import React, { useEffect, useMemo, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderBuildEvent } from "@types";
import { asAgentText, asAgentTextList, formatRelativeTime, formatTimestamp } from "@utils";

import { DiffBlock } from "./DiffBlock";
import { formatEventGap } from "./runFormat";
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
 * Events with no row of their own. `tool_result` in particular is not
 * dropped — {@link pairToolResults} reads it out of the full event list and
 * folds it into its call's expandable detail, which is a more useful reading
 * than a duplicate row underneath the call that produced it. `phase_cost` is
 * bookkeeping the header's spend figure already reflects.
 */
const HIDDEN_TYPES = new Set(["cost", "phase_cost", "done", "tool_result", "todo"]);

interface BuildActivityFeedProps {
  events: BuilderBuildEvent[];
  /** True while the run is live — drives auto-scroll and the live pill. */
  isLive: boolean;
}

/** A relative timestamp with the exact moment one hover away, per house convention. */
const EventTimestamp: React.FC<{ createdAt: string }> = ({ createdAt }) => (
  <span
    className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-typography-400"
    title={formatTimestamp(createdAt)}
  >
    {formatRelativeTime(createdAt)}
  </span>
);

/** A collapsed row that expands to its full payload. */
const ExpandableRow: React.FC<{
  icon: React.ReactNode;
  summary: React.ReactNode;
  detail?: string;
  createdAt?: string;
}> = ({ icon, summary, detail, createdAt }) => {
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
        {createdAt && <EventTimestamp createdAt={createdAt} />}
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

/** A file edit, shown as a line-level diff rather than a tool row. */
const FileEditRow: React.FC<{ payload: Record<string, any>; createdAt: string }> = ({
  payload,
  createdAt,
}) => {
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
        <EventTimestamp createdAt={createdAt} />
        <span className="shrink-0 text-typography-400">{open ? "−" : "+"}</span>
      </button>
      {open && <DiffBlock oldText={oldText} newText={newText} />}
    </div>
  );
};

/**
 * A tool call's arguments and — once one is found — its paired result,
 * joined into one expandable detail block. Nothing here assumes a particular
 * correlation field: {@link pairToolResults} tries an explicit call/result id
 * first and falls back to matching same-named calls and results in order.
 */
const buildToolCallDetail = (
  strings: typeof en.builder.build,
  payload: Record<string, any>,
  result: BuilderBuildEvent | undefined,
): string | undefined => {
  const argsSource = payload.input ?? payload.arguments ?? payload.args ?? null;
  const argsText =
    argsSource === null
      ? ""
      : typeof argsSource === "object"
        ? JSON.stringify(argsSource, null, 2)
        : asAgentText(argsSource);

  const parts: string[] = [];
  if (argsText.trim()) parts.push(`${strings.toolArgumentsHeading}\n${argsText}`);

  if (result) {
    const resultPayload = result.payload ?? {};
    const resultText =
      asAgentText(resultPayload.summary) ||
      asAgentText(resultPayload.result) ||
      asAgentText(resultPayload.text) ||
      asAgentText(resultPayload.output);
    parts.push(`${strings.toolResultHeading}\n${resultText || strings.noToolResult}`);
  }

  return parts.length ? parts.join("\n\n") : undefined;
};

/**
 * Pairs each `tool_call` event with the `tool_result` that answers it, over
 * the FULL event list (before the hidden-type filter drops `tool_result`
 * rows from view — they still carry the data a paired call needs to show).
 *
 * Tries an explicit correlation id first (`id`/`toolUseId`/`callId`, however
 * either side happens to carry it), then falls back to matching same-named
 * calls and results in the order they occur — sound because a run only ever
 * has one call for a given tool outstanding at a time.
 */
const pairToolResults = (events: BuilderBuildEvent[]): Map<string, BuilderBuildEvent> => {
  const correlationId = (payload: Record<string, any> | undefined) =>
    asAgentText(payload?.id) || asAgentText(payload?.toolUseId) || asAgentText(payload?.callId);

  const callsById = new Map<string, BuilderBuildEvent>();
  const callQueueByName = new Map<string, BuilderBuildEvent[]>();

  for (const event of events) {
    if (event.type !== "tool_call") continue;
    const id = correlationId(event.payload);
    if (id) callsById.set(id, event);
    const name = asAgentText(event.payload?.name);
    const queue = callQueueByName.get(name) ?? [];
    queue.push(event);
    callQueueByName.set(name, queue);
  }

  const resultByCallRowId = new Map<string, BuilderBuildEvent>();
  const consumed = new Set<string>();

  for (const event of events) {
    if (event.type !== "tool_result") continue;
    const id = correlationId(event.payload);
    let call = id ? callsById.get(id) : undefined;
    if (!call) {
      const name = asAgentText(event.payload?.name);
      call = callQueueByName.get(name)?.find(candidate => !consumed.has(candidate.id));
    }
    if (call && !consumed.has(call.id)) {
      consumed.add(call.id);
      resultByCallRowId.set(call.id, event);
    }
  }

  return resultByCallRowId;
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
  const budgetFeed = en.builder.budget.feed;
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

  // Built over the FULL event list, not `visible` — a tool_result row is
  // filtered out of the feed but still has to be read to answer "what came
  // back" for the call it belongs to.
  const toolResultsByCall = useMemo(() => pairToolResults(events), [events]);

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
                  {asAgentText(payload.summary) ? ` — ${asAgentText(payload.summary)}` : ""}
                </>
              }
              detail={buildToolCallDetail(strings, payload, toolResultsByCall.get(event.id))}
              createdAt={event.createdAt}
            />
          </div>
        );

      case "file_edit":
        return (
          <div key={event.id} style={style}>
            <FileEditRow payload={payload} createdAt={event.createdAt} />
          </div>
        );

      case "stage_change":
        return (
          <div key={event.id} style={style} className="flex items-center gap-2 py-1">
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-typography-500">
              {en.builder.stages[asAgentText(payload.stage)] ?? asAgentText(payload.stage)}
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
              createdAt={event.createdAt}
            />
          </div>
        );

      case "gate_result": {
        // The one card that reports a machine-checked fact rather than the
        // agent's account of itself, so it says so: "Checked" beside a pass,
        // and — when a suite was already red — which failures this change
        // caused versus which it inherited.
        const passed = payload.passed === true;
        const newFailures = asAgentTextList(payload.newFailures);
        const preExisting = asAgentTextList(payload.preExistingFailures);
        const heading = `${asAgentText(payload.repo)} · ${asAgentText(payload.kind)}`;

        return (
          <Tile
            key={event.id}
            style={style}
            className={[
              "border-l-4 text-sm",
              passed ? "border-l-support-success" : "border-l-support-error",
            ].join(" ")}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-typography-500">
                {heading}
              </span>
              <Tag type={passed ? "green" : "red"} size="sm" className="shrink-0">
                {passed ? strings.gatePassed : strings.gateFailed}
              </Tag>
              <span className="text-xs text-typography-400">{strings.gateVerified}</span>
              <span className="ml-auto">
                <EventTimestamp createdAt={event.createdAt} />
              </span>
            </div>
            {asAgentText(payload.command) ? (
              <p className="font-mono text-xs text-typography-500">
                {asAgentText(payload.command)}
              </p>
            ) : null}
            {newFailures.length ? (
              <div className="mt-2">
                <p className="text-xs font-medium text-support-error">
                  {strings.gateNewFailures(newFailures.length)}
                </p>
                <ul className="mt-1 list-inside list-disc font-mono text-xs text-typography-600">
                  {newFailures.map((failure, failureIndex) => (
                    <li key={`${event.id}-new-${failureIndex}`}>{failure}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preExisting.length ? (
              <p className="mt-2 text-xs text-typography-400">
                {strings.gatePreExisting(preExisting.length)}
              </p>
            ) : null}
            {asAgentText(payload.outputTail) ? (
              <div className="mt-2">
                <ExpandableRow
                  icon="⌘"
                  summary={strings.gateOutput}
                  detail={asAgentText(payload.outputTail)}
                />
              </div>
            ) : null}
          </Tile>
        );
      }

      case "verification": {
        const verdict = asAgentText(payload.verdict);
        const objections = Array.isArray(payload.objections) ? payload.objections : [];
        const failed = verdict === "fail";
        const round = Number(payload.round) || null;

        return (
          <Tile
            key={event.id}
            style={style}
            className={[
              "border-l-4 text-sm",
              failed ? "border-l-support-warning" : "border-l-primary-500",
            ].join(" ")}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-typography-500">
                {round ? strings.verificationRoundHeading(round) : strings.verificationHeading}
              </span>
              {verdict ? (
                <Tag type={failed ? "magenta" : "green"} size="sm" className="shrink-0">
                  {failed ? strings.verificationFailed : strings.verificationPassed}
                </Tag>
              ) : null}
              <span className="ml-auto">
                <EventTimestamp createdAt={event.createdAt} />
              </span>
            </div>

            {/* A failing verdict is not the end of the run any more — the coder
                gets re-invoked with these. Saying so stops a red card reading
                as a dead build. */}
            {failed ? (
              <p className="mb-2 text-xs text-typography-500">{strings.verificationRemediating}</p>
            ) : null}

            {objections.length ? (
              <ul className="mb-2 space-y-2">
                {objections.map((raw, objectionIndex) => {
                  const objection = (raw ?? {}) as Record<string, unknown>;
                  const where = [asAgentText(objection.repo), asAgentText(objection.file)]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={`${event.id}-objection-${objectionIndex}`} className="text-sm">
                      <div className="flex items-start gap-2">
                        <Tag
                          type={asAgentText(objection.severity) === "blocking" ? "red" : "gray"}
                          size="sm"
                          className="mt-0.5 shrink-0"
                        >
                          {asAgentText(objection.severity) || "concern"}
                        </Tag>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{asAgentText(objection.summary)}</p>
                          {where ? (
                            <p className="font-mono text-xs text-typography-400">{where}</p>
                          ) : null}
                          {asAgentText(objection.detail) ? (
                            <p className="mt-0.5 text-xs text-typography-600">
                              {asAgentText(objection.detail)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {asAgentText(payload.notes) ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
                  {asAgentText(payload.notes)}
                </ReactMarkdown>
              </div>
            ) : null}
          </Tile>
        );
      }

      case "e2e_evidence":
        return (
          <div key={event.id} style={style}>
            <ExpandableRow
              icon="◉"
              summary={strings.e2eEvidence}
              detail={String(payload.text ?? "")}
              createdAt={event.createdAt}
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
              {asAgentText(payload.repo)} #{asAgentText(payload.prNumber)}
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

      // The one event that is neither progress nor failure: the run stopped
      // itself at a phase boundary and is waiting on a spend decision. Rendered
      // as its own row so the feed says where the work got to — the banner
      // above says what to do about it.
      case "budget_hold": {
        const money = (value: unknown) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : "—";
        };
        const state = String(payload.state ?? "held");
        const text =
          state === "raised"
            ? budgetFeed.raised(money(payload.budgetUsd))
            : state === "headroom"
              ? budgetFeed.headroom(money(payload.budgetUsd))
              : state === "expired"
                ? budgetFeed.expired
                : budgetFeed.held(money(payload.spentUsd), money(payload.budgetUsd));
        return (
          <p
            key={event.id}
            style={style}
            className={
              state === "expired"
                ? "text-sm text-support-error"
                : "text-sm font-medium text-typography-800"
            }
          >
            {text}
          </p>
        );
      }

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
            {visible.map((event, index) => {
              const previous = index > 0 ? visible[index - 1] : null;
              const gap = previous ? formatEventGap(previous.createdAt, event.createdAt) : null;
              return (
                <React.Fragment key={event.id}>
                  {gap && (
                    <p className="py-0.5 text-center text-[10px] text-typography-400">
                      {strings.eventGap(gap)}
                    </p>
                  )}
                  {renderEvent(event, index)}
                </React.Fragment>
              );
            })}
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
