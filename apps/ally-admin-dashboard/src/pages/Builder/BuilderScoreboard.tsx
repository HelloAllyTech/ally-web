import React, { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";
import { useNavigate } from "react-router-dom";

import {
  Button,
  CarbonDropdown as Dropdown,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@ally-ui-mono/ui-shared";
import { useGetBuilderScoreboardQuery } from "@api";
import { en, ROUTES } from "@constants";

import { BUILDER_OUTCOME_TAG_TYPE } from "./builderMotion";
import {
  buildsStartedSeries,
  formatHours,
  formatScoreboardCost,
  medianCostSeries,
  medianFixRunsSeries,
  mergeRateSeries,
  ScoreboardSortDirection,
  ScoreboardSortKey,
  sortScoreboardBuilds,
} from "./scoreboardChart";
import {
  ChartCard,
  ScrollableChart,
  buildSource,
  KpiTile,
  lineOpts,
  single,
} from "../Analytics/chartKit";

const WINDOW_OPTIONS = [7, 30, 90] as const;

const SortableHeader: React.FC<{
  sortKey: ScoreboardSortKey;
  label: string;
  activeKey: ScoreboardSortKey;
  direction: ScoreboardSortDirection;
  onSort: (key: ScoreboardSortKey) => void;
  className?: string;
}> = ({ sortKey, label, activeKey, direction, onSort, className }) => {
  const active = sortKey === activeKey;
  return (
    <TableHeader className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex w-full cursor-pointer items-center gap-1 text-left"
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {active && <span className="text-typography-400">{direction === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHeader>
  );
};

/**
 * How builds are actually going, not just what one build did — cost, review
 * friction, and merge rate over time, plus every build in the window so a
 * pattern spotted in the trend can be traced back to the sessions behind it.
 */
export const BuilderScoreboard: React.FC = () => {
  const strings = en.builder.scoreboard;
  const navigate = useNavigate();

  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(30);
  const [sortKey, setSortKey] = useState<ScoreboardSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<ScoreboardSortDirection>("desc");

  const { data, isLoading, isError, refetch } = useGetBuilderScoreboardQuery({ windowDays });

  // Memoised rather than `data?.builds ?? []` inline: the fallback literal is a
  // fresh array on every render, which would make every useMemo below it
  // recompute on every render — the opposite of what memoising them is for.
  const builds = useMemo(() => data?.builds ?? [], [data]);
  const trends = useMemo(() => data?.trends ?? [], [data]);
  const totals = data?.totals;

  const sortedBuilds = useMemo(
    () => sortScoreboardBuilds(builds, sortKey, sortDirection),
    [builds, sortKey, sortDirection],
  );

  const handleSort = (key: ScoreboardSortKey) => {
    if (key === sortKey) {
      setSortDirection(direction => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const buildsSeries = useMemo(() => buildsStartedSeries(trends), [trends]);
  const mergeSeries = useMemo(() => mergeRateSeries(trends), [trends]);
  const costSeries = useMemo(() => medianCostSeries(trends), [trends]);
  const fixRunsSeries = useMemo(() => medianFixRunsSeries(trends), [trends]);

  const windowItems = WINDOW_OPTIONS.map(days => ({ id: days, label: strings.windowLabel(days) }));
  const selectedWindowItem = windowItems.find(item => item.id === windowDays) ?? windowItems[1];

  const source = buildSource({
    derivation: "Builder run + PR history, grouped by session",
    window: strings.windowLabel(windowDays),
    n: totals?.builds,
    nUnit: "builds",
  });

  const empty = !isLoading && builds.length === 0;

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 overflow-y-auto p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Button kind="ghost" size="sm" onClick={() => navigate(ROUTES.BUILDER)}>
            ← {strings.backToBuilder}
          </Button>
          <h1 className="mt-2 text-xl font-semibold text-typography-900">{strings.title}</h1>
          <p className="mt-1 text-sm text-typography-600">{strings.subtitle}</p>
        </div>
        <div className="relative w-40 shrink-0">
          <Dropdown
            id="builder-scoreboard-window"
            size="md"
            titleText={strings.windowFieldLabel}
            label={strings.windowFieldLabel}
            items={windowItems}
            selectedItem={selectedWindowItem}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) setWindowDays(selectedItem.id);
            }}
          />
        </div>
      </header>

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <InlineNotification kind="error" lowContrast hideCloseButton title={strings.loadFailed} />
          <Button kind="tertiary" size="sm" onClick={refetch}>
            {strings.retry}
          </Button>
        </div>
      ) : empty ? (
        <p className="mt-8 text-center text-sm text-typography-500">{strings.empty}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              label={strings.kpi.builds}
              value={String(totals?.builds ?? 0)}
              loading={isLoading}
            />
            <KpiTile
              label={strings.kpi.mergeRate}
              value={totals ? `${Math.round(totals.mergeRate * 100)}%` : "—"}
              loading={isLoading}
            />
            <KpiTile
              label={strings.kpi.totalCost}
              value={totals ? formatScoreboardCost(totals.totalCostUsd) : "—"}
              loading={isLoading}
            />
            <KpiTile
              label={strings.kpi.medianCost}
              value={totals ? formatScoreboardCost(totals.medianCostUsd) : "—"}
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title={strings.trend.buildsHeading}
              loading={isLoading}
              empty={!isLoading && buildsSeries.length === 0}
              source={source}
            >
              <ScrollableChart data={buildsSeries}>
                <LineChart
                  data={buildsSeries}
                  options={lineOpts({ leftTitle: "Builds", colorScale: single("Builds") })}
                />
              </ScrollableChart>
            </ChartCard>

            <ChartCard
              title={strings.trend.mergeRateHeading}
              loading={isLoading}
              empty={!isLoading && mergeSeries.length === 0}
              source={source}
            >
              <ScrollableChart data={mergeSeries}>
                <LineChart
                  data={mergeSeries}
                  options={lineOpts({
                    leftTitle: "%",
                    colorScale: single("Merge rate"),
                    domain: [0, 100],
                  })}
                />
              </ScrollableChart>
            </ChartCard>

            <ChartCard
              title={strings.trend.costHeading}
              loading={isLoading}
              empty={!isLoading && costSeries.length === 0}
              source={source}
            >
              <ScrollableChart data={costSeries}>
                <LineChart
                  data={costSeries}
                  options={lineOpts({ leftTitle: "USD", colorScale: single("Median cost") })}
                />
              </ScrollableChart>
            </ChartCard>

            <ChartCard
              title={strings.trend.fixRunsHeading}
              loading={isLoading}
              empty={!isLoading && fixRunsSeries.length === 0}
              source={source}
            >
              <ScrollableChart data={fixRunsSeries}>
                <LineChart
                  data={fixRunsSeries}
                  options={lineOpts({
                    leftTitle: "Fix runs",
                    colorScale: single("Median fix runs"),
                  })}
                />
              </ScrollableChart>
            </ChartCard>
          </div>

          <section>
            <h2 className="mb-2 text-sm font-medium text-typography-900">
              {strings.table.heading}
            </h2>
            {/* Scrolls inside its own box — never the page body — once the
                column count outgrows the card width. */}
            <div className="overflow-x-auto rounded border border-neutral-200">
              <Table size="md">
                <TableHead>
                  <TableRow>
                    <SortableHeader
                      sortKey="title"
                      label={strings.table.columnTitle}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHeader>{strings.table.columnRepos}</TableHeader>
                    <SortableHeader
                      sortKey="outcome"
                      label={strings.table.columnOutcome}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="createdAt"
                      label={strings.table.columnCreated}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="durationHours"
                      label={strings.table.columnDuration}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="costUsd"
                      label={strings.table.columnCost}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="runCount"
                      label={strings.table.columnRuns}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="fixRunCount"
                      label={strings.table.columnFixRuns}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="reviewCommentCount"
                      label={strings.table.columnReviewComments}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="ciFailureCount"
                      label={strings.table.columnCiFailures}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      sortKey="timeToMergeHours"
                      label={strings.table.columnTimeToMerge}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHeader>{strings.table.columnFailureTags}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedBuilds.map(build => (
                    <TableRow
                      key={build.sessionId}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => navigate(ROUTES.BUILDER_SESSION(build.sessionId))}
                    >
                      <TableCell>
                        <span className="block max-w-[220px] truncate font-medium text-primary-600">
                          {build.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[160px] truncate text-xs text-typography-600">
                          {build.repos.join(", ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Tag type={BUILDER_OUTCOME_TAG_TYPE[build.outcome]} size="sm">
                          {strings.outcome[build.outcome] ?? build.outcome}
                        </Tag>
                      </TableCell>
                      <TableCell>{new Date(build.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {build.durationHours === null
                          ? strings.table.durationUnknown
                          : formatHours(build.durationHours)}
                      </TableCell>
                      <TableCell>{formatScoreboardCost(build.costUsd)}</TableCell>
                      <TableCell>{build.runCount}</TableCell>
                      <TableCell>{build.fixRunCount}</TableCell>
                      <TableCell>{build.reviewCommentCount}</TableCell>
                      <TableCell>{build.ciFailureCount}</TableCell>
                      <TableCell>{formatHours(build.timeToMergeHours)}</TableCell>
                      <TableCell>
                        {build.failureTags.length ? (
                          <span className="block max-w-[180px] truncate text-xs text-typography-600">
                            {build.failureTags.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-typography-400">
                            {strings.table.noFailureTags}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
