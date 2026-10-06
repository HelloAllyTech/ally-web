import { useMemo, useState } from "react";

import { LineChart, SimpleBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetPracticeQualityQuery, useGetScenarioLanguagesQuery } from "@api";

import { asOfStamp, windowLabel } from "./analyticsFilters";
import {
  GROUPINGS,
  bucketTitle,
  grainAsBucket,
  groupingNote,
  inProgressCaption,
} from "./analyticsGrouping";
import { RANGE_SHORT, RangePicker, defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTileProps,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  lineOpts,
  timeBarOpts,
} from "./chartKit";
import {
  LEARNER_TURNS_SCALE,
  PCT_DOMAIN,
  PRACTICE_SHARE_SCALE,
  TALK_SHARE_SCALE,
  buildLearnerTurnsSeries,
  buildPracticeShareBars,
  buildTalkShareSeries,
  formatPctValue,
  hasAnyValue,
  plottedPoints,
  practiceQualityTableColumns,
  practiceQualityTableRows,
  practiceShareTakeaway,
  practiceThresholdsText,
  talkShareTakeaway,
} from "./practiceQualityChart";

/** The one control set both cards read — they are two views of one response. */
type ChartId = "practiceQuality";
const CHARTS: readonly ChartId[] = ["practiceQuality"];

const ALL_LANGUAGES = "";

/** The small turns chart under the talk share: context, so it gets less height. */
const TURNS_HEIGHT = "150px";

const ERROR_SUBTITLE =
  "The practice-quality endpoint did not respond — it may not be deployed yet.";

/**
 * Was it practice? — Highlights → Usage, AAQ-208 and AAQ-209.
 *
 * The 5-minute count above it (AAQ-041) measures length alone, and a session
 * can run five minutes with the learner saying almost nothing. These two cards
 * read the transcript's shape instead: how much of the talking the learner did
 * (a roleplay is meant to be mostly doing, not listening), how many turns they
 * took, and the share of sessions that held enough of their own speech to
 * count as practice at all.
 *
 * ## One control set, on the first card
 *
 * Both cards are views of one response, so they share one saved period/grain
 * (`usage.practiceQuality`) and one language. Two pickers that had to agree
 * would be two chances to disagree; the second card says where its window is
 * set, as the low-rating tags card on Quality & sentiment does.
 *
 * ## Why a language picker on the card
 *
 * Talk share is a character count, and characters per word differ by script —
 * a Devanagari or Tamil word is not a Latin word's length — so a mixed-language
 * median compares unlike things. Highlights has no page-level language filter,
 * so the card carries its own, defaulting to every language with the caveat
 * on its face.
 */
