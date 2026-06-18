import { useEffect, useMemo, useState } from "react";

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

import { ChartCard, PALETTE, barOpts, lineOpts } from "../Analytics/chartKit";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// Everything is now session-level. The "kind" panels count SESSIONS per
// category — and a session can fall in several categories (different turns),
// so the counts overlap and don't sum to a whole → bars, not pies. Titles live
// on <ChartCard> so empty charts can show a placeholder.

// Two series — Live (pipeline) vs Historical (transcript) — like the
// voice-latency chart's pipeline/transcript split.
const trendOpts = lineOpts({
  leftTitle: "Drift rate %",
  bottomTitle: "Period",
  colorScale: { Live: PALETTE.blue, Historical: PALETTE.gray },
});

// Session source → friendly series name for the trend.
const SOURCE_LABEL: Record<string, string> = {
  pipeline: "Live",
  transcript: "Historical",
  unknown: "Unknown",
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
  "Off-topic": PALETTE.red,
  Gibberish: PALETTE.darkRed,
  Degrading: PALETTE.orange,
  "Mostly incoherent": "#8a3800",
  Hallucination: PALETTE.purple,
  "Context lock-in": PALETTE.indigo,
  "Wrong language": PALETTE.blue,
  Repetition: "#005d5d",
  "Role slip": PALETTE.magenta,
  "Wrong intent": "#1192e8",
};
const kindsOpts = barOpts({ leftTitle: "Sessions", colorScale: DRIFT_KIND_COLOR });

// "By experiment" is one chart with a dimension selector. Both the LLM and the
// STT model can contribute to drift; provider is intentionally omitted.
const EXP_ITEMS: {
  id: "promptVersion" | "model" | "sttModel";
  label: string;
}[] = [
  { id: "promptVersion", label: "Main agent prompt" },
  { id: "model", label: "LLM model" },
  { id: "sttModel", label: "STT model" },
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
  "LLM (direct)": PALETTE.blue,
  "LLM: context lock-in": PALETTE.indigo,
  "STT (direct)": PALETTE.red,
  "STT (cascade)": PALETTE.orange,
};
const rootCauseOpts = barOpts({ leftTitle: "Sessions", colorScale: ROOT_CAUSE_COLOR });

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
  "Garble: severe": PALETTE.darkRed,
  "Phonetic garble": PALETTE.gold,
  "Wrong language": PALETTE.magenta,
  "Number format": "#8a3800",
  "Entity swap": "#ba4e00",
  "Code-mix fail": "#ba4e8a",
  Truncation: "#570408",
};
const sttInputOpts = barOpts({ leftTitle: "Sessions", colorScale: STT_INPUT_COLOR });

const ratePctBars = (rows: { key: string; driftRate: number }[] = []) =>
  rows.map(r => ({ group: r.key, value: Number((r.driftRate * 100).toFixed(1)) }));

const SubHeading = ({ children }: { children: string }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </p>
);

