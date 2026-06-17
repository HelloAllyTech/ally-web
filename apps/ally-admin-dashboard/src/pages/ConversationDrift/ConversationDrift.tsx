import { ReactNode, useEffect, useMemo, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { HeatmapChart, LineChart, SimpleBarChart } from "@carbon/charts-react";
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
// Kinds × language as a heatmap (not a stacked bar): a session can have several
// kinds, so each (language, kind) cell is independent and a multi-kind session
// simply lights up multiple cells — no misleading sum-to-whole.
const heatmapOpts = {
  height: CHART_HEIGHT,
  axes: {
    bottom: { title: "Language", mapsTo: "language", scaleType: ScaleTypes.LABELS },
    left: { title: "Drift kind", mapsTo: "kind", scaleType: ScaleTypes.LABELS },
  },
  heatmap: { colorLegend: { title: "Sessions affected" } },
  toolbar: { enabled: false },
};

// Code → friendly language label (reused for the heatmap axis).
const LANG_LABEL: Record<string, string> = {
  ta: "Tamil",
  hi: "Hindi",
  bn: "Bengali",
  te: "Telugu",
  en: "English",
};

// "By experiment" is one chart with a dimension selector instead of three.
const EXP_ITEMS: { id: "promptVersion" | "model" | "provider"; label: string }[] = [
  { id: "promptVersion", label: "Prompt version" },
  { id: "model", label: "Model" },
  { id: "provider", label: "Provider" },
];

// Consolidated "root cause" chart: attribution (STT vs LLM) + the STT
// specifics (garble severity + error type) in one bar chart. Coloured by
// family — LLM causes cool (blue/purple), STT causes warm (red/orange) — so
// the STT-vs-LLM split reads at a glance.
const ROOT_CAUSE_LABEL: Record<string, string> = {
  llm_direct: "LLM (direct)",
  context_lockin: "LLM: context lock-in",
  stt_direct: "STT (direct)",
  stt_cascade: "STT (cascade)",
  partial: "Garble: partial",
  severe: "Garble: severe",
  phonetic_garble: "STT: phonetic garble",
  wrong_language: "STT: wrong language",
  number_format: "STT: number format",
  entity_swap: "STT: entity swap",
  code_mix_fail: "STT: code-mix fail",
  truncation: "STT: truncation",
};
const ROOT_CAUSE_COLOR: Record<string, string> = {
  // LLM family — cool
  "LLM (direct)": "#0f62fe",
  "LLM: context lock-in": "#6929c4",
  // STT family — warm
  "STT (direct)": "#fa4d56",
  "STT (cascade)": "#ff832b",
  "Garble: partial": "#ffb784",
  "Garble: severe": "#a2191f",
  "STT: phonetic garble": "#d2a106",
  "STT: wrong language": "#9f1853",
  "STT: number format": "#8a3800",
  "STT: entity swap": "#ba4e00",
  "STT: code-mix fail": "#ba4e8a",
  "STT: truncation": "#570408",
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
  const rootCauseBars = useMemo(
    () =>
      (data?.rootCause ?? []).map(r => ({
        group: ROOT_CAUSE_LABEL[r.key] ?? r.key,
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

  // Full language × kind grid (missing cells filled with 0 so the heatmap is a
  // complete rectangle). Kinds are ordered by the DRIFT_KIND_LABEL declaration.
  const heatmapData = useMemo(() => {
    const rows = data?.kindByLanguage ?? [];
    if (!rows.length) return [];
    const langs = [...new Set(rows.map(r => r.language))];
    const kindsPresent = Object.keys(DRIFT_KIND_LABEL).filter(k => rows.some(r => r.kind === k));
    const lookup = new Map(rows.map(r => [`${r.language}|${r.kind}`, r.count]));
    return langs.flatMap(lang =>
      kindsPresent.map(k => ({
        language: LANG_LABEL[lang] ?? lang,
        kind: DRIFT_KIND_LABEL[k] ?? k,
        value: lookup.get(`${lang}|${k}`) ?? 0,
      })),
    );
  }, [data]);

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

              {/* KINDS OF DRIFT × LANGUAGE — heatmap (cells independent; a
                  multi-kind session lights up several cells, no double-count) */}
              <SubHeading>Kinds of drift by language (sessions affected)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Kinds of drift × language"
                  caption="Sessions with ≥1 turn of each drift kind, per language. Darker = more sessions. A session can show several kinds, so it counts in multiple cells — drift categories only (healthy states excluded)."
                  empty={!data?.kindByLanguage?.length}
                >
                  <HeatmapChart data={heatmapData} options={heatmapOpts} />
                </Cell>
              </div>

              {/* ROOT CAUSE / STT — one consolidated, colour-coded bar chart */}
              <SubHeading>Root cause — STT vs LLM (sessions affected)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <Cell
                  title="Root cause"
                  caption="Sessions affected by each root cause — LLM (blue/purple) vs STT (red/orange), with the STT garble severity & error type. A session can show several, so bars overlap."
                  empty={!data?.rootCause?.length}
                >
                  <SimpleBarChart data={rootCauseBars} options={rootCauseOpts} />
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
