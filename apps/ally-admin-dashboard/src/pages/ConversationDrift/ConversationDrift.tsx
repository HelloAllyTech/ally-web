import { ReactNode, useEffect, useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { LineChart, SimpleBarChart } from "@carbon/charts-react";
import {
  Button,
  Dropdown,
  Heading,
  InlineNotification,
  Section,
  SkeletonPlaceholder,
  Theme,
  Tile,
} from "@carbon/react";

import "@carbon/charts/styles.css";
import "../Analytics/analytics-carbon.scss";

import {
  useGetConversationDriftQuery,
  useGetDriftBackfillStatusQuery,
  useStartDriftBackfillMutation,
} from "@api";
import { AnalyticsRange } from "@types";

const CHART_HEIGHT = "300px";

const RANGE_ITEMS: { id: AnalyticsRange; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

// id "" = all languages.
const LANGUAGE_ITEMS: { id: string; label: string }[] = [
  { id: "", label: "All languages" },
  { id: "ta", label: "Tamil" },
  { id: "hi", label: "Hindi" },
  { id: "bn", label: "Bengali" },
  { id: "te", label: "Telugu" },
  { id: "en", label: "English" },
];

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// Everything is now session-level. The "kind" panels count SESSIONS per
// category — and a session can fall in several categories (different turns),
// so the counts overlap and don't sum to a whole → bars, not pies. Titles live
// on <Cell> so empty charts can show a placeholder.
const barOpts = (leftTitle: string) => ({
  height: CHART_HEIGHT,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: leftTitle },
    bottom: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
  },
  legend: { enabled: false },
  toolbar: { enabled: false },
});
const trendOpts = {
  height: CHART_HEIGHT,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Drift rate %" },
    bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "Period" },
  },
  curve: "curveMonotoneX",
  legend: { enabled: false },
  toolbar: { enabled: false },
};

// Friendly labels + a distinct colour per drift kind for the consolidated chart.
const DRIFT_KIND_LABEL: Record<string, string> = {
  off_topic: "Off-topic",
  gibberish: "Gibberish",
  degrading: "Degrading",
  mostly_incoherent: "Mostly incoherent",
  hallucination: "Hallucination",
  context_lockin: "Context lock-in",
  wrong_language_reply: "Wrong language",
  repetition: "Repetition",
  role_slip: "Role slip",
  wrong_intent: "Wrong intent",
};
// One distinct colour per drift kind for the consolidated "kinds of drift" bar.
const DRIFT_KIND_COLOR: Record<string, string> = {
  "Off-topic": "#fa4d56",
  Gibberish: "#a2191f",
  Degrading: "#ff832b",
  "Mostly incoherent": "#8a3800",
  Hallucination: "#8a3ffc",
  "Context lock-in": "#6929c4",
  "Wrong language": "#0f62fe",
  Repetition: "#005d5d",
  "Role slip": "#9f1853",
  "Wrong intent": "#1192e8",
};
const kindsOpts = {
  height: CHART_HEIGHT,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Sessions" },
    bottom: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
  },
  color: { scale: DRIFT_KIND_COLOR },
  legend: { enabled: false },
  toolbar: { enabled: false },
};

// "By experiment" is one chart with a dimension selector instead of three.
const EXP_ITEMS: { id: "promptVersion" | "model" | "provider"; label: string }[] = [
  { id: "promptVersion", label: "Prompt version" },
  { id: "model", label: "Model" },
  { id: "provider", label: "Provider" },
];

// "Root cause" = the STT-vs-LLM attribution of DRIFTED sessions only (why the
// drift happened). Coloured by family — LLM cool (blue/purple), STT warm.
const ROOT_CAUSE_LABEL: Record<string, string> = {
  llm_direct: "LLM (direct)",
  context_lockin: "LLM: context lock-in",
  stt_direct: "STT (direct)",
  stt_cascade: "STT (cascade)",
};
const ROOT_CAUSE_COLOR: Record<string, string> = {
  "LLM (direct)": "#0f62fe",
  "LLM: context lock-in": "#6929c4",
  "STT (direct)": "#fa4d56",
  "STT (cascade)": "#ff832b",
};
const rootCauseOpts = {
  height: CHART_HEIGHT,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Sessions" },
    bottom: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
  },
  color: { scale: ROOT_CAUSE_COLOR },
  legend: { enabled: false },
  toolbar: { enabled: false },
};

