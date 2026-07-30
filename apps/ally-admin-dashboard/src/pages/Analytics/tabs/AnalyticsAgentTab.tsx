import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LineChart, ScatterChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
import { Reset, Send } from "@carbon/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Accordion,
  AccordionItem,
  Button,
  InlineNotification,
  Modal,
  SkeletonPlaceholder,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { useAskAnalyticsAgentMutation, useGetAnalyticsAgentCatalogQuery } from "@api";
import { roleplayMarkdownComponents } from "@components";
import { en } from "@constants";
import { AnalyticsAgentMessage, AnalyticsAgentTurnInput, AskAnalyticsAgentResponse } from "@types";

import { AgentChartModel, buildAgentChart } from "../agentChart";
import { CHART_HEIGHT, ScrollableChart } from "../chartKit";

/**
 * Analytics Agent — the conversational tab of the analytics dashboard.
 *
 * Everything here is a thread of turns held in this component's state. The
 * server is stateless (it is handed the turns it should consider with each
 * question), which is why "Reset chat" is a `setState` and why a reload starts
 * clean instead of resuming something half-finished.
 *
 * The screen's job is not to make an answer look confident — it is to make one
 * checkable. Every answered turn shows, in this order: the answer, its caveats,
 * the chart (only when the rows can honestly carry one), the rows themselves,
 * and the SQL that produced them behind one click. A reader who doubts a number
 * can get to the query without leaving the tab, which is the difference between
 * a tool people trust and a tool people quietly stop using.
 */

const SLOW_AFTER_MS = 6000;
/** Turns of context sent back with a follow-up. The server caps this too; the
 *  client keeping the same bound means the request stays small. */
const HISTORY_TURNS = 8;
/** Rows rendered before the table scrolls rather than growing the page. */
const TABLE_VIEWPORT_ROWS = 12;

let messageSeq = 0;
const nextId = (): string => {
  messageSeq += 1;
  return `agent-msg-${messageSeq}`;
};

/** Cell rendering for the result table. Dates are trimmed to their date part;
 *  null renders as an em dash so an unmeasured value is visibly not a zero. */
const renderCell = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  const isoDate = /^(\d{4}-\d{2}-\d{2})T[\d:.]+/.exec(text);
  return isoDate ? isoDate[1] : text;
};

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

/** The Carbon component for a mapped chart. Kept beside the mapper so adding a
 *  chart type is two edits in the same pair of files, not a hunt. */
const AgentChart = ({ model }: { model: AgentChartModel }) => {
  const { kind, data, options } = model;
  if (kind === "line") return <LineChart data={data} options={options} />;
  if (kind === "bar") return <SimpleBarChart data={data} options={options} />;
  if (kind === "stacked") return <StackedBarChart data={data} options={options} />;
  return <ScatterChart data={data} options={options} />;
};

/** Non-answer outcomes: a sentence in a notification, plus the SQL when there
 *  was one. `kind` is honest about severity — a clarifying question is not an
 *  error, and styling it red teaches readers to distrust the tab. */
const OutcomeNotice = ({ response }: { response: AskAnalyticsAgentResponse }) => {
  const strings = en.analyticsAgent;
  const byOutcome = {
    clarify: { kind: "info" as const, title: strings.clarifyTitle },
    refused: { kind: "info" as const, title: strings.refusedTitle },
    rejected: { kind: "warning" as const, title: strings.rejectedTitle },
    failed: { kind: "error" as const, title: strings.failedTitle },
  };
  const config = byOutcome[response.outcome as keyof typeof byOutcome];
  if (!config) return null;
  return (
    <InlineNotification
      kind={config.kind}
      lowContrast
      hideCloseButton
      title={config.title}
      subtitle={response.message}
      className="max-w-full"
    />
  );
};

/** The SQL, collapsed. Shown for every turn that generated one — including a
 *  refused one, where it is the only way to see what was attempted. */
const QueryDisclosure = ({ response }: { response: AskAnalyticsAgentResponse }) => {
  const strings = en.analyticsAgent;
  if (!response.sql) return null;
  return (
    <Accordion size="sm" className="mt-3">
      <AccordionItem title={strings.showQuery}>
        <pre className="bg-neutral-100 rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
          {response.sql}
        </pre>
        {response.rationale && (
          <p className="text-xs text-typography-600 mt-2">{response.rationale}</p>
        )}
      </AccordionItem>
    </Accordion>
  );
};

