import { useEffect, useMemo, useState } from "react";

import { useGetAwsLogsQuery, useGetAwsLogStreamsQuery } from "@api";
import { AwsLogLevel, AwsLogService, AwsLogsParams } from "@types";

export const AWS_LOG_SERVICES: { id: AwsLogService; label: string }[] = [
  { id: "ally-be", label: "ally-be" },
  { id: "ally-ai", label: "ally-ai" },
  { id: "ally-ai-learn", label: "ally-ai-learn" },
];

export const AWS_LOG_LEVELS: AwsLogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];

export type RangePresetId = "15m" | "1h" | "24h" | "7d" | "custom";

export const RANGE_PRESETS: { id: RangePresetId; label: string; ms?: number }[] = [
  { id: "15m", label: "Last 15 minutes", ms: 15 * 60 * 1000 },
  { id: "1h", label: "Last 1 hour", ms: 60 * 60 * 1000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "custom", label: "Custom range" },
];

const LIVE_POLL_MS = 5000;

/**
 * State + query wiring for the super-duper-admin AWS Logs page: service,
 * relative/custom time range, level, log-stream and free-text filters, an
 * optional "Live" auto-refresh, and CloudWatch's cursor-based pagination.
 *
 * CloudWatch's FilterLogEvents has no offset/total, only a `nextToken` — so
 * unlike the offset pagination in useRoleplaySessionLogs, this keeps a stack
 * of the tokens used to reach each page so "Previous" can pop back to one
 * already fetched instead of computing an offset.
 */
export function useAwsLogs() {
  const [service, setServiceState] = useState<AwsLogService>("ally-be");
  const [rangePreset, setRangePresetState] = useState<RangePresetId>("1h");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [level, setLevelState] = useState<AwsLogLevel | "">("");
  const [logStreamName, setLogStreamNameState] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const resetPaging = () => {
    setPageTokens([undefined]);
    setPageIndex(0);
  };

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      resetPaging();
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // "Live" ticks the window forward every 5s so a fixed relative range (e.g.
  // "last 15 minutes") keeps sliding; doesn't apply to a custom range.
  useEffect(() => {
    if (!live || rangePreset === "custom") return undefined;
    const id = setInterval(() => setNowTick(Date.now()), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [live, rangePreset]);

  const { startTime, endTime } = useMemo(() => {
    if (rangePreset === "custom") {
      return { startTime: customFrom?.getTime(), endTime: customTo?.getTime() };
    }
    const preset = RANGE_PRESETS.find(p => p.id === rangePreset);
    return { startTime: nowTick - (preset?.ms ?? 0), endTime: nowTick };
  }, [rangePreset, customFrom, customTo, nowTick]);

  const onServiceChange = (value: AwsLogService) => {
    setServiceState(value);
    setLogStreamNameState("");
    resetPaging();
  };
  const onRangePresetChange = (value: RangePresetId) => {
    setRangePresetState(value);
    if (value === "custom") setLive(false);
    resetPaging();
  };
  const onCustomRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setCustomFrom(from);
    setCustomTo(to);
    resetPaging();
  };
  const onLevelChange = (value: AwsLogLevel | "") => {
    setLevelState(value);
    resetPaging();
  };
  const onLogStreamNameChange = (value: string) => {
    setLogStreamNameState(value);
    resetPaging();
  };
  const toggleLive = () => setLive(v => !v);

  const currentToken = pageTokens[pageIndex];
  const params = useMemo<AwsLogsParams | undefined>(() => {
    if (!startTime || !endTime) return undefined;
    const next: AwsLogsParams = { service, startTime, endTime, limit: 200 };
    if (level) next.level = level;
    if (logStreamName) next.logStreamName = logStreamName;
    if (search) next.search = search;
    if (currentToken) next.nextToken = currentToken;
    return next;
  }, [service, startTime, endTime, level, logStreamName, search, currentToken]);

  const { data, isLoading, isFetching, isError, refetch } = useGetAwsLogsQuery(
    params ?? { service, startTime: 0, endTime: 0 },
    {
      skip: !params,
      pollingInterval: live && rangePreset !== "custom" ? LIVE_POLL_MS : 0,
    },
  );

  const { data: streamsData } = useGetAwsLogStreamsQuery({ service });

  const events = data?.events ?? [];

  const canPrev = pageIndex > 0;
  const canNext = Boolean(data?.nextToken);
  const goPrev = () => setPageIndex(i => Math.max(0, i - 1));
  const goNext = () => {
    if (!data?.nextToken) return;
    setPageTokens(tokens =>
      pageIndex === tokens.length - 1 ? [...tokens, data.nextToken] : tokens,
    );
    setPageIndex(i => i + 1);
  };

  const hasActiveFilters = Boolean(search || level || logStreamName || rangePreset !== "1h");
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setLevelState("");
    setLogStreamNameState("");
    setRangePresetState("1h");
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setLive(false);
    resetPaging();
  };

  return {
    // data
    events,
    isLoading,
    isFetching,
    isError,
    refetch,
    streams: streamsData?.streams ?? [],
    // filters
    service,
    onServiceChange,
    rangePreset,
    onRangePresetChange,
    customFrom,
    customTo,
    onCustomRangeChange,
    level,
    onLevelChange,
    logStreamName,
    onLogStreamNameChange,
    searchInput,
    setSearchInput,
    live,
    toggleLive,
    hasActiveFilters,
    clearFilters,
    // pagination
    canPrev,
    canNext,
    goPrev,
    goNext,
  };
}
