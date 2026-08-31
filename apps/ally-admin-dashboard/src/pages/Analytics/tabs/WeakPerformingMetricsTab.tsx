import { FC, useMemo, useState } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";
import { Link } from "react-router-dom";

import "@carbon/charts/styles.css";
import "../analytics-carbon.scss";

import {
  CarbonDropdown as Dropdown,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { useGetWeakPerformingMetricsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { ROUTES } from "@constants";
import {
  WeakMetricGroup,
  WeakMetricSeries,
  WeakMetricState,
  WeakMetricTurnBand,
  WeakMetricTurnConditions,
  WeakMetricTurnFactor,
} from "@types";

import { AnalyticsTabFilters } from "../analyticsFilters";
import { inProgressCaption, withoutInProgress } from "../analyticsGrouping";
import { ChartCard, buildSource, lineOpts, single, timeBarOpts } from "../chartKit";
import { PALETTE } from "../chartScales";
import { TabControls } from "../tabControlsSlot";

/**
 * Weak performing metrics — the five simulator-quality metrics under active
 * repair, on one filter tuple.
 *
 * Three rules this tab is built around, each learned from a number that misled
 * us:
 *
 * 1. NEVER SHOW A BARE RATE. Every series carries a `state` and a `caveat` from
 *    the API, both rendered on the face of the card. Several of these signals
 *    are honest-but-partial — a near-zero dialect-lexicon line means the
 *    detector is blind, and a zero barge-in line means nothing writes the flag.
 *    Rendered as plain numbers they would read as good news.
 *
 * 2. SEGMENTATION IS PART OF THE METRIC, NOT A GARNISH. Three separate findings
 *    in this data turned out to be composition artefacts rather than
 *    regressions. So the model / language / scenario pickers sit at the top of
 *    the tab, and the per-scenario table is on the page by default rather than
 *    behind a drill-in.
 *
 * 3. THE UNIT OF ACTION IS THE SCENARIO. A quarter of all role-slips sit in
 *    three scenarios, and an English one is among the worst. The worst-scenario
 *    table links straight into session logs so a bad row can be opened and read
 *    turn by turn.
 */

type TagType = "green" | "warm-gray" | "red";

const STATE_TAG: Record<WeakMetricState, { type: TagType; label: string }> = {
  measured: { type: "green", label: "Measured" },
  partial: { type: "warm-gray", label: "Partial" },
  none: { type: "red", label: "Not measured" },
};

const UNIT_SUFFIX: Record<string, string> = {
  percent: "%",
  per100turns: " /100 turns",
  ratio: "×",
  count: "",
};

/** Series values are stored as fractions; only `percent` is scaled for display. */
const toDisplay = (value: number, unit: string): number =>
  unit === "percent" ? value * 100 : unit === "per100turns" ? value * 100 : value;

const formatValue = (value: number | null, unit: string): string => {
  if (value === null || Number.isNaN(value)) return "—";
  const shown = toDisplay(value, unit);
  const digits = unit === "ratio" ? 2 : shown >= 10 ? 1 : 2;
  return `${shown.toFixed(digits)}${UNIT_SUFFIX[unit] ?? ""}`;
};

/**
 * Direction of travel between the last two non-empty buckets.
 *
 * Returns null rather than "0%" when there is nothing to compare: on a sparse
 * series the absence of a prior bucket and a genuinely flat metric are
 * different statements.
 */
const deltaLabel = (s: WeakMetricSeries): string | null => {
  // An uninstrumented metric has no trend to report. Barge-in reads 0 because
  // nothing writes the flag, so its denominator moving between buckets produced
  // "↓ 4.3% — improving" on screen: a confident verdict about a signal nobody
  // is recording. Numbers exist; a direction would be a claim.
  if (s.state === "none") return null;
  if (s.latest === null || s.previous === null) return null;
  const diff = toDisplay(s.latest, s.unit) - toDisplay(s.previous, s.unit);
  if (Math.abs(diff) < 0.005) return "no change";
  const arrow = diff < 0 ? "↓" : "↑";
  const digits = s.unit === "ratio" ? 2 : 1;
  const movement = `${arrow} ${Math.abs(diff).toFixed(digits)}${UNIT_SUFFIX[s.unit] ?? ""}`;

  // Some metrics have no good direction, and saying one anyway is a fabricated
  // verdict. Barge-in is the case: interruption is ordinary conversation, and
  // its rate turned out flat across every actor turn length above 100
  // characters — it tracks the opportunity to cut in, not whether the actor
  // deserved it. Those report the movement and stop there.
  if (s.lowerIsBetter === null) return movement;
  const better = s.lowerIsBetter ? diff < 0 : diff > 0;
  return `${movement} — ${better ? "improving" : "worsening"}`;
};

/**
 * Form follows the data's shape, not the series' identity.
 *
 * These 21 series have very different densities over the same window:
 * feedback-derived ones have 12 monthly buckets, drift-derived 6, and
 * language-derived only 2 (that judge started in July). A line drawn through
 * two observations *looks* like a direction and isn't one. Per the dataviz
 * form heuristic, a current value plus a delta is a stat, not a chart.
 *
 *   0 valued buckets -> empty state, no axes
 *   1-4              -> COLUMNS, one per bucket
 *   5+               -> line chart
 *
 * Columns rather than a line for the sparse case because a column compares
 * magnitudes without asserting anything about what happens between them — which
 * is exactly the claim two points cannot support. Not a pie: these are rates
 * over time, not parts of a whole, and a pie of two slices is the form the
 * dataviz reference names as the wrong answer to a single ratio.
 */
const MIN_BUCKETS_FOR_A_LINE = 5;

type SeriesForm = "empty" | "clean" | "stat" | "line";

/**
 * A measured zero is not an empty chart, and until now it drew like one.
 *
 * Filter the tab to Hindi and the whole Language realism group went blank. It
 * had 437 judged turns behind it and had found zero register, translationese
 * and lexicon errors — a real, hard-won result — but zero-height bars are
 * indistinguishable from no bars, so it read as "this is broken" rather than
 * "this is clean". That is precisely the confusion between "not measured" and
 * "measured, nothing found" the rest of this tab works to prevent.
 */
const seriesForm = (valuedBuckets: number, allZero: boolean): SeriesForm => {
  if (valuedBuckets === 0) return "empty";
  if (allZero) return "clean";
  if (valuedBuckets < MIN_BUCKETS_FOR_A_LINE) return "stat";
  return "line";
};

const SeriesCard: FC<{
  series: WeakMetricSeries;
  bucket: string;
  inProgressBucket?: string | null;
}> = ({ series, bucket, inProgressBucket }) => {
  // `withoutInProgress` strips the still-accruing bucket from what is PLOTTED
  // only — the same contract every other tab uses. Three days of the current
  // week charted beside seven-day weeks read as quality collapsing, which is
  // how "data stops on the 17th" and a fake cliff arrive together. The full
  // series still reaches the denominator below and the expanded view's table.
  const points = useMemo(
    () =>
      withoutInProgress(
        // Thin buckets come off the plot for the same reason the accruing one
        // does: drawn beside a bucket a hundred times their size they read as a
        // swing in quality rather than a swing in traffic.
        series.points.filter(p => p.value !== null && !p.sparse),
        p => p.bucket,
        inProgressBucket,
      ).map(p => ({
        group: series.label,
        key: p.bucket,
        value: toDisplay(p.value as number, series.unit),
      })),
    [series, inProgressBucket],
  );

  const totalDenominator = series.points.reduce((a, p) => a + p.denominator, 0);
  const tag = STATE_TAG[series.state];

  // A "none" series still renders its chart — but captioned as an
  // instrumentation gap, so an empty or flat line is read as "we are not
  // measuring this" rather than "this never happens".
  // The caveat used to be the card's caption — body text on every card, three
  // or four lines of weighting rules and exclusions above a two-bar chart. It
  // crowded out the number it was there to qualify. It is reference material a
  // reader reaches for once, so it moves behind a tooltip and the caption
  // carries the one line that says what is being counted.
  const thinCount = series.points.filter(p => p.value !== null && p.sparse).length;
  const caption =
    [
      series.description,
      inProgressCaption(bucket as never, inProgressBucket),
      // Named, not silently dropped — otherwise a reader comparing this chart
      // against the raw counts finds buckets missing and no reason given.
      thinCount
        ? ` ${thinCount} ${bucket === "week" ? "week" : "month"}${
            thinCount === 1 ? "" : "s"
          } had too few turns to read as a rate and ${
            thinCount === 1 ? "is" : "are"
          } left off the plot; ${thinCount === 1 ? "it is" : "they are"} in the expanded view.`
        : "",
    ]
      .filter(Boolean)
      .join("") || undefined;

  // No "lower is better" caption. Every metric here is NAMED as the thing you
  // want less of — comprehension errors, unfair criticism, wrong language — so
  // spelling out the direction restates the title. `lowerIsBetter` still drives
  // the delta's improving/worsening wording, which says the same thing about
  // the movement that actually happened rather than as a standing rule.
  // A `none` series is one the reader has been told not to read: its headline
  // is "—" and its caveat explains why. Plotting it anyway invites exactly the
  // reading the caveat forbids — barge-in drew a 4.3% column sourced from a
  // flag nothing writes. No value, no plot, just the explanation.
  // Every bucket zero, with a real denominator behind it — nothing was found,
  // which is a finding rather than an absence.
  const allZero = points.length > 0 && points.every(p => p.value === 0);
  const form = series.state === "none" ? "empty" : seriesForm(points.length, allZero);

  return (
    <ChartCard
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
          {series.label}
          {series.caveat && (
            <Tooltip label={series.caveat} align="top">
              <button
                type="button"
                className="cursor-pointer inline-flex items-center"
                aria-label={`How ${series.label} is measured`}
              >
                <TooltipIcon />
              </button>
            </Tooltip>
          )}
        </span>
      }
      caption={caption}
      takeaway={
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <Tag type={tag.type} size="sm">
            {tag.label}
          </Tag>
          <strong>{series.state === "none" ? "—" : formatValue(series.latest, series.unit)}</strong>
          {deltaLabel(series) && <span style={{ opacity: 0.75 }}>{deltaLabel(series)}</span>}
        </span>
      }
      source={buildSource({
        derivation:
          series.state === "measured"
            ? "judge labels + deterministic counts"
            : "partial signal — read the caption",
        window: `by ${bucket}`,
        n: totalDenominator,
        nUnit: "denominator",
      })}
      empty={form === "empty"}
      emptyText={
        series.state === "none"
          ? "Not instrumented — nothing is being recorded for this metric yet."
          : "No data in this window."
      }
    >
      {form === "clean" ? (
        <p style={{ margin: "0.5rem 0", fontSize: "0.875rem", opacity: 0.75 }}>
          None found across {totalDenominator.toLocaleString()}{" "}
          {series.unit === "percent" || series.unit === "per100turns" ? "turns" : "items"} judged in
          this window.
        </p>
      ) : form === "line" ? (
        <LineChart
          data={points}
          options={lineOpts({
            leftTitle: UNIT_SUFFIX[series.unit]?.trim() || "Value",
            bottomTitle: bucket === "week" ? "Week" : "Month",
            colorScale: single(series.label, series.state === "none" ? PALETTE.gray : PALETTE.blue),
            legend: false,
          })}
        />
      ) : form === "stat" ? (
        <>
          <SimpleBarChart
            data={points}
            options={timeBarOpts({
              leftTitle: UNIT_SUFFIX[series.unit]?.trim() || "Value",
              bottomTitle: bucket === "week" ? "Week" : "Month",
              colorScale: single(
                series.label,
                series.state === "none" ? PALETTE.gray : PALETTE.blue,
              ),
              legend: false,
            })}
          />
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.7 }}>
            {points.length === 1
              ? "One measured bucket — compared, not trended."
              : `${points.length} ${bucket === "week" ? "weeks" : "months"} of data so far — not enough to show a trend.`}
          </p>
        </>
      ) : null}
    </ChartCard>
  );
};

