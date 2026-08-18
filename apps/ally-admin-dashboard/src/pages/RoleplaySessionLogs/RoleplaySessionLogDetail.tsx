import { FC, ReactNode } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useGetRoleplaySessionLogQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { RoleplaySessionWeakMetric } from "@types";
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

/** Human-readable labels for session lifecycle milestones. */
const LIFECYCLE_LABELS: Record<string, string> = {
  ROOM_CREATED: "Room created",
  AGENT_DISPATCHED: "Agent dispatched",
  PARTICIPANT_JOINED: "Participant joined",
  AGENT_JOINED: "Agent joined",
  AGENT_LEFT: "Agent left",
  RECORDING_STARTED: "Recording started",
  ROOM_FINISHED: "Room finished",
};
const lifecycleLabel = (type: string): string => LIFECYCLE_LABELS[type] ?? type;

/** Compact one-line rendering of a lifecycle event's detail payload. */
const formatLifecycleDetail = (detail: Record<string, unknown> | null): string => {
  if (!detail) return "—";
  const entries = Object.entries(detail).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return entries.length ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ") : "—";
};

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

/**
 * Weak-performing-metric grouping and presentation.
 *
 * Values arrive as fractions; only `percent`/`per100turns` are scaled for
 * display. A `count` renders as "n of ceiling" rather than a percentage,
 * because "4 solutions offered against a ceiling of 2" is the readable form and
 * "200%" is not.
 */
const WEAK_METRIC_GROUP_LABEL: Record<string, string> = {
  responsiveness: "Actor responsiveness",
  progression: "Conversational progression",
  language_realism: "Language realism",
  feedback_groundedness: "Feedback groundedness",
  clienthood: "Actor clienthood",
};

const WEAK_METRIC_STATE_CLASS: Record<string, string> = {
  measured: "bg-green-100 text-green-900",
  partial: "bg-yellow-100 text-yellow-900",
  none: "bg-neutral-200 text-typography-700",
};

const WEAK_METRIC_STATE_LABEL: Record<string, string> = {
  measured: "measured",
  partial: "partial",
  none: "not measured",
};

const formatWeakMetric = (m: RoleplaySessionWeakMetric): string => {
  // An unmeasured metric has no value to show. Barge-in and dialect-lexicon
  // both compute to 0 because nothing records them — printing "0.00%" reads as
  // "this never happened", which is the opposite of what the badge says.
  if (m.state === "none") return "—";
  if (m.unit === "count") return `${m.numerator} of ${m.denominator}`;
  if (m.value === null) return "no data";
  if (m.unit === "ratio") return `${m.value.toFixed(2)}×`;
  const pct = m.value * 100;
  return `${pct.toFixed(pct >= 10 ? 1 : 2)}%`;
};

/** Severity chip classes for language-quality annotations. */
const LANGUAGE_SEVERITY_CLASS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-900",
  major: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-900",
};

const SEVERITY_WEIGHT: Record<string, number> = { minor: 1, major: 5, critical: 10 };

/** Coherence chip classes for drift-judged turns (degrading and worse). */
const COHERENCE_CLASS: Record<string, string> = {
  minor_disfluency: "bg-yellow-100 text-yellow-900",
  degrading: "bg-orange-100 text-orange-900",
  mostly_incoherent: "bg-red-100 text-red-900",
  gibberish: "bg-red-100 text-red-900",
};

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

/**
 * A goal this conversation gave no occasion to demonstrate.
 *
 * The agent test cases are configured globally, so a session is scored against
 * goals its scenario may never exercise. The judge still returns a number for
 * those, but showing it would read as a failure the actor had no chance to
 * avoid — so the bar is greyed out and the score replaced with N/A. These are
 * excluded from the composite above.
 */