// `range` and `language` come from the shared selectors at the top of the
// Analytics page — no separate dropdowns here.
export const ConversationDrift = ({
  range,
  language,
}: {
  range: AnalyticsRange;
  language: string;
}) => {
  const [expDim, setExpDim] = useState<"promptVersion" | "model" | "sttModel">("promptVersion");

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
  // STT input quality, split into its two distinct axes so each chart is one
  // clean dimension: severity (how badly garbled) vs error type (what kind).
  const garbleSeverityBars = useMemo(
    () =>
      (data?.sttGarbleMix ?? [])
        .filter(r => r.key === "partial" || r.key === "severe")
        .map(r => ({ group: STT_INPUT_LABEL[r.key] ?? r.key, value: r.count })),
    [data],
  );
  const errorTypeBars = useMemo(
    () =>
      (data?.sttErrorTypeMix ?? []).map(r => ({
        group: STT_INPUT_LABEL[r.key] ?? r.key,
        value: r.count,
      })),
    [data],
  );
  const trendData = useMemo(
    () =>
      (data?.driftTrend ?? []).map(p => ({
        group: SOURCE_LABEL[p.source] ?? p.source,
        key: p.bucket,
        value: Number((p.driftRate * 100).toFixed(1)),
      })),
    [data],
  );

  // "By experiment" rows for the selected dimension (LLM model / STT model /
  // prompt version). The backend already excludes uncaptured values, so an
  // empty result just means nothing was captured for that dimension yet.
  const expRows =
    expDim === "promptVersion"
      ? data?.driftRateByPromptVersion
      : expDim === "model"
        ? data?.driftRateByModel
        : data?.driftRateBySttModel;
  const expEmpty = !expRows?.length;
  const selectedExp = EXP_ITEMS.find(i => i.id === expDim);

  return (
    // No own scroll container — flows inside the Analytics page's single scroll
    // area. `analytics-carbon` scopes chart CSS.
    <div className="analytics-carbon font-primary mt-8">
      <Theme theme="white">
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Heading className="text-2xl">Conversation drift</Heading>
            <Button kind="tertiary" size="md" disabled={jobActive} onClick={handleRerun}>
              {jobActive ? "Re-running…" : "Re-run last 3 months"}
            </Button>
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
              <div className="grid grid-cols-1 gap-6 mt-4">
                <ChartCard
                  bare
                  title="Drift rate over time"
                  caption="% of sessions that drifted, per period — Live (real app runs) vs Historical (backfilled)"
                  empty={!data?.driftTrend?.length}
                >
                  <LineChart data={trendData} options={trendOpts} />
                </ChartCard>
              </div>

              {/* WHERE */}
              <SubHeading>Where it&apos;s worst</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <ChartCard
                  bare
                  title="Drift rate by language"
                  caption="% of sessions that drifted, per language"
                  empty={!data?.driftRateByLanguage?.length}
                >
                  <SimpleBarChart data={driftRateBars} options={barOpts({ leftTitle: "Drift rate %" })} />
                </ChartCard>
              </div>

              {/* KINDS OF DRIFT — consolidated colour-coded bar, drifted sessions */}
              <SubHeading>Kinds of drift (drifted sessions)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <ChartCard
                  bare
                  title="Kinds of drift"
                  caption="Among sessions that drifted, how many showed each kind. A session can show several kinds, so bars overlap. Empty when no session crossed the drift threshold."
                  empty={!data?.kindsOfDrift?.length}
                >
                  <SimpleBarChart data={kindsBars} options={kindsOpts} />
                </ChartCard>
              </div>

              {/* ROOT CAUSE — attribution of DRIFTED sessions (STT vs LLM) */}
              <SubHeading>Root cause — STT vs LLM (drifted sessions)</SubHeading>
              <div className="grid grid-cols-1 gap-6">
                <ChartCard
                  bare
                  title="Root cause"
                  caption="Among drifted sessions, what caused it — LLM (blue/purple) vs STT (red/orange). Empty when no session drifted."
                  empty={!data?.rootCause?.length}
                >
                  <SimpleBarChart data={rootCauseBars} options={rootCauseOpts} />
                </ChartCard>
              </div>

              {/* STT INPUT QUALITY — counselor-side garble, ALL sessions. Two
                  separate axes: severity (how bad) and error type (what kind). */}
              <SubHeading>STT input quality (all sessions)</SubHeading>
              <p className="text-xs text-typography-500 -mt-2 mb-3">
                How often the counselor&apos;s speech-to-text was garbled, across all sessions —
                independent of whether the AI drifted.
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard
                  bare
                  title="Garble severity"
                  caption="How badly the counselor transcript was mangled (sessions with ≥1 partial / severe turn)."
                  empty={!garbleSeverityBars.length}
                >
                  <SimpleBarChart data={garbleSeverityBars} options={sttInputOpts} />
                </ChartCard>
                <ChartCard
                  bare
                  title="STT error type"
                  caption="What kind of STT mistake occurred — points at the fix (provider / language / biasing)."
                  empty={!data?.sttErrorTypeMix?.length}
                >
                  <SimpleBarChart data={errorTypeBars} options={sttInputOpts} />
                </ChartCard>
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
                <ChartCard
                  bare
                  title={`Drift rate by ${selectedExp?.label.toLowerCase() ?? "dimension"}`}
                  caption={
                    expEmpty
                      ? "Not captured for these sessions yet — populates once sessions with this dimension recorded are judged."
                      : "% of sessions that drifted, per value"
                  }
                  empty={expEmpty}
                >
                  <SimpleBarChart data={ratePctBars(expRows)} options={barOpts({ leftTitle: "Drift rate %" })} />
                </ChartCard>
              </div>
            </Tile>
          )}
        </Section>
      </Theme>
    </div>
  );
};
