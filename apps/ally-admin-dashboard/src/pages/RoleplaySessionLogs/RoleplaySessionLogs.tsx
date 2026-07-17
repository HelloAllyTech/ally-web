import { FC, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { RoleplaySessionLogRow, RoleplaySessionStatus } from "@types";
import { formatDate } from "@utils";

import { useRoleplaySessionLogs } from "./useRoleplaySessionLogs";
import { V2VTestModal } from "./V2VTestModal";

const SHOW_V2V_TEST = true;

/** Seconds -> compact "1h 02m", "5m 30s" or "45s". */
const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

/** Compact token count, e.g. 12.3k / 1.2M. */
const formatTokens = (n: number | null): string => {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

/** Estimated USD cost; `~` prefix flags an unpriced (lower-bound) figure. */
const formatCost = (n: number | null | undefined, priced: boolean): string => {
  if (n === null || n === undefined) return "—";
  const value = n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2);
  return `${priced ? "" : "~"}$${value}`;
};

const StatusPill: FC<{ status: RoleplaySessionStatus }> = ({ status }) => {
  const isEnded = status === "ENDED";
  const styles = isEnded
    ? { dot: "bg-neutral-400", bg: "bg-neutral-100" }
    : { dot: "bg-success-400", bg: "bg-success-100" };
  return (
    <span
      className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-typography-900 ${styles.bg}`}
    >
      <span className={`w-2 h-2 rounded-full mr-1 ${styles.dot}`} />
      {isEnded ? "Ended" : "In progress"}
    </span>
  );
};

export const RoleplaySessionLogs: FC = () => {
  const navigate = useNavigate();
  const {
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    searchInput,
    setSearchInput,
    status,
    onStatusChange,
    sessionType,
    onSessionTypeChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    hasActiveFilters,
    clearFilters,
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  } = useRoleplaySessionLogs();

  const openDetail = (row: RoleplaySessionLogRow) =>
    navigate(ROUTES.ROLEPLAY_SESSION_LOG_DETAIL(row.id));

  const [v2vOpen, setV2vOpen] = useState(false);

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl text-typography-900 font-secondary">Roleplay Session Logs</h1>
          <p className="text-sm text-typography-700 mt-1">
            All roleplay sessions across every organization. Admin Studio preview/test runs are
            excluded.
          </p>
        </div>
        {SHOW_V2V_TEST && (
          <Button variant={ButtonVariant.PRIMARY} onClick={() => setV2vOpen(true)}>
            Run V2V Test
          </Button>
        )}
      </div>

      {/* Toolbar: search + status + date range. */}
      <div className="flex flex-wrap items-end gap-3 mt-6 shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Search</label>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="User name, email or scenario"
            className="w-[260px] rounded border border-border-light px-3 py-2 bg-white text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Status</label>
          <Select
            id="roleplay-status-filter"
            labelText="Status"
            hideLabel
            value={status}
            onChange={e => onStatusChange(e.target.value as RoleplaySessionStatus | "")}
          >
            <SelectItem value="" text="All statuses" />
            <SelectItem value="ENDED" text="Ended" />
            <SelectItem value="ACTIVE" text="In progress" />
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Session type</label>
          <Select
            id="roleplay-session-type-filter"
            labelText="Session type"
            hideLabel
            value={sessionType}
            onChange={e => onSessionTypeChange(e.target.value as "all" | "test" | "real")}
          >
            <SelectItem value="all" text="All sessions" />
            <SelectItem value="real" text="Real only" />
            <SelectItem value="test" text="V2V test only" />
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => onDateFromChange(e.target.value)}
            className="rounded border border-border-light px-3 py-2 bg-white text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => onDateToChange(e.target.value)}
            className="rounded border border-border-light px-3 py-2 bg-white text-sm outline-none focus:border-primary-500"
          />
        </div>
        {hasActiveFilters && (
          <Button variant={ButtonVariant.TEXT} onClick={clearFilters} className="h-[40px] px-4">
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : isError ? (
          <p className="text-destructive-500">Failed to load roleplay session logs.</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No roleplay sessions found"
            subtitle={
              hasActiveFilters
                ? "No sessions match the current filters. Try clearing them."
                : "Roleplay sessions completed by users will appear here."
            }
            hideActionButton
          />
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">User</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Organization</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Scenario</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Started</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Duration</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Tokens</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Cost</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Score</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow
                  key={row.id}
                  onClick={() => openDetail(row)}
                  className="border-b border-border-light text-sm text-typography-900 align-top cursor-pointer hover:bg-background-secondary"
                >
                  <TableCell className="py-3 pr-4">
                    <div className="font-medium">{row.counselorName || "—"}</div>
                    <div className="text-typography-700 text-xs">{row.counselorEmail || ""}</div>
                  </TableCell>
                  <TableCell className="py-3 pr-4">{row.orgName || "—"}</TableCell>
                  <TableCell className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{row.scenarioTitle || "—"}</span>
                      {row.isV2VTest && (
                        <span className="inline-flex items-center px-[6px] py-[2px] rounded-full text-[11px] font-medium bg-primary-100 text-primary-700 whitespace-nowrap">
                          V2V Test
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <StatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    {row.startedAt ? formatDate(row.startedAt) : "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4">{formatDuration(row.durationSeconds)}</TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatTokens(row.totalTokens)}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatCost(row.estimatedCostUsd, row.costPriced)}
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    {row.score === null ? "—" : Math.min(100, Math.round(row.score))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination footer. */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
          <span className="text-sm text-typography-700">
            Showing {rangeStart}–{rangeEnd} of {total}
            {isFetching ? " · updating…" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goPrev}
              disabled={!canPrev}
              className="h-[36px] px-4"
            >
              Previous
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goNext}
              disabled={!canNext}
              className="h-[36px] px-4"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <V2VTestModal open={v2vOpen} onClose={() => setV2vOpen(false)} />
    </div>
  );
};