const NotApplicableMetricBar: FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-sm text-typography-700">
      <span>{label}</span>
      <span className="font-medium" title="The conversation gave no occasion to demonstrate this">
        N/A
      </span>
    </div>
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" />
  </div>
);

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

  // Goal titles the judge marked inapplicable. Sessions judged before
  // applicability existed send an empty list, so every goal renders as scored —
  // which is exactly how they were scored.
  const notApplicableGoals = new Set(data.actorEvaluation?.notApplicableGoals ?? []);

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

      {data.suspectedFreeze && (
        <div className="mt-4 rounded-lg border border-destructive-500 bg-destructive-50 px-4 py-3">
          <p className="text-sm text-destructive-500">
            ⚠ Suspected mid-session freeze — the agent stopped responding (it left the last learner
            turn unanswered, or an LLM call timed out).
          </p>
        </div>
      )}

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
                    {Object.entries(data.actorEvaluation.metrics).map(([name, score]) =>
                      notApplicableGoals.has(name) ? (
                        <NotApplicableMetricBar key={name} label={name} />
                      ) : (
                        <MetricBar key={name} label={name} score={Number(score)} />
                      ),
                    )}
                  </div>
                )}
              {notApplicableGoals.size > 0 && (
                <p className="text-xs text-typography-700">
                  {notApplicableGoals.size} of{" "}
                  {Object.keys(data.actorEvaluation.metrics ?? {}).length} goals were not applicable
                  to this session and are excluded from the score above.
                </p>
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
                      {g.tags.length > 0 && (
                        <span className="text-typography-700">({g.tags.join(", ")})</span>
                      )}
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

      {/* Run configuration — the prompt/scenario version + LLM settings this
          session actually ran under (PRD FR15 experiment config). */}
      {data.runConfig &&
        (data.runConfig.scenarioVersion ||
          data.runConfig.promptVersions ||
          data.runConfig.llmModel ||
          data.runConfig.temperature !== null) && (
          <section className="mt-6">
            <h2 className="text-lg font-secondary text-typography-900 mb-2">Run configuration</h2>
            <SectionCard>
              <Field
                label="Scenario version"
                value={
                  data.runConfig.scenarioVersion
                    ? `v${data.runConfig.scenarioVersion.versionNumber ?? "?"}${
                        data.runConfig.scenarioVersion.name
                          ? ` · ${data.runConfig.scenarioVersion.name}`
                          : ""
                      }`
                    : "—"
                }
              />
              <Field
                label="LLM"
                value={
                  data.runConfig.llmModel
                    ? `${
                        data.runConfig.llmProvider ? `${data.runConfig.llmProvider} · ` : ""
                      }${data.runConfig.llmModel}`
                    : "—"
                }
              />
              <Field
                label="STT (configured)"
                value={
                  data.runConfig.sttModel
                    ? `${
                        data.runConfig.sttProvider ? `${data.runConfig.sttProvider} · ` : ""
                      }${data.runConfig.sttModel}`
                    : "—"
                }
              />
              <Field
                label="Temperature"
                value={
                  data.runConfig.temperature === null ? "—" : String(data.runConfig.temperature)
                }
              />
              <Field
                label="Top-p / max tokens"
                value={
                  data.runConfig.topP === null && data.runConfig.maxTokens === null
                    ? "—"
                    : `${data.runConfig.topP ?? "—"} / ${data.runConfig.maxTokens ?? "—"}`
                }
              />
              <Field
                label="Skill (main-agent prompt)"
                value={data.runConfig.selectedMainPromptCode ?? "— (default)"}
              />
              <Field
                label="Language variant"
                value={
                  data.runConfig.mainPromptVariant === "MULTILINGUAL"
                    ? "Multilingual (translated)"
                    : data.runConfig.mainPromptVariant === "GENERIC"
                      ? "Generic (English source)"
                      : "—"
                }
              />
            </SectionCard>
            {data.runConfig.promptVersions &&
              Object.keys(data.runConfig.promptVersions).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-typography-700">Prompts:</span>
                  {Object.entries(data.runConfig.promptVersions).map(([code, version]) => (
                    <span
                      key={code}
                      className="rounded bg-neutral-100 px-2 py-0.5 text-typography-700"
                      title={`${code} @ v${version}`}
                    >
                      {code} · v{version}
                    </span>
                  ))}
                </div>
              )}
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
            <Field label="STT finalize (avg)" value={formatMs(data.latency.avgSttFinalizeMs)} />
            <Field label="LLM TTFT (avg)" value={formatMs(data.latency.avgLlmTtftMs)} />
            <Field label="TTS TTFB (avg)" value={formatMs(data.latency.avgTtsTtfbMs)} />
            <Field label="LLM response (avg)" value={formatMs(data.latency.avgLlmResponseMs)} />
            <Field
              label="Knowledge retrieval (avg)"
              value={formatMs(data.latency.avgKnowledgeRetrievalMs)}
            />
            <Field label="Behaviors (avg)" value={formatMs(data.latency.avgBehaviorsMs)} />
            <Field label="Interruptions" value={formatNumber(data.latency.interruptedTurns)} />
            <Field label="LLM timeouts" value={formatNumber(data.latency.llmTimedOutTurns)} />
          </SectionCard>
        </section>
      )}

      {/* Weak performing metrics — the five under active repair, for this
          session. Same measures the analytics tab trends, so a bad bucket there
          can be opened here and read turn by turn. */}
      {data.weakMetrics && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">
            Weak performing metrics
          </h2>
          <p className="text-xs text-typography-500 mb-2">
            Parameters {data.weakMetrics.metricsVersion}
            {data.weakMetrics.judged
              ? ""
              : " · this session was never judged, so judge-derived lines read as no data rather than as clean"}
            . Counts are shown alongside rates: on a single session the denominator is what tells
            you whether to trust the number.
          </p>
          {Object.keys(WEAK_METRIC_GROUP_LABEL).map(groupId => {
            const metrics = data.weakMetrics!.metrics.filter(m => m.group === groupId);
            if (metrics.length === 0) return null;
            return (
              <div key={groupId} className="mb-4">
                <h3 className="text-sm font-secondary text-typography-800 mb-2">
                  {WEAK_METRIC_GROUP_LABEL[groupId]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metrics.map(m => (
                    <div key={m.id} className="p-3 rounded-lg border border-border-light bg-white">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-typography-700">{m.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            WEAK_METRIC_STATE_CLASS[m.state] ?? ""
                          }`}
                        >
                          {WEAK_METRIC_STATE_LABEL[m.state] ?? m.state}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm text-typography-900 font-secondary">
                          {formatWeakMetric(m)}
                        </span>
                        {m.unit !== "count" && m.state !== "none" && (
                          <span className="text-xs text-typography-500">
                            {m.numerator} of {m.denominator}
                          </span>
                        )}
                      </div>
                      {m.detail && <p className="mt-1 text-xs text-typography-500">{m.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Language quality (LLM-judge error annotations — latest judge run) */}
      {data.languageQuality && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Language quality</h2>
          <p className="text-xs text-typography-500 mb-2">
            Judge: {data.languageQuality.judgeModel} · rubric{" "}
            {data.languageQuality.judgePromptVersion}. Same rows the Analytics Language tab
            aggregates — categorized errors only, no scores.
          </p>
          <SectionCard>
            <Field label="Turns judged" value={formatNumber(data.languageQuality.turnsJudged)} />
            <Field
              label="Garbled-input turns"
              value={formatNumber(data.languageQuality.turnsGarbled)}
            />
            <Field label="Errors found" value={formatNumber(data.languageQuality.errorCount)} />
            <Field
              label="Script fidelity"
              value={
                data.languageQuality.scriptFidelityPct === null
                  ? "not yet measured"
                  : `${data.languageQuality.scriptFidelityPct}%`
              }
            />
            <Field
              label="Round-trip WER"
              value={
                data.languageQuality.roundTripWerPct === null
                  ? "not yet measured"
                  : `${data.languageQuality.roundTripWerPct}%`
              }
            />
            <Field
              label="Weighted errors / 100 turns"
              value={
                data.languageQuality.turnsJudged > 0
                  ? (
                      (data.languageQuality.annotations
                        .filter(a => !a.conditionedOut)
                        .reduce((n, a) => n + (SEVERITY_WEIGHT[a.severity] ?? 1), 0) /
                        data.languageQuality.turnsJudged) *
                      100
                    ).toFixed(1)
                  : "—"
              }
            />
          </SectionCard>
          {/* Per-dimension breakdown + prompt-vs-model verdict (this session) */}
          {data.languageQuality.annotations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {Object.entries(
                data.languageQuality.annotations.reduce<Record<string, number>>((acc, a) => {
                  const key = `${a.layer} · ${a.dimension}`;
                  acc[key] = (acc[key] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([key, count]) => (
                <span key={key} className="rounded bg-neutral-100 px-2 py-0.5 text-typography-700">
                  {key}: {count}
                </span>
              ))}
              {(() => {
                const configGap = data.languageQuality.annotations.filter(
                  a => a.isolationBasis === "persona_unspecified",
                ).length;
                const modelFault = data.languageQuality.annotations.filter(
                  a => a.isolationBasis === "persona_specified",
                ).length;
                if (configGap === 0 && modelFault === 0) return null;
                return (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-900">
                    Verdict:{" "}
                    {configGap > 0 &&
                      `${configGap} from config gaps (populate language style fields)`}
                    {configGap > 0 && modelFault > 0 && " · "}
                    {modelFault > 0 && `${modelFault} instructed-but-ignored (model)`}
                  </span>
                );
              })()}
            </div>
          )}
          {data.languageQuality.annotations.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {data.languageQuality.annotations.map((a, i) => (
                <div
                  key={`${a.turnIndex}-${a.dimension}-${a.category}-${i}`}
                  className="rounded-lg border border-border-light bg-white p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-typography-900">Turn {a.turnIndex}</span>
                    <span
                      className={`rounded px-2 py-0.5 font-medium ${
                        LANGUAGE_SEVERITY_CLASS[a.severity] ?? "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-typography-700">
                      {a.dimension} · {a.category}
                    </span>
                    {a.isolationBasis && (
                      <span className="text-typography-500">{a.isolationBasis}</span>
                    )}
                    {a.conditionedOut && (
                      <span className="text-typography-500">(conditioned out — garbled input)</span>
                    )}
                  </div>
                  {a.evidenceQuote && (
                    <p className="mt-1 text-sm text-typography-900 whitespace-pre-wrap">
                      “{a.evidenceQuote}”
                    </p>
                  )}
                  {a.reasoning && <p className="mt-1 text-xs text-typography-500">{a.reasoning}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Conversation drift (LLM-judge, latest run) — session view of the Drift tab */}
      {data.drift && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Conversation drift</h2>
          <p className="text-xs text-typography-500 mb-2">
            Judge: {data.drift.judgeModel} · rubric {data.drift.judgePromptVersion}. Same rows the
            Analytics Drift tab aggregates.
          </p>
          <SectionCard>
            <Field
              label="Session drifted"
              value={
                data.drift.sessionDrifted === null ? "—" : data.drift.sessionDrifted ? "Yes" : "No"
              }
            />
            <Field
              label="First drift turn"
              value={data.drift.firstDriftTurn === null ? "—" : `Turn ${data.drift.firstDriftTurn}`}
            />
            <Field
              label="Garbled counselor inputs"
              value={formatNumber(
                data.drift.turns.filter(
                  t => t.counselorUtteranceGarbled && t.counselorUtteranceGarbled !== "none",
                ).length,
              )}
            />
            <Field
              label="Turns with failure modes"
              value={formatNumber(
                data.drift.turns.filter(
                  t => t.aiReplyFailureMode && t.aiReplyFailureMode !== "none",
                ).length,
              )}
            />
          </SectionCard>
        </section>
      )}

      {/* Language glossary (delivery + retrieval + avoid-list adherence) */}
      {data.languageGlossary && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Language glossary</h2>
          <p className="text-xs text-typography-500 mb-2">
            {data.languageGlossary.active
              ? "Delivered to the agent this session; retrieval + avoid-list adherence below."
              : "Not delivered this session (no start-metrics provenance) — adherence below is scanned from the transcript regardless."}
          </p>
          <SectionCard>
            <Field label="Delivered" value={data.languageGlossary.active ? "Yes" : "No"} />
            <Field
              label="Tier 0 style card"
              value={formatNumber(data.languageGlossary.tier0Chars)}
            />
            <Field label="Tier 0 tokens" value={formatNumber(data.languageGlossary.tier0Tokens)} />
            <Field
              label="Tier 1 sections shipped"
              value={formatNumber(data.languageGlossary.tier1SectionsShipped)}
            />
            <Field
              label="Turns with retrieval"
              value={`${formatNumber(data.languageGlossary.turnsWithGlossaryRetrieval)} / ${formatNumber(
                data.languageGlossary.totalTurns,
              )}`}
            />
            <Field
              label="Avoid-list violations"
              value={formatNumber(data.languageGlossary.adherence?.totalViolations ?? null)}
            />
          </SectionCard>
          {data.languageGlossary.sectionHitCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {data.languageGlossary.sectionHitCounts.map(h => (
                <span
                  key={h.sectionCode}
                  className="rounded bg-neutral-100 px-2 py-0.5 text-typography-700"
                >
                  {h.sectionCode}: {h.count}
                </span>
              ))}
            </div>
          )}
          {data.languageGlossary.adherence &&
            data.languageGlossary.adherence.violations.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {data.languageGlossary.adherence.violations.map(v => (
                  <div
                    key={`${v.sectionCode}-${v.term}`}
                    className="rounded-lg border border-border-light bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded px-2 py-0.5 font-medium bg-orange-100 text-orange-900">
                        “{v.term}”
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-typography-700">
                        {v.sectionCode}
                      </span>
                      <span className="text-typography-500">{v.count}×</span>
                    </div>
                    {v.examples.length > 0 && (
                      <p className="mt-1 text-xs text-typography-500 whitespace-pre-wrap">
                        {v.examples.join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
        </section>
      )}

      {/* Recording & learner feedback */}
      {(data.recording || data.feedback) && (
        <section className="mt-6">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">
            Recording &amp; feedback
          </h2>
          <SectionCard>
            {data.recording &&
              (data.recording.url ? (
                <div className="col-span-2 md:col-span-4 flex flex-col gap-1">
                  <span className="text-xs text-typography-700">Recording</span>
                  <audio controls preload="none" src={data.recording.url} className="w-full" />
                </div>
              ) : (
                <Field label="Recording" value={`Available (egress ${data.recording.egressId})`} />
              ))}
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

      {/* Session lifecycle timeline (room/agent/participant milestones) */}
      <section className="mt-6">
        <h2 className="text-lg font-secondary text-typography-900 mb-2">
          Session Timeline ({(data.lifecycle ?? []).length})
        </h2>
        {(data.lifecycle ?? []).length === 0 ? (
          <p className="text-sm text-typography-700">
            No lifecycle events recorded for this session.
          </p>
        ) : (
          <>
            {!(data.lifecycle ?? []).some(item => item.type === "AGENT_JOINED") && (
              <p className="text-sm text-destructive-500 mb-2">
                ⚠ The agent never joined this session.
              </p>
            )}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light text-sm text-typography-700">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {(data.lifecycle ?? []).map(item => (
                  <tr
                    key={item.id}
                    className="border-b border-border-light text-sm text-typography-900 align-top"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap text-typography-700">
                      {formatDate(item.occurredAt)}
                    </td>
                    <td className="py-2 pr-4">{lifecycleLabel(item.type)}</td>
                    <td className="py-2 pr-4 text-typography-700">
                      {formatLifecycleDetail(item.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

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
              // Language-quality annotations anchored to this AI message
              // (matched by message id — resolved server-side, judge ordering).
              const annotations = (data.languageQuality?.annotations ?? []).filter(
                a => a.messageId === turn.id,
              );
              // Drift judgment for this AI message: chip only when noteworthy
              // (coherence below fully_coherent, a failure mode, or garbled input).
              const driftTurn = (data.drift?.turns ?? []).find(t => t.messageId === turn.id);
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
                    {annotations.map((a, i) => (
                      <span
                        key={`${a.dimension}-${a.category}-${i}`}
                        title={`${a.dimension} · ${a.category}${a.reasoning ? ` — ${a.reasoning}` : ""}`}
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          LANGUAGE_SEVERITY_CLASS[a.severity] ?? "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {a.category}
                      </span>
                    ))}
                    {driftTurn?.coherence && driftTurn.coherence !== "fully_coherent" && (
                      <span
                        title={`drift · coherence: ${driftTurn.coherence}${driftTurn.reasoning ? ` — ${driftTurn.reasoning}` : ""}`}
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          COHERENCE_CLASS[driftTurn.coherence] ?? "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {driftTurn.coherence.replace(/_/g, " ")}
                      </span>
                    )}
                    {driftTurn?.aiReplyFailureMode && driftTurn.aiReplyFailureMode !== "none" && (
                      <span
                        title={`drift · failure mode${driftTurn.rootAttribution ? ` — root: ${driftTurn.rootAttribution}` : ""}`}
                        className="rounded px-1.5 py-0.5 font-medium bg-purple-100 text-purple-900"
                      >
                        {driftTurn.aiReplyFailureMode.replace(/_/g, " ")}
                      </span>
                    )}
                    {driftTurn?.counselorUtteranceGarbled &&
                      driftTurn.counselorUtteranceGarbled !== "none" && (
                        <span
                          title={`STT garble on the preceding counselor input${driftTurn.sttErrorType && driftTurn.sttErrorType !== "none" ? ` — ${driftTurn.sttErrorType}` : ""}`}
                          className="rounded px-1.5 py-0.5 font-medium bg-gray-200 text-gray-700"
                        >
                          input garbled ({driftTurn.counselorUtteranceGarbled})
                        </span>
                      )}
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