const GroupSection: FC<{
  group: WeakMetricGroup;
  bucket: string;
  inProgressBucket?: string | null;
}> = ({ group, bucket, inProgressBucket }) => {
  const tag = STATE_TAG[group.state];
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.75rem",
          marginBottom: "0.25rem",
        }}
      >
        <h3 style={{ margin: 0 }}>{group.label}</h3>
        <Tag type={tag.type} size="sm">
          {tag.label}
        </Tag>
      </div>
      <p style={{ margin: "0 0 1rem", opacity: 0.75 }}>{group.description}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1rem",
        }}
      >
        {group.series.map(s => (
          <SeriesCard key={s.id} series={s} bucket={bucket} inProgressBucket={inProgressBucket} />
        ))}
      </div>
    </section>
  );
};

/**
 * Band edges come back as raw numbers because only the client knows how wide
 * the column is. Milliseconds read as seconds once they pass a second — "5.8s"
 * is a duration a person holds in their head, "5842ms" is a measurement.
 */
const formatEdge = (value: number, unit: string): string => {
  if (unit !== "ms") return String(Math.round(value));
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
};

const FLAG_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  fired: "Ran",
  skipped: "Did not run",
};

const bandLabel = (band: WeakMetricTurnBand, unit: string): string => {
  if (band.lo === null || band.hi === null) return FLAG_LABELS[band.band] ?? band.band;
  if (band.lo === band.hi) return formatEdge(band.lo, unit);
  return `${formatEdge(band.lo, unit)} – ${formatEdge(band.hi, unit)}`;
};

