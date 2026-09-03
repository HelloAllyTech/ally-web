import React, { useMemo, useState } from "react";

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
import { useGetBuilderPipelineHealthQuery } from "@api";
import { en, ROUTES } from "@constants";

import { BUILDER_RUN_STATUS_TAG_TYPE } from "./builderMotion";
import {
  formatCount,
  formatDurationMs,
  formatPassRate,
  formatPipelineCost,
  sortPhasesByCostDesc,
  timeSplit,
} from "./pipelineFormat";

const WINDOW_OPTIONS = [7, 30, 90] as const;

/**
 * The model-versus-tools bar.
 *
 * Deliberately two divs rather than a Carbon chart: it is one ratio per row
 * inside a table cell, and a chart component there costs a render pass and a
 * legend to say what "62%" already says. The exact figures sit beside it
 * because a bar is for scanning and the number is for quoting.
 */
const SplitBar: React.FC<{ apiPercent: number; toolPercent: number; label: string }> = ({
  apiPercent,
  toolPercent,
  label,
}) => (
  <div className="flex min-w-[9rem] items-center gap-2" title={label}>
    <div
      className="flex h-2 flex-1 overflow-hidden rounded-full bg-ui-200"
      role="img"
      aria-label={label}
    >
      <div className="bg-support-info h-full" style={{ width: `${apiPercent}%` }} />
      <div className="bg-support-warning h-full" style={{ width: `${toolPercent}%` }} />
    </div>
    <span className="shrink-0 text-xs tabular-nums text-typography-500">
      {apiPercent}/{toolPercent}
    </span>
  </div>
);

/**
 * Where a run spends its time and money.
 *
 * The scoreboard next door answers "is Builder getting better". This answers
 * "and what would make it faster", which is a different question: the first
 * real build took 48 minutes and $16.77 and nothing recorded which 48 minutes.
 *
 * Every measurement is nullable and renders as "—" when absent. Runs from
 * before the runner reported timings have cost and no clock, and showing those
 * as zero-second phases would read as instant rather than unmeasured.
 */
export const BuilderPipeline: React.FC = () => {
  const strings = en.builder.pipeline;
  const navigate = useNavigate();

  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(30);
  const { data, isLoading, isError, refetch } = useGetBuilderPipelineHealthQuery({ windowDays });

  // Memoised rather than `data?.phases ?? []` inline: a fresh fallback array on
  // every render would defeat the useMemo below it.
  const phases = useMemo(() => data?.phases ?? [], [data]);
  const gates = useMemo(() => data?.gates ?? [], [data]);
  const outcomes = useMemo(() => data?.outcomes ?? [], [data]);
  const byCost = useMemo(() => sortPhasesByCostDesc(phases), [phases]);

  const windowItems = WINDOW_OPTIONS.map(days => ({ id: days, label: strings.windowLabel(days) }));
  const selectedWindowItem = windowItems.find(item => item.id === windowDays) ?? windowItems[1];

  const empty = !isLoading && phases.length === 0 && gates.length === 0 && outcomes.length === 0;

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
            id="builder-pipeline-window"
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
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-typography-900">{strings.time.heading}</h2>
            <div className="overflow-x-auto">
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{strings.time.columnPhase}</TableHeader>
                    <TableHeader>{strings.time.columnModel}</TableHeader>
                    <TableHeader>{strings.time.columnInvocations}</TableHeader>
                    <TableHeader>{strings.time.columnMedianWall}</TableHeader>
                    <TableHeader>{strings.time.columnP95Wall}</TableHeader>
                    <TableHeader>{strings.time.columnTurns}</TableHeader>
                    <TableHeader>{strings.time.columnSplit}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phases.map(phase => {
                    const split = timeSplit(phase);
                    return (
                      <TableRow key={`${phase.phase}:${phase.model ?? "unknown"}`}>
                        <TableCell className="font-medium">{phase.phase}</TableCell>
                        <TableCell className="text-typography-600">{phase.model ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{phase.invocations}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatDurationMs(phase.medianWallMs)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDurationMs(phase.p95WallMs)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCount(phase.medianTurns)}
                        </TableCell>
                        <TableCell>
                          {split ? (
                            <SplitBar
                              apiPercent={split.apiPercent}
                              toolPercent={split.toolPercent}
                              label={strings.time.splitLabel(split.apiPercent, split.toolPercent)}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-typography-500">{strings.unmeasuredNote}</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-typography-900">{strings.money.heading}</h2>
            <div className="overflow-x-auto">
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{strings.money.columnPhase}</TableHeader>
                    <TableHeader>{strings.money.columnModel}</TableHeader>
                    <TableHeader>{strings.money.columnInvocations}</TableHeader>
                    <TableHeader>{strings.money.columnTotal}</TableHeader>
                    <TableHeader>{strings.money.columnMedian}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byCost.map(phase => (
                    <TableRow key={`cost:${phase.phase}:${phase.model ?? "unknown"}`}>
                      <TableCell className="font-medium">{phase.phase}</TableCell>
                      <TableCell className="text-typography-600">{phase.model ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{phase.invocations}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatPipelineCost(phase.totalCostUsd)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPipelineCost(phase.medianCostUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-typography-900">{strings.gate.heading}</h2>
            <p className="text-xs text-typography-600">{strings.gate.subheading}</p>
            <div className="overflow-x-auto">
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{strings.gate.columnRepo}</TableHeader>
                    <TableHeader>{strings.gate.columnKind}</TableHeader>
                    <TableHeader>{strings.gate.columnResults}</TableHeader>
                    <TableHeader>{strings.gate.columnPassed}</TableHeader>
                    <TableHeader>{strings.gate.columnPassRate}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gates.map(gate => (
                    <TableRow key={`${gate.repo}:${gate.kind}`}>
                      <TableCell className="font-medium">{gate.repo}</TableCell>
                      <TableCell className="text-typography-600">{gate.kind}</TableCell>
                      <TableCell className="tabular-nums">{gate.results}</TableCell>
                      <TableCell className="tabular-nums">{gate.passed}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatPassRate(gate.passRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-typography-900">
              {strings.outcomes.heading}
            </h2>
            <div className="overflow-x-auto">
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{strings.outcomes.columnStatus}</TableHeader>
                    <TableHeader>{strings.outcomes.columnMode}</TableHeader>
                    <TableHeader>{strings.outcomes.columnRuns}</TableHeader>
                    <TableHeader>{strings.outcomes.columnMedianMinutes}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outcomes.map(outcome => (
                    <TableRow key={`${outcome.status}:${outcome.mode}`}>
                      <TableCell>
                        <Tag type={BUILDER_RUN_STATUS_TAG_TYPE[outcome.status] ?? "gray"} size="sm">
                          {outcome.status}
                        </Tag>
                      </TableCell>
                      <TableCell className="text-typography-600">{outcome.mode}</TableCell>
                      <TableCell className="tabular-nums">{outcome.runs}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatCount(outcome.medianRunnerMinutes)}
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