const ResultTable = ({ response }: { response: AskAnalyticsAgentResponse }) => {
  const strings = en.analyticsAgent;
  if (!response.columns.length || !response.rows.length) return null;
  return (
    <div className="mt-3">
      {/* A capped result must say so where the numbers are, not in a tooltip:
          a total read off a truncated table is wrong by an unknown amount. */}
      {response.truncated && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title=""
          subtitle={fill(strings.truncatedNotice, { count: response.rowCount })}
          className="max-w-full mb-2"
        />
      )}
      <TableContainer>
        <div
          className="overflow-auto"
          // Bounded height rather than a pager: a few hundred rows is the normal
          // case here, and scrolling keeps the answer above it on screen.
          style={{ maxHeight: `${TABLE_VIEWPORT_ROWS * 2.5}rem` }}
        >
          <Table size="sm" useZebraStyles>
            <TableHead>
              <TableRow>
                {response.columns.map(column => (
                  <TableHeader key={column}>{column}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {response.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {response.columns.map(column => (
                    <TableCell key={column}>{renderCell(row[column])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableContainer>
      <p className="text-xs text-typography-500 mt-1">
        {response.rowCount} {strings.rowsReturned} · {strings.ranIn} {response.durationMs}ms
      </p>
    </div>
  );
};

/** One answered turn. */
const AgentAnswer = ({
  response,
  onFollowUp,
}: {
  response: AskAnalyticsAgentResponse;
  onFollowUp: (question: string) => void;
}) => {
  const strings = en.analyticsAgent;
  const chart = useMemo(
    () => buildAgentChart(response.chart, response.rows),
    [response.chart, response.rows],
  );

  const provenance = response.provenance.answerModel
    ? fill(strings.provenance, {
        planner: response.provenance.plannerModel,
        answer: response.provenance.answerModel,
        version: response.provenance.promptVersion,
      })
    : fill(strings.provenancePlannerOnly, {
        planner: response.provenance.plannerModel,
        version: response.provenance.promptVersion,
      });

  return (
    <div className="min-w-0">
      {response.outcome === "answer" ? (
        <>
          <div className="text-sm text-typography-900">
            <ReactMarkdown components={roleplayMarkdownComponents} remarkPlugins={[remarkGfm]}>
              {response.answer}
            </ReactMarkdown>
          </div>

          {/* An empty result is a finding, and saying so beats an empty table. */}
          {response.rowCount === 0 && (
            <p className="text-sm text-typography-600 mt-2">{strings.emptyResult}</p>
          )}

          {/* Caveats sit directly under the answer, never in a tooltip: they are
              the part a reader most needs and least seeks out. */}
          {response.caveats.length > 0 && (
            <div className="mt-3 border-l-2 border-border-light pl-3">
              <p className="text-xs font-medium text-typography-700">{strings.caveatsTitle}</p>
              <ul className="list-disc list-inside">
                {response.caveats.map(caveat => (
                  <li key={caveat} className="text-xs text-typography-600">
                    {caveat}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {chart && (
            <div className="mt-4">
              {response.chart?.title && (
                <h4 className="text-sm font-medium text-typography-900 mb-1">
                  {response.chart.title}
                </h4>
              )}
              {/* A scatter's x-axis is a quantity, not a growing set of
                  categories, so it has nothing to scroll for. */}
              {chart.kind === "scatter" ? (
                <div style={{ height: CHART_HEIGHT }}>
                  <AgentChart model={chart} />
                </div>
              ) : (
                <ScrollableChart data={chart.data} on={chart.kind === "bar" ? "group" : "key"}>
                  <AgentChart model={chart} />
                </ScrollableChart>
              )}
              {/* Rows the plot could not carry are named, so the chart is never
                  quietly narrower than the table beside it. */}
              {chart.skippedRows > 0 && (
                <p className="text-xs text-typography-500 mt-1">
                  {fill(strings.skippedRowsNotice, { count: chart.skippedRows })}
                </p>
              )}
            </div>
          )}

          <ResultTable response={response} />
        </>
      ) : (
        <OutcomeNotice response={response} />
      )}

      <QueryDisclosure response={response} />

      {response.followUps.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-typography-700 mb-1">{strings.followUpsTitle}</p>
          <div className="flex flex-wrap gap-2">
            {response.followUps.map(followUp => (
              <Button
                key={followUp}
                kind="ghost"
                size="sm"
                className="text-left"
                onClick={() => onFollowUp(followUp)}
              >
                {followUp}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-typography-500 mt-3">{provenance}</p>
    </div>
  );
};

/** What the agent can read. Answers "why was that refused?" before it is asked. */
const ScopePanel = () => {
  const strings = en.analyticsAgent;
  const { data, isLoading, isError } = useGetAnalyticsAgentCatalogQuery();

  return (
    <Accordion size="sm">
      <AccordionItem title={strings.scopeTitle}>
        {isLoading && <SkeletonPlaceholder className="w-full h-16" />}
        {isError && <p className="text-sm text-typography-600">{strings.scopeLoadFailed}</p>}
        {data && (
          <>
            <p className="text-sm text-typography-700">
              {fill(strings.scopeIntro, { rowLimit: data.rowLimit })}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {data.tables.map(table => (
                <Tag key={table.name} type="cool-gray" title={table.purpose}>
                  {table.name}
                </Tag>
              ))}
            </div>
            <p className="text-xs text-typography-600 mt-3">{strings.scopeDeniedIntro}</p>
          </>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export const AnalyticsAgentTab = () => {
  const strings = en.analyticsAgent;
  const [messages, setMessages] = useState<AnalyticsAgentMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [slow, setSlow] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [ask, { isLoading }] = useAskAnalyticsAgentMutation();
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Only answered turns become context. A failed or refused turn would teach the
  // planner to repeat the thing that failed.
  const history = useMemo<AnalyticsAgentTurnInput[]>(
    () =>
      messages
        .filter(
          (message): message is Extract<AnalyticsAgentMessage, { status: "done" }> =>
            message.role === "agent" &&
            message.status === "done" &&
            message.response.outcome === "answer",
        )
        .slice(-HISTORY_TURNS)
        .map(message => ({
          question: message.response.question,
          sql: message.response.sql,
          answer: message.response.answer,
        })),
    [messages],
  );

  // Honest progress rather than an unbounded spinner: two model calls and a
  // query take real seconds, and a reader who cannot tell "working" from "stuck"
  // reloads the page mid-question.
  useEffect(() => {
    if (!isLoading) {
      setSlow(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const submit = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isLoading) return;

      const pendingId = nextId();
      setMessages(current => [
        ...current,
        { id: nextId(), role: "user", question },
        { id: pendingId, role: "agent", status: "pending", question },
      ]);
      setDraft("");

      try {
        const response = await ask({ question, history }).unwrap();
        setMessages(current =>
          current.map(message =>
            message.id === pendingId
              ? { id: pendingId, role: "agent", status: "done", response }
              : message,
          ),
        );
      } catch {
        // The turn keeps its place in the thread and states what happened, so the
        // reader can retype or ask something narrower. A toast would be gone
        // before it was read.
        setMessages(current =>
          current.map(message =>
            message.id === pendingId
              ? {
                  id: pendingId,
                  role: "agent",
                  status: "error",
                  question,
                  message: strings.requestFailed,
                }
              : message,
          ),
        );
      }
    },
    [ask, history, isLoading, strings.requestFailed],
  );

  const reset = () => {
    setMessages([]);
    setDraft("");
    setResetOpen(false);
  };

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2 className="text-lg font-medium text-typography-900">{strings.heading}</h2>
        {/* Resetting is irreversible (the thread lives only in this tab), so it
            asks first — the one confirmation on this screen. */}
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Reset}
          disabled={!messages.length || isLoading}
          onClick={() => setResetOpen(true)}
        >
          {strings.reset}
        </Button>
      </div>

      <div className="mb-4">
        <ScopePanel />
      </div>

      {messages.length === 0 ? (
        <Tile className="mb-4">
          <p className="text-base font-medium text-typography-900">{strings.emptyTitle}</p>
          <p className="text-sm text-typography-600 mt-1">{strings.emptySubtitle}</p>
          <div className="flex flex-col items-start gap-1 mt-3">
            {strings.samples.map(sample => (
              <Button key={sample} kind="ghost" size="sm" onClick={() => submit(sample)}>
                {sample}
              </Button>
            ))}
          </div>
        </Tile>
      ) : (
        <div className="flex flex-col gap-4 mb-4">
          {messages.map(message =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded bg-neutral-100 px-3 py-2 text-sm text-typography-900">
                  {message.question}
                </div>
              </div>
            ) : (
              <Tile key={message.id} className="min-w-0">
                {message.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-typography-600">
                      {slow ? strings.pendingSlow : strings.pendingPlanning}
                    </p>
                    <SkeletonPlaceholder className="w-full h-16" />
                  </div>
                )}
                {message.status === "error" && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    hideCloseButton
                    title={strings.failedTitle}
                    subtitle={message.message}
                    className="max-w-full"
                  />
                )}
                {message.status === "done" && (
                  <AgentAnswer response={message.response} onFollowUp={submit} />
                )}
              </Tile>
            ),
          )}
          <div ref={threadEndRef} />
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border-light pt-3">
        <div className="flex-1 min-w-0">
          <TextArea
            id="analytics-agent-question"
            labelText={strings.inputPlaceholder}
            hideLabel
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder={strings.inputPlaceholder}
            rows={2}
            disabled={isLoading}
            onKeyDown={event => {
              // Enter sends, Shift+Enter adds a line — the same contract as the
              // roleplay copilot composer, so the two chats behave alike.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit(draft);
              }
            }}
          />
        </div>
        <Button
          kind="primary"
          size="md"
          className="shrink-0"
          renderIcon={Send}
          disabled={isLoading || !draft.trim()}
          onClick={() => void submit(draft)}
        >
          {isLoading ? strings.sending : strings.send}
        </Button>
      </div>

      <Modal
        open={resetOpen}
        modalHeading={strings.resetConfirmTitle}
        primaryButtonText={strings.resetConfirm}
        secondaryButtonText={strings.cancel}
        danger
        onRequestClose={() => setResetOpen(false)}
        onRequestSubmit={reset}
        onSecondarySubmit={() => setResetOpen(false)}
      >
        <p className="text-sm text-typography-700">{strings.resetConfirmBody}</p>
      </Modal>
    </div>
  );
};
