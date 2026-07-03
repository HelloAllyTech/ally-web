import { FC, ReactNode } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useGetRoleplaySessionLogQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { formatDate } from "@utils";

/** Seconds offset -> "m:ss" for transcript turn timestamps. */
const formatOffset = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatDurationSeconds = (seconds: number | null): string => {
  if (seconds === null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

/** Integer with thousands separators; em-dash for null. */
const formatNumber = (n: number | null): string =>
  n === null || n === undefined ? "—" : n.toLocaleString();

/** Milliseconds -> "123 ms" / "1.23 s"; em-dash for null. */
const formatMs = (ms: number | null): string => {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
};

/** Audio milliseconds -> "12.3 s"; em-dash for null/zero. */
const formatAudio = (ms: number | null): string => {
  if (!ms) return "—";
  return `${(ms / 1000).toFixed(1)} s`;
};

/** Estimated USD cost; `~` prefix flags an unpriced (lower-bound) figure. */
const formatCost = (n: number | null, priced = true): string => {
  if (n === null || n === undefined) return "—";
  const value = n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2);
  return `${priced ? "" : "~"}$${value}`;
};

const formatModelRefs = (refs?: { provider: string; model: string }[]): string =>
  refs && refs.length ? refs.map(r => `${r.provider} · ${r.model}`).join(", ") : "—";

const Field: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-typography-700">{label}</span>
    <span className="text-sm text-typography-900">{value}</span>
  </div>
);

const SectionCard: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-border-light bg-white">
    {children}
  </div>
);

/** Score-to-colour scale, matching the scenario-report metric bars. */
const scoreColor = (value: number): string => {
  if (value < 33) return "#FE6F64";
  if (value < 66) return "#FFB74D";
  return "#81C784";
};

/** A labelled 0-100 metric bar (per agent test case). */
const MetricBar: FC<{ label: string; score: number }> = ({ label, score }) => {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm text-typography-900">
        <span>{label}</span>
        <span className="font-medium">{Math.round(clamped)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
    </div>
  );
};

