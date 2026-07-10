import { FC, ReactNode, useMemo, useState } from "react";

import { LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
import { Link } from "react-router-dom";

import "@carbon/charts/styles.css";
import "../analytics-carbon.scss";

import { Button, CarbonDropdown as Dropdown, Tile } from "@ally-ui-mono/ui-shared";
import { useGetLanguageQualityQuery, useSetLanguageReferenceMutation } from "@api";
import { ROUTES } from "@constants";
import { AnalyticsRange, LanguageRateByExperiment } from "@types";

import { ChartCard, PALETTE, barOpts, lineOpts, stackedBarOpts } from "../chartKit";

/**
 * Language-capability evaluation tab (PRD FR6-FR14; see
 * language-eval-judge-schema.md). Categorized, severity-weighted error rates
 * per 100 turns — never a scalar quality score. Aggregated from the same
 * per-session judgment rows the Roleplay Session Logs detail shows raw, so
 * every number here can be followed into concrete sessions.
 *
 * Masking principle (FR6): unmeasured layers/metrics are shown as UNMEASURED,
 * never hidden and never rendered as a healthy 0.
 */

const SEVERITY_COLOR: Record<string, string> = {
  minor: PALETTE.gold,
  major: PALETTE.orange,
  critical: PALETTE.red,
};

const SEVERITY_WEIGHT: Record<string, number> = {
  minor: 1,
  major: 5,
  critical: 10,
};

const DIMENSION_LABEL: Record<string, string> = {
  understanding: "Understanding",
  adequacy: "Adequacy",
  fluency: "Fluency",
  coherence: "Coherence",
  register: "Register",
  dialect_lexicon: "Dialect (lexicon)",
  colloquialness: "Colloquialness",
  persona_social: "Persona / social",
  codeswitch: "Code-switching",
};

const LAYER_LABEL: Record<string, string> = {
  comprehension: "Comprehension",
  content: "Content",
  appropriateness: "Appropriateness",
};

const BASIS_LABEL: Record<string, string> = {
  input_clean: "Input clean (generation)",
  input_garbled: "Input garbled (conditioned)",
  persona_specified: "Instructed but ignored (model)",
  persona_unspecified: "Never instructed (config gap)",
  pattern_systemic: "Systemic pattern",
};

const SEVERITY_TAG_CLASS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-900",
  major: "bg-orange-100 text-orange-900",
  critical: "bg-red-100 text-red-900",
};

const EXPERIMENT_DIMS = [
  { id: "scenarioVersion", label: "Scenario version" },
  { id: "promptVersion", label: "Prompt version" },
  { id: "model", label: "LLM model" },
] as const;

const SubHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <h3 className="text-base font-medium text-typography-900 mt-6 mb-3">{children}</h3>
);

const UnmeasuredTag: FC<{ children?: ReactNode }> = ({ children }) => (
  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
    {children ?? "not yet measured"}
  </span>
);

interface Props {
  range: AnalyticsRange;
  language: string;
  /** Drives the page-level language picker (drill-in from an overview row). */
  onSelectLanguage?: (language: string) => void;
}