/**
 * How much a factor separates its bands, in the words a reader will repeat.
 *
 * A ratio is the sharper statement ("faults 3x as often") but it is undefined
 * against a clean band, and reporting Infinity would be worse than saying
 * nothing. So the gap in percentage points is the fallback — always defined,
 * always honest, just less quotable.
 */
const spreadLabel = (factor: WeakMetricTurnFactor): string => {
  const rates = factor.bands.map(b => b.rate);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  if (lo > 0) return `worst band faults ${(hi / lo).toFixed(1)}× as often as the best`;
  return `${((hi - lo) * 100).toFixed(1)} points between the worst band and the best`;
};

/**
 * The panel that inverts the tab's question.
 *
 * Every other cut here compares populations — one language against another, one
 * model against the next — and that shape is hostage to traffic mix. This
 * compares turns against other turns in the SAME sessions, so who was using the
 * product cannot move it. Ordered by how much each condition actually separates
 * its bands, because a reader scans the top row and stops.
 */
const TurnConditionsSection: FC<{ data: WeakMetricTurnConditions }> = ({ data }) => {
  const baseline = data.baselineRate;

  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h3 style={{ margin: "0 0 0.25rem" }}>What was different about the turns that went wrong</h3>
      <p style={{ margin: "0 0 1rem", opacity: 0.75 }}>
        Turns compared against other turns in the same sessions, so a change in who was using the
        product cannot move these. Association, not cause — a slow turn may be slow because the
        input was hard, which is also why it was misread.
      </p>

      {data.factors.length === 0 ? (
        <Tile>
          <p style={{ margin: 0, opacity: 0.75 }}>
            No condition has enough judged turns behind it in this window. Turn metrics start on 10
            June 2026; sessions judged from before then join to nothing.
          </p>
        </Tile>
      ) : (
        <>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", opacity: 0.75 }}>
            {data.totalTurns.toLocaleString()} judged turns
            {baseline !== null && <> · {(baseline * 100).toFixed(1)}% carried a judge fault</>}
          </p>

          {data.factors.map(factor => {
            const worst = Math.max(...factor.bands.map(b => b.rate), 0);
            return (
              <Tile key={factor.id} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <strong>{factor.label}</strong>
                  <Tooltip label={factor.description} align="top">
                    <button type="button" className="cursor-pointer inline-flex items-center">
                      <TooltipIcon />
                    </button>
                  </Tooltip>
                </div>
                <p style={{ margin: "0.125rem 0 0.75rem", fontSize: "0.875rem", opacity: 0.75 }}>
                  {spreadLabel(factor)}
                </p>

                {factor.bands.map(band => (
                  <div
                    key={band.band}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "9rem 1fr 4rem 5rem",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.25rem 0",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem" }}>{bandLabel(band, factor.unit)}</span>
                    {/* Bars are scaled to the worst band rather than to 100%:
                        at these rates a full-width scale would render every bar
                        as a stub and the comparison the panel exists for would
                        be invisible. */}
                    <span
                      aria-hidden
                      style={{
                        display: "block",
                        height: "0.5rem",
                        borderRadius: "0.25rem",
                        background: PALETTE[0],
                        opacity: 0.85,
                        width: worst > 0 ? `${Math.max((band.rate / worst) * 100, 1)}%` : "1%",
                      }}
                    />
                    <strong style={{ fontSize: "0.875rem", textAlign: "right" }}>
                      {(band.rate * 100).toFixed(1)}%
                    </strong>
                    <span style={{ fontSize: "0.75rem", opacity: 0.7, textAlign: "right" }}>
                      {band.turns.toLocaleString()} turns
                    </span>
                  </div>
                ))}
              </Tile>
            );
          })}
        </>
      )}
    </section>
  );
};