// STT input quality (counselor-side garble severity + error type) — a separate
// concern from drift, shown across ALL sessions. Warm STT palette.
const STT_INPUT_LABEL: Record<string, string> = {
  partial: "Garble: partial",
  severe: "Garble: severe",
  phonetic_garble: "Phonetic garble",
  wrong_language: "Wrong language",
  number_format: "Number format",
  entity_swap: "Entity swap",
  code_mix_fail: "Code-mix fail",
  truncation: "Truncation",
};
const STT_INPUT_COLOR: Record<string, string> = {
  "Garble: partial": "#ffb784",
  "Garble: severe": "#a2191f",
  "Phonetic garble": "#d2a106",
  "Wrong language": "#9f1853",
  "Number format": "#8a3800",
  "Entity swap": "#ba4e00",
  "Code-mix fail": "#ba4e8a",
  Truncation: "#570408",
};
const sttInputOpts = {
  height: CHART_HEIGHT,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Sessions" },
    bottom: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
  },
  color: { scale: STT_INPUT_COLOR },
  legend: { enabled: false },
  toolbar: { enabled: false },
};

const ratePctBars = (rows: { key: string; driftRate: number }[] = []) =>
  rows.map(r => ({ group: r.key, value: Number((r.driftRate * 100).toFixed(1)) }));

const SubHeading = ({ children }: { children: string }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </p>
);

const Cell = ({
  title,
  caption,
  empty,
  children,
}: {
  title: string;
  caption?: string;
  empty: boolean;
  children: ReactNode;
}) => (
  <div>
    <p className="text-sm font-medium text-typography-900">{title}</p>
    {caption && <p className="text-xs text-typography-500 mb-2">{caption}</p>}
    {!caption && <div className="mb-2" />}
    {empty ? (
      <div
        className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500"
        style={{ height: CHART_HEIGHT }}
      >
        No data for this range
      </div>
    ) : (
      children
    )}
  </div>
);