export const PracticeQualitySection = ({ tenantId }: { tenantId?: string }) => {
  const { controlsFor, setRange, setGrain, hydrating } = useChartControls<ChartId>(
    "usage",
    defaultControlsFor(CHARTS),
  );
  const controls = controlsFor("practiceQuality");
  const isAllTime = controls.grain === "allTime";

  const [language, setLanguage] = useState<string>(ALL_LANGUAGES);
  const [expanded, setExpanded] = useState<"talk" | "practice" | null>(null);

  const { data: languages } = useGetScenarioLanguagesQuery({ active: true });
  const languageItems = useMemo(
    () => [
      { id: ALL_LANGUAGES, label: "All languages" },
      ...(languages ?? []).map(l => ({ id: l.value, label: l.label })),
    ],
    [languages],
  );
  const languageName =
    languageItems.find(i => i.id === language)?.label ?? (language || "All languages");

  const args = useMemo(
    () => ({
      range: controls.range,
      bucket: grainAsBucket(controls.grain),
      ...(tenantId ? { tenantId } : {}),
      ...(language ? { language } : {}),
    }),
    [controls.range, controls.grain, tenantId, language],
  );
  // Waiting for hydration stops the cards fetching their default window and
  // then immediately re-fetching the saved one.
  const pq = useGetPracticeQualityQuery(args, { skip: hydrating });
  const data = pq.data;
  const summary = data?.summary;
  const thresholds = data?.practiceThresholds;
  const minN = data?.minSampleSize;
  const inProgress = data?.window.inProgressBucket;

  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const plotted = useMemo(() => plottedPoints(points, inProgress), [points, inProgress]);
  const talkSeries = useMemo(() => buildTalkShareSeries(plotted), [plotted]);
  const turnsSeries = useMemo(() => buildLearnerTurnsSeries(plotted), [plotted]);
  const practiceBars = useMemo(() => buildPracticeShareBars(plotted), [plotted]);

  const talkOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Learner share of talk (%)",
        bottomTitle: bucketTitle(controls.grain),
        colorScale: TALK_SHARE_SCALE,
        domain: PCT_DOMAIN,
        extra: { points: { enabled: true } },
      }),
    [controls.grain],
  );
  const turnsOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Learner turns",
        bottomTitle: bucketTitle(controls.grain),
        colorScale: LEARNER_TURNS_SCALE,
        legend: false,
        height: TURNS_HEIGHT,
        extra: { points: { enabled: true } },
      }),
    [controls.grain],
  );
  const practiceOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Count as practice (%)",
        bottomTitle: bucketTitle(controls.grain),
        colorScale: PRACTICE_SHARE_SCALE,
        domain: PCT_DOMAIN,
      }),
    [controls.grain],
  );

  const loading = hydrating || (pq.isLoading && !data);
  const noSessions = Boolean(summary) && summary?.sessions === 0;
  // A real 0 sessions is "empty"; a non-zero n under the floor is "thin" — so
  // the n only goes to the card when it is above zero.
  const talkN = summary && summary.talkShareSessions > 0 ? summary.talkShareSessions : undefined;
  const sessionsN = summary && summary.sessions > 0 ? summary.sessions : undefined;

  const windowNote = `${RANGE_SHORT[controls.range]}, ${isAllTime ? "whole window" : groupingNote(controls.grain)}`;
  const extra = [windowLabel(data?.window), languageName].join(" · ");
  const talkSource = buildSource({
    derivation:
      "Transcript shape (R7, no judge): learner characters ÷ all characters per countable session, client filler dropped",
    window: windowNote,
    n: summary?.talkShareSessions,
    nUnit: "sessions with speech",
    extra,
    asOf: asOfStamp(data?.computedAt),
  });
  const practiceSource = buildSource({
    derivation:
      "Transcript shape (R7, no judge): learner turns, net minutes and learner characters per countable session",
    window: windowNote,
    n: summary?.sessions,
    nUnit: "sessions",
    extra,
    asOf: asOfStamp(data?.computedAt),
  });

  const accruing = isAllTime ? "" : inProgressCaption(controls.grain, inProgress);
  const floorNote = minN ? ` Periods with fewer than ${minN} sessions are left blank.` : "";

  const talkKpi: KpiTileProps = {
    label: "Median learner talk share",
    value: formatPctValue(summary?.talkShareMedianPct),
    n: talkN,
    nUnit: "sessions with speech",
    minN,
    description:
      summary && summary.talkShareP25Pct !== null && summary.talkShareP75Pct !== null
        ? `Middle half ${summary.talkShareP25Pct}–${summary.talkShareP75Pct}%${
            summary.learnerTurnsMedian !== null
              ? ` · median ${summary.learnerTurnsMedian} learner turns per session`
              : ""
          }.`
        : "Learner characters ÷ all characters, per session.",
  };
  const practiceKpi: KpiTileProps = {
    label: "Sessions that count as practice",
    value: formatPctValue(summary?.practicePct),
    n: sessionsN,
    nUnit: "sessions",
    minN,
    description:
      summary && summary.notPracticeShortTurnsPct !== null && thresholds
        ? `${summary.notPracticeShortTurnsPct}% had fewer than ${thresholds.minLearnerTurns} learner turns.`
        : "Every practice rule met at once.",
  };

  const pickers = (
    <div className="flex flex-wrap items-center gap-2">
      <RangePicker
        id="practice-quality-range"
        value={controls.range}
        onChange={range => setRange("practiceQuality", range)}
      />
      <GroupingPicker
        id="practice-quality-grouping"
        value={controls.grain}
        onChange={grain => setGrain("practiceQuality", grain)}
        options={GROUPINGS}
      />
      <Dropdown
        id="practice-quality-language"
        size="sm"
        type="inline"
        label="Language"
        // Visually hidden, but it names the control for a screen reader.
        titleText="Language"
        hideLabel
        items={languageItems}
        itemToString={(i: (typeof languageItems)[number]) => i?.label ?? ""}
        selectedItem={languageItems.find(i => i.id === language) ?? languageItems[0]}
        onChange={({ selectedItem }: { selectedItem: (typeof languageItems)[number] }) =>
          selectedItem && setLanguage(selectedItem.id)
        }
      />
    </div>
  );

  const table = {
    columns: practiceQualityTableColumns(thresholds),
    rows: practiceQualityTableRows(points, inProgress),
  };
  const exportContext = [
    `Window: ${windowLabel(data?.window)}`,
    `Language: ${languageName}`,
    thresholds ? `Counts as practice: ${practiceThresholdsText(thresholds)}` : "",
    data?.provenance.derivation ?? "",
    data?.provenance.note ?? "",
  ];

  return (
    <>
      <h3 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-typography-500">
        Practice quality — was it practice?
      </h3>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Learner talk share per session"
          caption={`Per session, the learner's share of everything said, in characters (the client's filler lines left out): the median session, with the 25th and 75th percentiles in grey. A roleplay is meant to be mostly doing — a low share means the learner mostly listened. Below it, the median number of learner turns. Characters per word differ by script, so compare within one language using the Language picker.${floorNote} ${boundedDomainNote(PCT_DOMAIN)}${accruing}`}
          source={talkSource}
          takeaway={summary && minN !== undefined ? talkShareTakeaway(summary, minN) : undefined}
          loading={loading}
          error={pq.isError}
          errorSubtitle={ERROR_SUBTITLE}
          onRetry={() => void pq.refetch()}
          n={talkN}
          nUnit="sessions with speech"
          minN={minN}
          empty={!loading && !isAllTime && (noSessions || !hasAnyValue(talkSeries))}
          emptyText={
            noSessions
              ? "No countable sessions in this window"
              : `No period has ${minN ?? "enough"} sessions with speech — try a coarser grouping`
          }
          controls={pickers}
          onExpand={() => setExpanded("talk")}
          kpi={isAllTime ? talkKpi : undefined}
          chartId="AAQ-208"
        >
          <ScrollableChart data={talkSeries}>
            <LineChart data={talkSeries} options={talkOpts} />
          </ScrollableChart>
          <p className="mt-3 text-xs font-medium text-typography-600">
            Median learner turns per session
          </p>
          <ScrollableChart data={turnsSeries}>
            <LineChart data={turnsSeries} options={turnsOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Sessions that count as practice"
          caption={`Share of countable sessions with ${
            thresholds ? practiceThresholdsText(thresholds) : "enough of the learner's own speech"
          } — all at once. The 5-minute count above measures length alone; this asks whether the learner did the work. Reads the period, grouping and language set on the talk-share card.${floorNote} ${boundedDomainNote(PCT_DOMAIN)}${accruing}`}
          source={practiceSource}
          takeaway={
            summary && thresholds && minN !== undefined
              ? practiceShareTakeaway(summary, thresholds, minN)
              : undefined
          }
          loading={loading}
          error={pq.isError}
          errorSubtitle={ERROR_SUBTITLE}
          onRetry={() => void pq.refetch()}
          n={sessionsN}
          nUnit="sessions"
          minN={minN}
          empty={!loading && !isAllTime && (noSessions || !hasAnyValue(practiceBars))}
          emptyText={
            noSessions
              ? "No countable sessions in this window"
              : `No period has ${minN ?? "enough"} sessions — try a coarser grouping`
          }
          onExpand={() => setExpanded("practice")}
          kpi={isAllTime ? practiceKpi : undefined}
          chartId="AAQ-209"
        >
          <ScrollableChart data={practiceBars}>
            <SimpleBarChart data={practiceBars} options={practiceOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      <ChartDetailModal
        open={expanded === "talk"}
        onClose={() => setExpanded(null)}
        title="Learner talk share per session"
        caption="Median talk share with its 25th–75th percentiles, and median learner turns, per period. Blank cells are periods below the sample floor; the current period is flagged."
        source={talkSource}
        render={({ height }) => <LineChart data={talkSeries} options={{ ...talkOpts, height }} />}
        table={table}
        exportContext={exportContext}
        exportFilename="learner-talk-share"
      />

      <ChartDetailModal
        open={expanded === "practice"}
        onClose={() => setExpanded(null)}
        title="Sessions that count as practice"
        caption="Share of sessions meeting every practice rule, per period, beside the talk-share figures from the same sessions."
        source={practiceSource}
        render={({ height }) => (
          <SimpleBarChart data={practiceBars} options={{ ...practiceOpts, height }} />
        )}
        table={table}
        exportContext={exportContext}
        exportFilename="sessions-that-count-as-practice"
      />
    </>
  );
};