export const WeakPerformingMetricsTab: FC<AnalyticsTabFilters> = ({ query, language }) => {
  const [llmModel, setLlmModel] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<number | undefined>(undefined);
  const [promptVersion, setPromptVersion] = useState<string>("");
  const [bucket, setBucket] = useState<"week" | "month">("month");

  const { data, isFetching, isError, refetch } = useGetWeakPerformingMetricsQuery({
    range: query.range,
    bucket,
    language: language || undefined,
    llmModel: llmModel || undefined,
    scenarioId,
    promptVersion: promptVersion || undefined,
  });

  /**
   * Scenario picker items are ids (with "" for "all") rather than objects: the
   * shared Dropdown infers one item type, and a mixed id/label object trips it.
   * Labels are resolved through a lookup instead.
   */
  const scenarioLabels = useMemo(() => {
    const map = new Map<string, string>([["", "All scenarios"]]);
    for (const sc of data?.filterOptions.scenarios ?? []) {
      map.set(String(sc.id), sc.title ? `${sc.id} · ${sc.title}` : `Scenario ${sc.id}`);
    }
    return map;
  }, [data]);

  const scenarioItems = useMemo(
    () => ["", ...(data?.filterOptions.scenarios ?? []).map(sc => String(sc.id))],
    [data],
  );

  // Everything a reader might need to audit a number, in one string behind an
  // icon: which thresholds produced it, and which judge version each family was
  // read through. Kept because "the version is pinned" matters when a chart
  // moves; relegated because it is not what anyone opens the tab to see.
  const provenance = [
    `Parameters ${data?.metricsVersion ?? "—"} — thresholds define these metrics, so changing one moves every historical point.`,
    ...(["drift", "language", "groundedness"] as const).map(family => {
      const pin = data?.judgeVersions?.[family];
      return `Judge (${family}): ${pin ? `${pin.judgeModel}/${pin.judgePromptVersion}` : "not run"}`;
    }),
  ].join(" · ");

  if (isError) {
    return (
      <ChartCard
        title="Actor quality metrics"
        error
        onRetry={() => refetch()}
        errorTitle="Could not load actor quality metrics"
      >
        <span />
      </ChartCard>
    );
  }

  return (
    <div>
      {/* Segmentation controls. On the page rather than in a drawer: reading
          these metrics unsegmented is the specific mistake this tab exists to
          prevent. */}
      {/* Model / scenario / granularity are slice dimensions like language and
          time range, so they belong in the SAME row as those — not in a second
          control group below the tab strip, which reads as scoping less than it
          does. Portalled up; the note below stays here with the charts.

          Labels are hidden to match the page's own pickers — a row where three
          controls carry captions and two do not reads as two groups again. Each
          value is self-describing instead, which is why granularity reads "By
          month" rather than "Month". */}
      <TabControls>
        <div className="w-40">
          <Dropdown
            id="weak-metrics-model"
            size="md"
            titleText="Model"
            hideLabel
            label="All models"
            items={["", ...(data?.filterOptions.models ?? [])]}
            selectedItem={llmModel}
            itemToString={(i: string) => i || "All models"}
            onChange={({ selectedItem }: { selectedItem: string }) =>
              setLlmModel(selectedItem ?? "")
            }
          />
        </div>
        <div className="w-56">
          <Dropdown
            id="weak-metrics-scenario"
            size="md"
            titleText="Scenario"
            hideLabel
            label="All scenarios"
            items={scenarioItems}
            selectedItem={scenarioId === undefined ? "" : String(scenarioId)}
            itemToString={(i: string) => scenarioLabels.get(i) ?? i}
            onChange={({ selectedItem }: { selectedItem: string }) =>
              setScenarioId(selectedItem ? Number(selectedItem) : undefined)
            }
          />
        </div>
        {/* The hypothesis slice: comparing two prompt versions over the SAME
            window separates the change from everything else that moved that
            month. Only versions with judged data are offered — one with none
            behind it would empty the tab and read as "this prompt fixed
            everything". */}
        <div className="w-40">
          <Dropdown
            id="weak-metrics-prompt-version"
            size="md"
            titleText="Prompt version"
            hideLabel
            label="All prompt versions"
            items={["", ...(data?.filterOptions.promptVersions ?? [])]}
            selectedItem={promptVersion}
            itemToString={(i: string) => (i ? `Prompt v${i}` : "All prompt versions")}
            onChange={({ selectedItem }: { selectedItem: string }) =>
              setPromptVersion(selectedItem ?? "")
            }
          />
        </div>
        <div className="w-36">
          <Dropdown
            id="weak-metrics-bucket"
            size="md"
            titleText="Granularity"
            hideLabel
            label="By month"
            items={["month", "week"]}
            selectedItem={bucket}
            itemToString={(i: string) => (i === "week" ? "By week" : "By month")}
            onChange={({ selectedItem }: { selectedItem: "week" | "month" }) =>
              setBucket(selectedItem ?? "month")
            }
          />
        </div>
      </TabControls>

      {/* No banner. The mix warning that stood here — repetition differs 6.6x
          between models — is real, but as a standing line above every read it
          became furniture, and it already sits on the repetition card's own
          caveat where it is actionable. Provenance moved to the foot of the
          tab, which is where a reader goes looking for it rather than past it. */}

      {isFetching && !data ? (
        <ChartCard title="Actor quality metrics" loading>
          <span />
        </ChartCard>
      ) : (
        <>
          {(data?.groups ?? []).map(g => (
            <GroupSection
              key={g.id}
              group={g}
              bucket={bucket}
              inProgressBucket={data?.inProgressBucket}
            />
          ))}

          {data?.turnConditions && <TurnConditionsSection data={data.turnConditions} />}

          {/* The action list. Kept on the page rather than behind a drill-in:
              the fix for clienthood is a scenario-brief edit, and this is the
              only view that says which brief. */}
          <section style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ margin: "0 0 0.25rem" }}>Worst scenarios by role-slip rate</h3>
            <p style={{ margin: "0 0 1rem", opacity: 0.75 }}>
              Role-slip is concentrated, not diffuse — a small number of scenarios carry a quarter
              of every slip, and an English scenario sits among the worst. The aggregate language
              gradient is largely a composition artefact of which scenarios ran in which language,
              so the brief is the thing to fix.
            </p>
            <Tile>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Scenario</TableHeader>
                    <TableHeader>Language</TableHeader>
                    <TableHeader>Sessions</TableHeader>
                    <TableHeader>Turns</TableHeader>
                    <TableHeader>Slips</TableHeader>
                    <TableHeader>Rate</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.worstScenarios ?? []).map(r => (
                    <TableRow key={`${r.scenarioId}-${r.language ?? "all"}`}>
                      <TableCell>
                        <Link to={`${ROUTES.ROLEPLAY_SESSION_LOGS}?search=${r.scenarioId}`}>
                          {r.title ? `${r.scenarioId} · ${r.title}` : r.scenarioId}
                        </Link>
                      </TableCell>
                      <TableCell>{r.language ?? "—"}</TableCell>
                      <TableCell>{r.sessions}</TableCell>
                      <TableCell>{r.turns}</TableCell>
                      <TableCell>{r.slips}</TableCell>
                      <TableCell>
                        <strong>{(r.rate * 100).toFixed(2)}%</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data?.worstScenarios?.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        No scenario has enough judged turns in this window.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Tile>
          </section>

          {/* Not a trend: one number that says whether the learner-facing score
              is measuring skill or session length. */}
          {data?.scoreLengthCorrelation !== null && data?.scoreLengthCorrelation !== undefined && (
            <section>
              <ChartCard
                title="Score vs session length"
                caption={
                  "Pearson r of the learner's skill score against log(turn count). " +
                  "A high value means the score is substantially measuring how long " +
                  "the learner talked rather than how well they did — which is a " +
                  "feedback-quality problem, not a learner one."
                }
                takeaway={
                  <strong>
                    r = {data.scoreLengthCorrelation.toFixed(3)}
                    {Math.abs(data.scoreLengthCorrelation) > 0.5
                      ? " — the score is substantially session length"
                      : ""}
                  </strong>
                }
              >
                <span />
              </ChartCard>
            </section>
          )}
        </>
      )}

      {/* Provenance at the foot, not the head. A reader who wants to know which
          thresholds and judge versions produced these numbers comes looking for
          it; a reader who wants the numbers should not have to scroll past it. */}
      <p
        style={{
          marginTop: "2rem",
          opacity: 0.55,
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        Parameters {data?.metricsVersion ?? "—"}
        <Tooltip label={provenance} align="top">
          <button
            type="button"
            className="cursor-pointer inline-flex items-center"
            aria-label="Data provenance"
          >
            <TooltipIcon />
          </button>
        </Tooltip>
      </p>
    </div>
  );
};
