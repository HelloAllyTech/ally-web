import { useEffect, useMemo, useState } from "react";

import { useGetRoleplaySessionLogsQuery } from "@api";
import { RoleplaySessionLogsParams, RoleplaySessionStatus } from "@types";

export const ROLEPLAY_LOGS_PAGE_SIZE = 25;

/**
 * State + query wiring for the super-admin Roleplay Session Logs table:
 * debounced search, status / date-range filters and offset pagination. Any
 * filter change resets paging back to the first page.
 */
/** "all" = no filter, "test" = V2V only, "real" = non-V2V only */
type SessionTypeFilter = "all" | "test" | "real";

export function useRoleplaySessionLogs() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RoleplaySessionStatus | "">("");
  const [sessionType, setSessionType] = useState<SessionTypeFilter>("all");
  const [language, setLanguage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params: RoleplaySessionLogsParams = useMemo(() => {
    const next: RoleplaySessionLogsParams = {
      limit: ROLEPLAY_LOGS_PAGE_SIZE,
      offset,
    };
    if (search) next.search = search;
    if (status) next.status = status;
    if (sessionType === "test") next.isV2VTest = true;
    if (sessionType === "real") next.isV2VTest = false;
    if (language) next.language = language;
    if (dateFrom) next.dateFrom = dateFrom;
    // Treat the picked end date as inclusive (end of that day, UTC).
    if (dateTo) next.dateTo = `${dateTo}T23:59:59.999Z`;
    return next;
  }, [search, status, sessionType, language, dateFrom, dateTo, offset]);

  const { data, isLoading, isFetching, isError, refetch } = useGetRoleplaySessionLogsQuery(params);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const onStatusChange = (value: RoleplaySessionStatus | "") => {
    setStatus(value);
    setOffset(0);
  };
  const onSessionTypeChange = (value: SessionTypeFilter) => {
    setSessionType(value);
    setOffset(0);
  };
  const onLanguageChange = (value: string) => {
    setLanguage(value);
    setOffset(0);
  };
  const onDateFromChange = (value: string) => {
    setDateFrom(value);
    setOffset(0);
  };
  const onDateToChange = (value: string) => {
    setDateTo(value);
    setOffset(0);
  };

  const hasActiveFilters = Boolean(
    search || status || sessionType !== "all" || language || dateFrom || dateTo,
  );
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSessionType("all");
    setLanguage("");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  };

  const canPrev = offset > 0;
  const canNext = offset + ROLEPLAY_LOGS_PAGE_SIZE < total;
  const goPrev = () => setOffset(prev => Math.max(0, prev - ROLEPLAY_LOGS_PAGE_SIZE));
  const goNext = () => setOffset(prev => (canNext ? prev + ROLEPLAY_LOGS_PAGE_SIZE : prev));

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + ROLEPLAY_LOGS_PAGE_SIZE, total);

  return {
    // data
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    refetch,
    // filters
    searchInput,
    setSearchInput,
    status,
    onStatusChange,
    sessionType,
    onSessionTypeChange,
    language,
    onLanguageChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    hasActiveFilters,
    clearFilters,
    // pagination
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  };
}