export const ConversationDrift = () => {
  const [range, setRange] = useState<AnalyticsRange>("90d");
  const [language, setLanguage] = useState<string>("");
  const [expDim, setExpDim] = useState<"promptVersion" | "model" | "provider">("promptVersion");

  const { data, isLoading, isError, refetch } = useGetConversationDriftQuery({
    range,
    language: language || undefined,
  });

  // Re-run backfill (last 3 months) for prompt iteration; poll until done.
  const [startBackfill, { isLoading: starting }] = useStartDriftBackfillMutation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const { data: job } = useGetDriftBackfillStatusQuery(jobId ?? "", {
    skip: !jobId,
    pollingInterval: polling ? 3000 : 0,
  });
  const jobActive = starting || polling;

  const handleRerun = async () => {
    try {
      const res = await startBackfill({ sinceDays: 90 }).unwrap();
      setJobId(res.jobId);
      setPolling(true);
    } catch {
      /* button re-enables on error */
    }
  };

  useEffect(() => {
    if (job && (job.status === "done" || job.status === "error")) {
      setPolling(false);
      if (job.status === "done") refetch();
    }
  }, [job, refetch]);

  const selectedRange = RANGE_ITEMS.find(i => i.id === range);
  const selectedLanguage = LANGUAGE_ITEMS.find(i => i.id === language);

  const worstLanguage = useMemo(() => {
    const rows = data?.driftRateByLanguage ?? [];
    if (rows.length === 0) return null;
    return rows.reduce((a, b) => (b.driftRate > a.driftRate ? b : a));
  }, [data]);

  const kpis = useMemo(
    () => [
      { label: "Overall drift rate", value: pct(data?.summary.driftRate ?? 0) },
      { label: "Drifted sessions", value: `${data?.summary.driftedSessions ?? 0}` },
      { label: "Sessions judged", value: `${data?.summary.totalSessions ?? 0}` },
      {
        label: "Worst language",
        value: worstLanguage ? `${worstLanguage.language} · ${pct(worstLanguage.driftRate)}` : "—",
      },
    ],
    [data, worstLanguage],
  );

  const driftRateBars = useMemo(
    () =>
      (data?.driftRateByLanguage ?? []).map(r => ({
        group: r.language,
        value: Number((r.driftRate * 100).toFixed(1)),
      })),
    [data],
  );
  const kindsBars = useMemo(
    () =>
      (data?.kindsOfDrift ?? []).map(r => ({
        group: DRIFT_KIND_LABEL[r.key] ?? r.key,
        value: r.count,
      })),
    [data],
  );
  const rootCauseBars = useMemo(
    () =>
      (data?.rootCause ?? []).map(r => ({
        group: ROOT_CAUSE_LABEL[r.key] ?? r.key,
        value: r.count,
      })),
    [data],
  );
  const sttInputBars = useMemo(
    () =>
      (data?.sttInputQuality ?? []).map(r => ({
        group: STT_INPUT_LABEL[r.key] ?? r.key,
        value: r.count,
      })),
    [data],
  );
  const onsetBars = useMemo(
    () =>
      (data?.firstDriftTurnHistogram ?? []).map(b => ({
        group: `turn ${b.turn}`,
        value: b.sessions,
      })),
    [data],
  );
  const trendData = useMemo(
    () =>
      (data?.driftTrend ?? []).map(p => ({
        group: "Drift rate",
        key: p.bucket,
        value: Number((p.driftRate * 100).toFixed(1)),
      })),
    [data],
  );

  // "By experiment" rows for the selected dimension. Treat an all-'unknown'
  // result as empty: those sessions predate experiment-config capture, so a lone
  // "unknown" bar is noise, not signal.
  const expRows =
    expDim === "promptVersion"
      ? data?.driftRateByPromptVersion
      : expDim === "model"
        ? data?.driftRateByModel
        : data?.driftRateByProvider;
  const expEmpty = !expRows?.length || expRows.every(r => r.key === "unknown");
  const selectedExp = EXP_ITEMS.find(i => i.id === expDim);

  return (
    // No own scroll container — flows inside the Analytics page's single scroll
    // area. `analytics-carbon` scopes chart CSS.
    <div className="analytics-carbon font-primary mt-8">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Heading className="text-2xl">Conversation drift</Heading>
            <div className="flex items-center gap-3">
              <div className="w-44">
                <Dropdown
                  id="drift-range"
                  size="md"
                  titleText="Time range"
                  hideLabel
                  label="Time range"
                  items={RANGE_ITEMS}
                  selectedItem={selectedRange}
                  itemToString={item => item?.label ?? ""}
                  onChange={({ selectedItem }) => {
                    if (selectedItem) setRange(selectedItem.id);
                  }}
                />
              </div>
              <div className="w-44">
                <Dropdown
                  id="drift-language"
                  size="md"
                  titleText="Language"
                  hideLabel
                  label="Language"
                  items={LANGUAGE_ITEMS}
                  selectedItem={selectedLanguage}
                  itemToString={item => item?.label ?? ""}
                  onChange={({ selectedItem }) => {
                    if (selectedItem) setLanguage(selectedItem.id);
                  }}
                />
              </div>
              <Button kind="tertiary" size="md" disabled={jobActive} onClick={handleRerun}>
                {jobActive ? "Re-running…" : "Re-run last 3 months"}
              </Button>
            </div>
          </div>

          {job && (
            <InlineNotification
              kind={job.status === "error" ? "error" : job.status === "done" ? "success" : "info"}
              lowContrast
              hideCloseButton
              className="mb-4"
              title={
                job.status === "done"
                  ? `Backfill complete — judged ${job.judged} session(s), ${job.drifted} drifted.`
                  : job.status === "error"
                    ? `Backfill failed: ${job.error ?? "unknown error"}`
                    : `Backfill ${job.status}… ${job.processed}/${job.total} sessions`
              }
              subtitle=""
            />
          )}

          {isError ? (
            <div className="flex flex-col items-start gap-4">
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn't load drift analytics"
                subtitle="There was a problem fetching conversation-drift metrics."
              />
              <Button kind="tertiary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <SkeletonPlaceholder className="analytics-chart-skeleton" />
          ) : (
            <Tile className="p-6">
              {/* STATUS & TREND — all session-level */}
              <SubHeading>Status &amp; trend</SubHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-2">
                {kpis.map(kpi => (
                  <Tile key={kpi.label} className="analytics-kpi">
                    <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
                    <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
                  </Tile>
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
                <Cell
                  title="Drift rate over time"
                  caption="% of sessions that drifted, per period"
                  empty={!data?.driftTrend?.length}
                >
                  <LineChart data={trendData} options={trendOpts} />
                </Cell>
                <Cell
                  title="When does drift start?"
                  caption="Sessions by the turn at which drift first began (empty until sessions drift)"
                  empty={!data?.firstDriftTurnHistogram?.length}
                >
                  <SimpleBarChart data={onsetBars} options={barOpts("Sessions")} />
                </Cell>
              </div>

              {/* WHERE */}
              <SubHeading>Where it&apos;s worst</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Drift rate by language"
                  caption="% of sessions that drifted, per language"
                  empty={!data?.driftRateByLanguage?.length}
                >
                  <SimpleBarChart data={driftRateBars} options={barOpts("Drift rate %")} />
                </Cell>
              </div>

              {/* KINDS OF DRIFT — consolidated colour-coded bar, drifted sessions */}
              <SubHeading>Kinds of drift (drifted sessions)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Kinds of drift"
                  caption="Among sessions that drifted, how many showed each kind. A session can show several kinds, so bars overlap. Empty when no session crossed the drift threshold."
                  empty={!data?.kindsOfDrift?.length}
                >
                  <SimpleBarChart data={kindsBars} options={kindsOpts} />
                </Cell>
              </div>

              {/* ROOT CAUSE — attribution of DRIFTED sessions (STT vs LLM) */}
              <SubHeading>Root cause — STT vs LLM (drifted sessions)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Root cause"
                  caption="Among drifted sessions, what caused it — LLM (blue/purple) vs STT (red/orange). Empty when no session drifted."
                  empty={!data?.rootCause?.length}
                >
                  <SimpleBarChart data={rootCauseBars} options={rootCauseOpts} />
                </Cell>
              </div>

              {/* STT INPUT QUALITY — counselor-side garble/errors, ALL sessions */}
              <SubHeading>STT input quality (all sessions)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Counselor STT garble & error types"
                  caption="How often the counselor's speech-to-text was garbled, and the error type — across all sessions, independent of whether the AI drifted. A session can show several, so bars overlap."
                  empty={!data?.sttInputQuality?.length}
                >
                  <SimpleBarChart data={sttInputBars} options={sttInputOpts} />
                </Cell>
              </div>

              {/* EXPERIMENT SLICE — one chart with a dimension selector */}
              <div className="flex items-center justify-between gap-4 mt-8 mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-typography-500">
                  By experiment
                </p>
                <div className="w-44">
                  <Dropdown
                    id="drift-exp-dim"
                    size="sm"
                    titleText="Dimension"
                    hideLabel
                    label="Dimension"
                    items={EXP_ITEMS}
                    selectedItem={selectedExp}
                    itemToString={item => item?.label ?? ""}
                    onChange={({ selectedItem }) => {
                      if (selectedItem) setExpDim(selectedItem.id);
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title={`Drift rate by ${selectedExp?.label.toLowerCase() ?? "dimension"}`}
                  caption={
                    expEmpty
                      ? "Not captured for these sessions yet — populates once live app sessions (which record prompt / model / provider) are judged."
                      : "% of sessions that drifted, per value"
                  }
                  empty={expEmpty}
                >
                  <SimpleBarChart data={ratePctBars(expRows)} options={barOpts("Drift rate %")} />
                </Cell>
              </div>
            </Tile>
          )}
        </Section>
      </Theme>
    </div>
  );
};