export const LanguageQualityTab: FC<Props> = ({ range, language, onSelectLanguage }) => {
  const { data, isFetching, isError, refetch } = useGetLanguageQualityQuery({
    range,
    language: language || undefined,
  });
  const [experimentDim, setExperimentDim] = useState<(typeof EXPERIMENT_DIMS)[number]>(
    EXPERIMENT_DIMS[0],
  );
  const [setReference, { isLoading: pinning }] = useSetLanguageReferenceMutation();

  // FR13: pin the current view (its language slice) as THE reference all
  // deltas are read against.
  const handlePinReference = async () => {
    try {
      await setReference({
        filters: language ? { language } : {},
        name: language ? `reference — ${language}` : "reference — all sessions",
      }).unwrap();
      refetch();
    } catch {
      /* button re-enables; error surfaces on next fetch */
    }
  };

  const deltaFor = (dimension: string): number | null => {
    const d = (data?.deltaByDimension ?? []).find(x => x.dimension === dimension);
    return d ? d.delta : null;
  };

  // Per-layer rate = Σ of its dimensions' rates (each already correctly
  // denominated — comprehension/adequacy on clean-input turns only).
  const layerRates = useMemo(() => {
    const rates: Record<string, number> = {
      comprehension: 0,
      content: 0,
      appropriateness: 0,
    };
    for (const d of data?.errorRateByDimension ?? []) {
      rates[d.layer] = (rates[d.layer] ?? 0) + d.weightedRatePer100;
    }
    return {
      comprehension: Number(rates.comprehension.toFixed(2)),
      content: Number(rates.content.toFixed(2)),
      appropriateness: Number(rates.appropriateness.toFixed(2)),
    };
  }, [data]);

  const adequacyRate = useMemo(
    () =>
      (data?.errorRateByDimension ?? []).find(d => d.dimension === "adequacy")
        ?.weightedRatePer100 ?? 0,
    [data],
  );
  const dialectLexiconRate = useMemo(
    () =>
      (data?.errorRateByDimension ?? []).find(d => d.dimension === "dialect_lexicon")
        ?.weightedRatePer100 ?? 0,
    [data],
  );

  const kpis = useMemo(() => {
    const worst = (data?.rateByLanguage ?? [])[0];
    return [
      {
        label: "Weighted error rate / 100 turns",
        value: data ? `${data.totalWeightedRatePer100}` : "—",
      },
      { label: "Sessions judged", value: `${data?.sessionsJudged ?? 0}` },
      { label: "Turns judged", value: `${data?.turnsJudged ?? 0}` },
      {
        label: "Worst language",
        value: worst ? `${worst.language} · ${worst.weightedRatePer100}` : "—",
      },
    ];
  }, [data]);

  const dimensionBars = useMemo(() => {
    const rows: { group: string; key: string; value: number }[] = [];
    for (const d of data?.errorRateByDimension ?? []) {
      if (d.nTurns === 0) continue;
      const label = DIMENSION_LABEL[d.dimension] ?? d.dimension;
      for (const severity of ["minor", "major", "critical"] as const) {
        const count =
          severity === "minor"
            ? d.minorCount
            : severity === "major"
              ? d.majorCount
              : d.criticalCount;
        rows.push({
          group: severity,
          key: label,
          value: Number((((count * SEVERITY_WEIGHT[severity]) / d.nTurns) * 100).toFixed(2)),
        });
      }
    }
    return rows;
  }, [data]);

  const trendLines = useMemo(
    () =>
      (data?.layerTrend ?? []).map(p => ({
        group: LAYER_LABEL[p.layer] ?? p.layer,
        key: p.bucket,
        value: p.weightedRatePer100,
      })),
    [data],
  );

  const experimentRows: LanguageRateByExperiment[] = useMemo(() => {
    if (!data) return [];
    if (experimentDim.id === "promptVersion") return data.rateByPromptVersion;
    if (experimentDim.id === "model") return data.rateByModel;
    return data.rateByScenarioVersion;
  }, [data, experimentDim]);

  const experimentBars = useMemo(
    () =>
      experimentRows.map(r => ({
        group: r.value === null || r.value === "unknown" ? "unknown" : r.value,
        value: r.weightedRatePer100,
      })),
    [experimentRows],
  );

  const languageBars = useMemo(
    () =>
      (data?.rateByLanguage ?? []).map(r => ({
        group: r.language,
        value: r.weightedRatePer100,
      })),
    [data],
  );

  const categoryBars = useMemo(
    () =>
      (data?.categoryBreakdown ?? []).slice(0, 12).map(r => ({
        group: r.category,
        value: r.weighted,
      })),
    [data],
  );

  const basisBars = useMemo(
    () =>
      (data?.isolationBasisBreakdown ?? []).map(r => ({
        group: BASIS_LABEL[r.basis] ?? r.basis,
        value: r.count,
      })),
    [data],
  );

  const hasAnyError = (data?.categoryBreakdown?.length ?? 0) > 0;
  const scriptFidelity = data?.objectiveMetrics?.scriptFidelityPct ?? null;
  const roundTripWer = data?.objectiveMetrics?.roundTripWerPct ?? null;

  // Diagnostic ladder (FR6): bottom-up. The one objective gate is round-trip
  // WER; while unmeasured it masks the human-audio dimensions above it.
  const ladder: Array<{
    step: string;
    layer: string;
    measuredBy: string;
    value: ReactNode;
    masked?: boolean;
  }> = [
    {
      step: "4",
      layer: "Speech realization — naturalness · prosody · affect · accent",
      measuredBy: "Human listening (session recordings)",
      // Masked while the gate is unmeasured or failing (>30%); with a passing
      // gate these dims are judgeable — by ear, since the rater track is
      // descoped to manual listening.
      value:
        roundTripWer === null ? (
          <UnmeasuredTag>
            masked — intelligibility gate unmeasured · manual listening only
          </UnmeasuredTag>
        ) : roundTripWer > 30 ? (
          <UnmeasuredTag>
            masked — gate FAILING ({roundTripWer}% &gt; 30%) · fix intelligibility first
          </UnmeasuredTag>
        ) : (
          <UnmeasuredTag>gate passing — manual listening only</UnmeasuredTag>
        ),
      masked: roundTripWer === null || roundTripWer > 30,
    },
    {
      step: "GATE",
      layer: "Intelligibility (round-trip WER)",
      measuredBy: "Objective — isolates TTS pronunciation",
      value:
        roundTripWer === null ? (
          <UnmeasuredTag>not yet measured (Phase 2)</UnmeasuredTag>
        ) : (
          `${roundTripWer}%`
        ),
    },
    {
      step: "3",
      layer: "Appropriateness — register · dialect · colloquialness · persona · code-switch",
      measuredBy: "LLM judge",
      value: `${layerRates.appropriateness} weighted errors / 100 turns`,
    },
    {
      step: "2",
      layer: "Content — adequacy · fluency · coherence",
      measuredBy: "LLM judge + script fidelity (objective)",
      value: `${layerRates.content} weighted errors / 100 turns`,
    },
    {
      step: "1",
      layer: "Comprehension — understanding",
      measuredBy: "LLM judge, conditioned on clean STT input",
      value: `${layerRates.comprehension} weighted errors / 100 turns`,
    },
  ];

  // ---- ALL-LANGUAGES OVERVIEW (the tab's default view) ---------------------
  // Aggregate per-language performance only. Choosing a language in the
  // page-level picker opens that language's full diagnostic view; per-session
  // evidence lives in Roleplay Session Logs.
  if (!language) {
    const overview = data?.languageOverview ?? [];
    const fidelityClass = (v: number | null) =>
      v === null
        ? "text-gray-500"
        : v < 85
          ? "text-red-700 font-medium"
          : v < 95
            ? "text-orange-700 font-medium"
            : "text-typography-900";
    const werClass = (v: number | null) =>
      v === null
        ? "text-gray-500"
        : v > 30
          ? "text-red-700 font-medium"
          : v > 20
            ? "text-orange-700 font-medium"
            : "text-typography-900";
    return (
      <div className="flex flex-col">
        <p className="text-xs text-typography-500 mt-2">
          Judge: {data?.judgeModel ?? "—"} · rubric {data?.judgePromptVersion ?? "—"}. How each
          language is performing — pick a language above for its full diagnostic view (ladder,
          dimensions, trends, experiments). Categorized weighted errors only — no 1–5 scores.
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {kpis.map(kpi => (
            <Tile key={kpi.label} className="analytics-kpi">
              <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
              <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
            </Tile>
          ))}
        </div>

        {/* Per-language performance table */}
        <SubHeading>Language performance</SubHeading>
        {!overview.length ? (
          <p className="text-sm text-typography-700 mb-8">No judged sessions in this window.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-light bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-typography-700 border-b border-border-light">
                  <th className="px-3 py-2">Language</th>
                  <th className="px-3 py-2">Sessions</th>
                  <th className="px-3 py-2">Turns</th>
                  <th className="px-3 py-2">Weighted errors / 100 turns</th>
                  <th className="px-3 py-2">Worst dimension</th>
                  <th className="px-3 py-2">Script fidelity</th>
                  <th className="px-3 py-2">Round-trip WER</th>
                  <th className="px-3 py-2">Garbled input</th>
                </tr>
              </thead>
              <tbody>
                {overview.map(row => (
                  <tr
                    key={row.language}
                    className={`border-b border-border-light last:border-b-0 ${
                      onSelectLanguage ? "cursor-pointer hover:bg-neutral-50" : ""
                    }`}
                    onClick={() => onSelectLanguage?.(row.language)}
                    title={onSelectLanguage ? `View ${row.language} diagnostics` : undefined}
                  >
                    <td className="px-3 py-2 font-medium text-primary-600 underline">
                      {row.language}
                    </td>
                    <td className="px-3 py-2">{row.sessionsJudged}</td>
                    <td className="px-3 py-2">{row.nTurns}</td>
                    <td className="px-3 py-2 font-medium text-typography-900">
                      {row.weightedRatePer100}
                    </td>
                    <td className="px-3 py-2">
                      {row.worstDimension ? (
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                          {DIMENSION_LABEL[row.worstDimension] ?? row.worstDimension} ·{" "}
                          {row.worstDimensionRatePer100}
                        </span>
                      ) : (
                        <span className="text-xs text-typography-500">no errors</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${fidelityClass(row.scriptFidelityPct)}`}>
                      {row.scriptFidelityPct === null ? "—" : `${row.scriptFidelityPct}%`}
                    </td>
                    <td className={`px-3 py-2 ${werClass(row.roundTripWerPct)}`}>
                      {row.roundTripWerPct === null ? "—" : `${row.roundTripWerPct}%`}
                    </td>
                    <td className="px-3 py-2">{row.garbledInputPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comparison chart */}
        <SubHeading>Weighted error rate by language</SubHeading>
        <div className="grid grid-cols-1 gap-6 mb-8">
          <ChartCard
            bare
            title="Weighted error rate by language"
            caption="Slice per language — never a single global score. Pick a language above to drill in."
            loading={isFetching}
            error={isError}
            onRetry={refetch}
            empty={!languageBars.length}
          >
            <SimpleBarChart
              data={languageBars}
              options={barOpts({ leftTitle: "Weighted errors / 100 turns" })}
            />
          </ChartCard>
        </div>
      </div>
    );
  }

  // ---- SINGLE-LANGUAGE DIAGNOSTIC VIEW -------------------------------------
  return (
    <div className="flex flex-col">
      <p className="text-xs text-typography-500 mt-2">
        Judge: {data?.judgeModel ?? "—"} · rubric {data?.judgePromptVersion ?? "—"} ·{" "}
        {data?.turnsGarbled ?? 0} garbled-input turns excluded from understanding/adequacy rates.
        Categorized weighted errors only — no 1–5 scores.
      </p>

      {/* FR13: pinned reference — deltas below are read against it */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {data?.reference && (
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-900">
            Reference: {data.reference.name}
          </span>
        )}
        <Button kind="tertiary" size="sm" disabled={pinning} onClick={handlePinReference}>
          Pin current view as reference
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {kpis.map(kpi => (
          <Tile key={kpi.label} className="analytics-kpi">
            <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
            <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
          </Tile>
        ))}
      </div>

      {/* FR6 — DIAGNOSTIC LADDER */}
      <SubHeading>Diagnostic ladder (read bottom-up; masked ≠ fine)</SubHeading>
      <div className="rounded-lg border border-border-light bg-white divide-y divide-border-light">
        {ladder.map(row => (
          <div
            key={row.step + row.layer}
            className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
              row.masked ? "opacity-60" : ""
            }`}
          >
            <span
              className={`w-12 shrink-0 text-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                row.step === "GATE"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-neutral-100 text-typography-700"
              }`}
            >
              {row.step}
            </span>
            <div className="flex-1 min-w-56">
              <p className="text-sm text-typography-900">{row.layer}</p>
              <p className="text-xs text-typography-500">{row.measuredBy}</p>
            </div>
            <div className="text-sm text-typography-900">{row.value}</div>
          </div>
        ))}
      </div>

      {/* FR7 — OBJECTIVE METRICS (carry attribution in the value itself) */}
      <SubHeading>Objective metrics</SubHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tile className="analytics-kpi">
          <p className="text-sm text-typography-600 mb-1">Round-trip WER</p>
          <p className="text-2xl font-medium text-typography-900">
            {roundTripWer === null ? <UnmeasuredTag /> : `${roundTripWer}%`}
          </p>
          <p className="text-xs text-typography-500 mt-1">
            WER(T, ASR(TTS(T))) — isolates TTS pronunciation. ≤20 good · 20–30 warn · &gt;30
            critical. Ships with Phase 2.
          </p>
        </Tile>
        <Tile className="analytics-kpi">
          <p className="text-sm text-typography-600 mb-1">Script fidelity</p>
          <p className="text-2xl font-medium text-typography-900">
            {scriptFidelity === null ? <UnmeasuredTag /> : `${scriptFidelity}%`}
          </p>
          <p className="text-xs text-typography-500 mt-1">
            % of turns rendered cleanly in the target script — isolates rendering/encoding, not the
            model. ≥95 good · 85–95 warn · &lt;85 critical.
          </p>
        </Tile>
      </div>

      {/* FR8 — ENTANGLEMENT BROKEN */}
      <SubHeading>Entanglement broken</SubHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Tile className="analytics-kpi">
          <p className="text-sm text-typography-600 mb-1">Adequacy — conditioned</p>
          <p className="text-2xl font-medium text-typography-900">{adequacyRate}</p>
          <p className="text-xs text-typography-500 mt-1">
            Weighted errors / 100 clean-input turns. {data?.turnsGarbled ?? 0} garbled-input turns
            excluded, so this number is attributable to generation — mishearing cannot be the cause.
          </p>
        </Tile>
        <Tile className="analytics-kpi">
          <p className="text-sm text-typography-600 mb-1">Dialect — split</p>
          <p className="text-2xl font-medium text-typography-900">
            {dialectLexiconRate}
            <span className="text-sm font-normal text-typography-500"> lexicon (text)</span>
            <span className="mx-2 text-sm font-normal text-typography-500">·</span>
            <UnmeasuredTag>accent (audio) — manual listening</UnmeasuredTag>
          </p>
          <p className="text-xs text-typography-500 mt-1">
            Lexicon moves under LLM/prompt experiments; accent moves under TTS-voice experiments.
            Tracking them separately keeps the attribution clean.
          </p>
        </Tile>
      </div>

      {/* FR9 — BY DIMENSION */}
      <SubHeading>Where the errors are (by dimension)</SubHeading>
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          bare
          title="Weighted error rate by dimension"
          caption="Σ(errors × severity weight 1/5/10) per 100 turns, stacked by severity. Garbled-input turns are excluded from Understanding/Adequacy."
          loading={isFetching}
          error={isError}
          onRetry={refetch}
          empty={!hasAnyError}
        >
          <StackedBarChart
            data={dimensionBars}
            options={stackedBarOpts({
              leftTitle: "Weighted errors / 100 turns",
              colorScale: SEVERITY_COLOR,
            })}
          />
        </ChartCard>
        {/* FR16: improvement / regression / stale vs the pinned reference */}
        {data?.reference && (data?.deltaByDimension?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs -mt-2">
            <span className="text-typography-500">Δ vs reference:</span>
            {(data?.errorRateByDimension ?? []).map(d => {
              const delta = deltaFor(d.dimension);
              if (delta === null) return null;
              const cls =
                delta > 0
                  ? "bg-red-100 text-red-900"
                  : delta < 0
                    ? "bg-green-100 text-green-900"
                    : "bg-neutral-100 text-typography-700";
              const sign = delta > 0 ? "+" : "";
              return (
                <span
                  key={d.dimension}
                  className={`rounded px-2 py-0.5 font-medium ${cls}`}
                  title="current − reference, weighted errors / 100 turns; valid only within one judge version"
                >
                  {DIMENSION_LABEL[d.dimension] ?? d.dimension}: {sign}
                  {delta}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* FR10 — PER-LAYER TREND (isolation check) */}
      <SubHeading>Per-layer trend (isolation check)</SubHeading>
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          bare
          title="Weighted error rate per layer, weekly"
          caption="A one-variable experiment should move only its layer; movement across layers flags a leak to investigate."
          loading={isFetching}
          error={isError}
          empty={!trendLines.some(p => p.value > 0)}
        >
          <LineChart
            data={trendLines}
            options={lineOpts({ leftTitle: "Weighted errors / 100 turns" })}
          />
        </ChartCard>
      </div>

      {/* EXPERIMENT SLICING (FR13-lite; pinned-reference deltas ship with Phase 3) */}
      <div className="flex flex-wrap items-center justify-between mt-6 mb-3">
        <h3 className="text-base font-medium text-typography-900">By experiment</h3>
        <div className="w-56">
          <Dropdown
            id="language-experiment-dim"
            size="sm"
            titleText="Experiment dimension"
            hideLabel
            label="Experiment dimension"
            items={[...EXPERIMENT_DIMS]}
            selectedItem={experimentDim}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) setExperimentDim(selectedItem);
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          bare
          title={`Weighted error rate by ${experimentDim.label.toLowerCase()}`}
          caption="Read deltas between configurations, not levels — and only within one judge version. 'unknown' = sessions from before config capture. Pinned-reference deltas ship with Phase 3."
          loading={isFetching}
          error={isError}
          empty={!experimentBars.length}
        >
          <SimpleBarChart
            data={experimentBars}
            options={barOpts({ leftTitle: "Weighted errors / 100 turns" })}
          />
        </ChartCard>
        {/* FR18: changed_from_prev — which config element each scenario
            version changed vs its parent (the one-variable attribution). */}
        {experimentDim.id === "scenarioVersion" &&
          experimentRows.some(r => r.changedFromPrev?.length) && (
            <div className="rounded-lg border border-border-light bg-white p-3 -mt-2 text-xs">
              <p className="text-typography-500 mb-2">
                Changed vs parent version (&gt;1 element = not a valid one-variable experiment):
              </p>
              <div className="flex flex-col gap-1">
                {experimentRows.map(r =>
                  r.changedFromPrev?.length ? (
                    <div key={r.value ?? "unknown"} className="flex flex-wrap gap-1 items-center">
                      <span className="font-mono text-typography-700">
                        {(r.value ?? "unknown").slice(0, 8)}…
                      </span>
                      {r.changedFromPrev.map(el => (
                        <span
                          key={el}
                          className={`rounded px-1.5 py-0.5 ${
                            (r.changedFromPrev?.length ?? 0) > 1
                              ? "bg-orange-100 text-orange-900"
                              : "bg-neutral-100 text-typography-700"
                          }`}
                        >
                          {el}
                        </span>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}
      </div>

      {/* CATEGORIES + ATTRIBUTION */}
      <SubHeading>What kind, and whose fault</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          bare
          title="Top error categories"
          caption="Weighted counts. Categories point at fixed targets; scores don't."
          loading={isFetching}
          error={isError}
          empty={!categoryBars.length}
        >
          <SimpleBarChart data={categoryBars} options={barOpts({ leftTitle: "Weighted count" })} />
        </ChartCard>
        <ChartCard
          bare
          title="Attribution basis (prompt vs model)"
          caption="'Never instructed' = cheap config fix (populate language style fields); 'instructed but ignored' = model limitation."
          loading={isFetching}
          error={isError}
          empty={!basisBars.length}
        >
          <SimpleBarChart data={basisBars} options={barOpts({ leftTitle: "Annotations" })} />
        </ChartCard>
      </div>

      {/* FR12 — ERROR LOG */}
      <SubHeading>Recent errors (evidence)</SubHeading>
      {!data?.errorLog?.length ? (
        <p className="text-sm text-typography-700 mb-8">No error annotations in this window.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-light bg-white mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-typography-700 border-b border-border-light">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Language</th>
                <th className="px-3 py-2">Dimension</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Basis</th>
                <th className="px-3 py-2">Evidence</th>
                <th className="px-3 py-2">Session</th>
              </tr>
            </thead>
            <tbody>
              {data.errorLog.map((row, i) => (
                <tr
                  key={`${row.scenarioSessionId}-${row.turnIndex}-${i}`}
                  className="border-b border-border-light last:border-b-0 align-top"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-typography-700">
                    {row.occurredAt ? new Date(row.occurredAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">{row.language ?? "—"}</td>
                  <td className="px-3 py-2">{DIMENSION_LABEL[row.dimension] ?? row.dimension}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_TAG_CLASS[row.severity] ?? "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-typography-700">
                    {row.isolationBasis ?? "—"}
                  </td>
                  <td className="px-3 py-2 max-w-md">
                    <span className="whitespace-pre-wrap">
                      {row.evidenceQuote ?? row.aiText ?? "—"}
                    </span>
                    {row.reasoning && (
                      <p className="text-xs text-typography-500 mt-1">{row.reasoning}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      className="text-primary-600 underline"
                      to={ROUTES.ROLEPLAY_SESSION_LOG_DETAIL(row.scenarioSessionId)}
                    >
                      turn {row.turnIndex} ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
