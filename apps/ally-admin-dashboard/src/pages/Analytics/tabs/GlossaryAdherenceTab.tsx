import { FC, useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";
import { toast } from "sonner";

import "@carbon/charts/styles.css";
import "../analytics-carbon.scss";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@ally-ui-mono/ui-shared";
import {
  useBackfillGlossaryAdherenceMutation,
  useGetGlossaryAdherenceOverviewQuery,
  useGetGlossaryAdherenceQuery,
  useGetScenarioLanguagesQuery,
} from "@api";

import { AnalyticsTabFilters } from "../analyticsFilters";
import { ChartCard, hBarOpts } from "../chartKit";
import { stableScale } from "../chartScales";

/**
 * Deterministic glossary avoid-list adherence — a regex scan of agent
 * transcripts against the glossary's own `say "X" (avoid: "Y")` pairs, no
 * LLM. Complements the Language tab's judge-based error rates with a
 * literal rule-following signal the judge can't give: did the agent use
 * the words the glossary told it not to.
 *
 * Populated only by an explicit backfill scan (or, per-session, the
 * read-only preview on the Roleplay Session Log detail page) — a language
 * absent here has simply never been scanned, not "clean". The overview
 * table makes that distinction explicit rather than rendering an absent
 * language as a zero row.
 */
export const GlossaryAdherenceTab: FC<AnalyticsTabFilters> = ({ language, onSelectLanguage }) => {
  const overview = useGetGlossaryAdherenceOverviewQuery();
  const { data: scenarioLanguages } = useGetScenarioLanguagesQuery({ active: true });

  const languageId = useMemo(() => {
    if (!language) return undefined;
    // GET /v1/learn/scenario-languages returns the numeric id as
    // `language_id` (snake_case), not `id` — ScenarioLanguage carries both
    // as optional because other endpoints use `id`.
    const match = scenarioLanguages?.find(l => l.value === language);
    return match?.id ?? match?.language_id;
  }, [language, scenarioLanguages]);

  const [sinceDays, setSinceDays] = useState(30);
  const [backfill, { isLoading: rescanning }] = useBackfillGlossaryAdherenceMutation();

  const handleRescan = async () => {
    if (!languageId) return;
    try {
      const result = await backfill({ languageId, sinceDays }).unwrap();
      toast.success(
        `Scanned ${result.scanned} session(s): ${result.reported} reported, ${result.skipped} skipped`,
      );
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Rescan failed");
    }
  };

  // ---- ALL-LANGUAGES OVERVIEW (the tab's default view) ---------------------
  if (!language) {
    const rows = overview.data ?? [];
    const totalSessions = rows.reduce((n, r) => n + r.sessionCount, 0);
    const totalViolations = rows.reduce((n, r) => n + r.totalViolations, 0);
    const totalClean = rows.reduce((n, r) => n + r.cleanSessions, 0);
    const kpis = [
      { label: "Languages scanned", value: `${rows.length}` },
      { label: "Sessions scanned", value: `${totalSessions}` },
      { label: "Total violations", value: `${totalViolations}` },
      {
        label: "Overall avg / session",
        value: totalSessions ? (totalViolations / totalSessions).toFixed(2) : "—",
      },
      { label: "Clean sessions", value: `${totalClean} / ${totalSessions}` },
    ];
    const bars = rows.map(r => ({ group: r.languageLabel, value: r.totalViolations }));

    return (
      <div className="flex flex-col">
        <p className="text-xs text-typography-500 mt-2">
          Deterministic avoid-list scan of agent transcripts — no LLM, no hand labels. Pick a
          language above for its violated terms and to trigger a rescan. This tab covers all
          sessions ever scanned; there is no time-range picker because a scan is triggered on-demand
          per language, not on a rolling window.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          {kpis.map(kpi => (
            <Tile key={kpi.label} className="analytics-kpi">
              <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
              <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
            </Tile>
          ))}
        </div>

        <h3 className="text-base font-medium text-typography-900 mt-6 mb-3">
          Adherence by language
        </h3>
        {overview.isFetching ? (
          <p className="text-sm text-typography-700 mb-8">Loading…</p>
        ) : overview.isError ? (
          <p className="text-sm text-destructive-500 mb-8">Failed to load glossary adherence.</p>
        ) : !rows.length ? (
          <p className="text-sm text-typography-700 mb-8">
            No language has been scanned yet. Pick a language above and rescan to populate this
            dashboard.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-light bg-white">
            <Table className="w-full text-sm">
              <TableHead>
                <TableRow className="text-left text-xs text-typography-700 border-b border-border-light">
                  <TableHeader className="px-3 py-2">Language</TableHeader>
                  <TableHeader className="px-3 py-2">Sessions scanned</TableHeader>
                  <TableHeader className="px-3 py-2">Violations</TableHeader>
                  <TableHeader className="px-3 py-2">Avg / session</TableHeader>
                  <TableHeader className="px-3 py-2">Clean sessions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={row.languageId}
                    className="border-b border-border-light last:border-0 cursor-pointer hover:bg-neutral-50"
                    onClick={() => onSelectLanguage(row.languageValue)}
                    title={`View ${row.languageLabel} violated terms`}
                  >
                    <TableCell className="px-3 py-2 font-medium text-primary-600 underline">
                      {row.languageLabel}
                    </TableCell>
                    <TableCell className="px-3 py-2">{row.sessionCount}</TableCell>
                    <TableCell className="px-3 py-2 font-medium text-typography-900">
                      {row.totalViolations}
                    </TableCell>
                    <TableCell className="px-3 py-2">{row.avgViolationsPerSession}</TableCell>
                    <TableCell className="px-3 py-2">
                      {row.cleanSessions} / {row.sessionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8 mt-6">
          <ChartCard
            bare
            title="Total violations by language"
            caption="Sum of avoid-list violations across every scanned session. Not comparable across languages with very different session counts — check the table above for the rate."
            loading={overview.isFetching}
            error={overview.isError}
            onRetry={overview.refetch}
            empty={!bars.length}
          >
            <SimpleBarChart
              data={bars}
              options={hBarOpts({
                bottomTitle: "Violations",
                colorScale: stableScale(bars.map(b => b.group)),
              })}
            />
          </ChartCard>
        </div>
      </div>
    );
  }

  // ---- SINGLE-LANGUAGE DRILL-IN ---------------------------------------------
  return (
    <SingleLanguageView
      language={language}
      languageId={languageId}
      sinceDays={sinceDays}
      onSinceDaysChange={setSinceDays}
      onRescan={handleRescan}
      rescanning={rescanning}
    />
  );
};

const SingleLanguageView: FC<{
  language: string;
  languageId: number | undefined;
  sinceDays: number;
  onSinceDaysChange: (n: number) => void;
  onRescan: () => void;
  rescanning: boolean;
}> = ({ language, languageId, sinceDays, onSinceDaysChange, onRescan, rescanning }) => {
  const { data, isFetching, isError, refetch } = useGetGlossaryAdherenceQuery(languageId ?? -1, {
    skip: languageId === undefined,
  });

  if (languageId === undefined) {
    return (
      <p className="text-sm text-typography-700 mt-4">
        Resolving {language}… if this persists, the language may not be active.
      </p>
    );
  }

  const kpis = [
    { label: "Sessions scanned", value: `${data?.sessionCount ?? 0}` },
    { label: "Total violations", value: `${data?.totalViolations ?? 0}` },
    { label: "Avg / session", value: `${data?.avgViolationsPerSession ?? 0}` },
    {
      label: "Clean sessions",
      value: data ? `${data.cleanSessions} / ${data.sessionCount}` : "0 / 0",
    },
  ];
  const bars = (data?.topTerms ?? []).map(t => ({ group: t.term, value: t.count }));
  const neverScanned = (data?.sessionCount ?? 0) === 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
        <p className="text-xs text-typography-500">
          Deterministic avoid-list scan of this language's agent transcripts. Rescan pulls in any
          ended sessions from the last N days not yet scanned.
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-typography-700" htmlFor="glossary-rescan-days">
            Last
          </label>
          <input
            id="glossary-rescan-days"
            type="number"
            min={1}
            max={365}
            value={sinceDays}
            onChange={e => onSinceDaysChange(Number(e.target.value) || 30)}
            className="w-16 rounded border border-border-light px-2 py-1 text-sm"
          />
          <span className="text-xs text-typography-700">days</span>
          <Button kind="tertiary" size="sm" disabled={rescanning} onClick={onRescan}>
            {rescanning ? "Rescanning…" : "Rescan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {kpis.map(kpi => (
          <Tile key={kpi.label} className="analytics-kpi">
            <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
            <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
          </Tile>
        ))}
      </div>

      {neverScanned && !isFetching && (
        <p className="text-sm text-typography-700 mt-4">
          Not scanned yet — click Rescan to run the avoid-list check against this language's recent
          sessions.
        </p>
      )}

      <h3 className="text-base font-medium text-typography-900 mt-6 mb-3">Most violated terms</h3>
      {!data?.topTerms.length ? (
        <p className="text-sm text-typography-700 mb-8">
          {neverScanned ? "—" : "No avoid-list violations found."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border-light bg-white mb-6">
            <Table className="w-full text-sm">
              <TableHead>
                <TableRow className="text-left text-xs text-typography-700 border-b border-border-light">
                  <TableHeader className="px-3 py-2">Term</TableHeader>
                  <TableHeader className="px-3 py-2">Section</TableHeader>
                  <TableHeader className="px-3 py-2">Count</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topTerms.map(t => (
                  <TableRow
                    key={`${t.sectionCode}-${t.term}`}
                    className="border-b border-border-light last:border-0"
                  >
                    <TableCell className="px-3 py-2 font-medium text-typography-900">
                      “{t.term}”
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
                        {t.sectionCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2">{t.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <ChartCard
              bare
              title="Top violated terms"
              caption="Avoid-listed words the agent used anyway, summed across every scanned session for this language."
              loading={isFetching}
              error={isError}
              onRetry={refetch}
              empty={!bars.length}
            >
              <SimpleBarChart
                data={bars}
                options={hBarOpts({
                  bottomTitle: "Occurrences",
                  colorScale: stableScale(bars.map(b => b.group)),
                })}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