export const RoleplaySessionLogDetail: FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetRoleplaySessionLogQuery(id, { skip: !id });

  const goBack = () => navigate(ROUTES.ROLEPLAY_SESSION_LOGS);

  if (isLoading) {
    return <p className="p-2 text-typography-700 font-primary">Loading…</p>;
  }
  if (isError || !data) {
    return (
      <div className="p-2 font-primary">
        <p className="text-destructive-500">Failed to load this roleplay session.</p>
        <Button variant={ButtonVariant.TEXT} onClick={goBack} className="mt-3 h-[40px] px-4">
          Back to logs
        </Button>
      </div>
    );
  }

  const summaryEntries = data.summary
    ? Object.entries(data.summary).filter(([, v]) => v !== null && v !== undefined)
    : [];

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <div className="shrink-0">
        <Button variant={ButtonVariant.TEXT} onClick={goBack} className="h-[36px] px-0">
          ← Back to logs
        </Button>
        <h1 className="text-2xl text-typography-900 font-secondary mt-2">
          {data.scenarioTitle || "Roleplay session"}
        </h1>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 p-4 rounded-lg border border-border-light bg-white">
        <Field label="User" value={data.counselorName || "—"} />
        <Field label="Email" value={data.counselorEmail || "—"} />
        <Field label="Organization" value={data.orgName || "—"} />
        <Field label="Status" value={data.status === "ENDED" ? "Ended" : "In progress"} />
        <Field label="Started" value={data.startedAt ? formatDate(data.startedAt) : "—"} />
        <Field label="Ended" value={data.endedAt ? formatDate(data.endedAt) : "—"} />
        <Field label="Duration" value={formatDurationSeconds(data.durationSeconds)} />
        <Field
          label="Score"
          value={data.score === null ? "—" : Math.min(100, Math.round(data.score))}
        />
        {data.platform && <Field label="Platform" value={data.platform} />}
        {data.language && <Field label="Language" value={data.language} />}
        {data.voiceId && <Field label="Voice" value={data.voiceId} />}
        {data.totalPausedMs ? (
          <Field
            label="Paused"
            value={formatDurationSeconds(Math.round(data.totalPausedMs / 1000))}
          />
        ) : null}
      </div>

      {/* Roleplay actor performance vs agent test cases */}
      {(data.actorEvaluation || data.agentTestCases.length > 0) && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Actor performance</h2>
          {data.actorEvaluation?.status === "IN_PROGRESS" ? (
            <div className="rounded-lg border border-border-light bg-white p-4">
              <p className="text-sm text-typography-700">Evaluation in progress…</p>
            </div>
          ) : data.actorEvaluation?.status === "FAILED" ? (
            <div className="rounded-lg border border-border-light bg-white p-4">
              <p className="text-sm text-destructive-500">Evaluation failed for this session.</p>
            </div>
          ) : data.actorEvaluation &&
            (data.actorEvaluation.compositeScore !== null ||
              (data.actorEvaluation.metrics &&
                Object.keys(data.actorEvaluation.metrics).length > 0)) ? (
            <div className="rounded-lg border border-border-light bg-white p-4 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-secondary text-typography-900">
                  {data.actorEvaluation.compositeScore !== null
                    ? Math.min(100, data.actorEvaluation.compositeScore)
                    : "—"}
                  <span className="text-base text-typography-700">/100</span>
                </div>
                {data.actorEvaluation.pass !== null && (
                  <span
                    className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-typography-900 ${
                      data.actorEvaluation.pass ? "bg-success-100" : "bg-neutral-100"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1 ${
                        data.actorEvaluation.pass ? "bg-success-400" : "bg-neutral-400"
                      }`}
                    />
                    {data.actorEvaluation.pass ? "Pass" : "Below threshold"} (
                    {data.actorEvaluation.passThreshold})
                  </span>
                )}
              </div>
              {data.actorEvaluation.metrics &&
                Object.keys(data.actorEvaluation.metrics).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {Object.entries(data.actorEvaluation.metrics).map(([name, score]) => (
                      <MetricBar key={name} label={name} score={Number(score)} />
                    ))}
                  </div>
                )}
              {data.actorEvaluation.markdown && (
                <div>
                  <h3 className="text-sm font-medium text-typography-900 mb-1">
                    Evaluator feedback
                  </h3>
                  <div className="text-sm text-typography-900 whitespace-pre-wrap">
                    {data.actorEvaluation.markdown}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border-light bg-white p-4">
              <p className="text-sm text-typography-700 mb-2">
                Not yet evaluated. The actor is scored against these agent test cases:
              </p>
              {data.agentTestCases.length === 0 ? (
                <p className="text-sm text-typography-700">No agent test cases are configured.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-typography-900">
                  {data.agentTestCases.map(g => (
                    <li key={g.id}>
                      <span className="font-medium">{g.title}</span>{" "}
                      <span className="text-typography-700">({g.category})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* Token & cost consumption */}
      {data.usage && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Usage &amp; Cost</h2>
          <SectionCard>
            <Field label="Total LLM tokens" value={formatNumber(data.usage.llmTotalTokens)} />
            <Field label="Prompt tokens" value={formatNumber(data.usage.llmPromptTokens)} />
            <Field label="Completion tokens" value={formatNumber(data.usage.llmCompletionTokens)} />
            <Field label="Cached tokens" value={formatNumber(data.usage.llmCachedTokens)} />
            <Field label="STT audio" value={formatAudio(data.usage.sttAudioMs)} />
            <Field label="TTS characters" value={formatNumber(data.usage.ttsCharacters)} />
            <Field
              label="Est. cost"
              value={formatCost(data.usage.estimatedCostUsd, data.usage.priced)}
            />
          </SectionCard>
          {data.usage.byServiceModel.length > 0 && (
            <table className="w-full text-left border-collapse mt-3">
              <thead>
                <tr className="border-b border-border-light text-sm text-typography-700">
                  <th className="py-2 pr-4 font-medium">Service</th>
                  <th className="py-2 pr-4 font-medium">Provider</th>
                  <th className="py-2 pr-4 font-medium">Model</th>
                  <th className="py-2 pr-4 font-medium">Usage</th>
                  <th className="py-2 pr-4 font-medium">Calls</th>
                  <th className="py-2 pr-4 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.usage.byServiceModel.map((b, i) => (
                  <tr
                    key={`${b.service}-${b.provider}-${b.model}-${i}`}
                    className="border-b border-border-light text-sm text-typography-900"
                  >
                    <td className="py-2 pr-4 uppercase text-typography-700">{b.service}</td>
                    <td className="py-2 pr-4">{b.provider}</td>
                    <td className="py-2 pr-4">{b.model}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {b.service === "llm"
                        ? `${formatNumber(b.totalTokens)} tok`
                        : b.service === "stt"
                          ? formatAudio(b.audioMs)
                          : `${formatNumber(b.characters)} chars`}
                    </td>
                    <td className="py-2 pr-4">{formatNumber(b.calls)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatCost(b.estimatedCostUsd, b.priced)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* AI models used */}
      {data.models &&
        (data.models.llm.length > 0 ||
          data.models.stt.length > 0 ||
          data.models.tts.length > 0) && (
          <section className="mt-6">
            <h2 className="text-lg font-secondary text-typography-900 mb-2">AI models</h2>
            <SectionCard>
              <Field label="LLM" value={formatModelRefs(data.models.llm)} />
              <Field label="Speech-to-text" value={formatModelRefs(data.models.stt)} />
              <Field label="Text-to-speech" value={formatModelRefs(data.models.tts)} />
            </SectionCard>
          </section>
        )}

      {/* Voice-pipeline latency & quality */}
      {data.latency && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Latency &amp; quality</h2>
          <SectionCard>
            <Field label="Turns" value={formatNumber(data.latency.turnCount)} />
            <Field
              label="Response latency (p50)"
              value={formatMs(data.latency.p50ResponseLatencyMs)}
            />
            <Field
              label="Response latency (p95)"
              value={formatMs(data.latency.p95ResponseLatencyMs)}
            />
            <Field
              label="Response latency (avg)"
              value={formatMs(data.latency.avgResponseLatencyMs)}
            />
            <Field label="EOU delay (avg)" value={formatMs(data.latency.avgEouDelayMs)} />
            <Field label="LLM TTFT (avg)" value={formatMs(data.latency.avgLlmTtftMs)} />
            <Field label="TTS TTFB (avg)" value={formatMs(data.latency.avgTtsTtfbMs)} />
            <Field label="LLM response (avg)" value={formatMs(data.latency.avgLlmResponseMs)} />
            <Field
              label="Knowledge retrieval (avg)"
              value={formatMs(data.latency.avgKnowledgeRetrievalMs)}
            />
            <Field label="Interruptions" value={formatNumber(data.latency.interruptedTurns)} />
            <Field label="LLM timeouts" value={formatNumber(data.latency.llmTimedOutTurns)} />
          </SectionCard>
        </section>
      )}

      {/* Recording & learner feedback */}
      {(data.recording || data.feedback) && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">
            Recording &amp; feedback
          </h2>
          <SectionCard>
            {data.recording && (
              <Field label="Recording" value={`Available (egress ${data.recording.egressId})`} />
            )}
            {data.feedback && (
              <Field label="Learner rating" value={`${data.feedback.rating} / 5`} />
            )}
            {data.feedback?.feedback && (
              <Field label="Learner comment" value={data.feedback.feedback} />
            )}
            {data.feedback && data.feedback.tags.length > 0 && (
              <Field label="Tags" value={data.feedback.tags.join(", ")} />
            )}
          </SectionCard>
        </section>
      )}

      {/* Events / score breakdown */}
      <section className="mt-6">
        <h2 className="text-lg font-secondary text-typography-900 mb-2">
          Events ({data.events.length})
        </h2>
        {data.events.length === 0 ? (
          <p className="text-sm text-typography-700">No events recorded for this session.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light text-sm text-typography-700">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map(event => (
                <tr
                  key={event.id}
                  className="border-b border-border-light text-sm text-typography-900 align-top"
                >
                  <td className="py-2 pr-4 whitespace-nowrap text-typography-700">
                    {formatDate(event.occurredAt)}
                  </td>
                  <td className="py-2 pr-4">
                    {event.emoji ? `${event.emoji} ` : ""}
                    {event.eventName || event.eventId}
                  </td>
                  <td className="py-2 pr-4">{event.score ?? "—"}</td>
                  <td className="py-2 pr-4 text-typography-700">{event.message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Transcript */}
      <section className="mt-6 pb-6">
        <h2 className="text-lg font-secondary text-typography-900 mb-2">
          Transcript{data.transcript.length > 0 ? ` (${data.transcript.length} turns)` : ""}
        </h2>
        {data.transcript.length === 0 ? (
          <p className="text-sm text-typography-700">No transcript available for this session.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.transcript.map(turn => {
              const isUser = turn.senderId === data.counselorId;
              return (
                <div
                  key={turn.id}
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isUser
                      ? "self-end bg-primary-50 text-typography-900"
                      : "self-start bg-neutral-100 text-typography-900"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-typography-700 mb-1">
                    <span className="font-medium">{isUser ? "User" : "Ally"}</span>
                    {turn.startSeconds !== null && <span>{formatOffset(turn.startSeconds)}</span>}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{turn.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Raw summary (if any) */}
      {summaryEntries.length > 0 && (
        <section className="mt-2 pb-8">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Summary</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summaryEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-xs text-typography-700">{key}</dt>
                <dd className="text-sm text-typography-900 whitespace-pre-wrap">
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
