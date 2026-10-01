import { useEffect, useMemo, useRef, useState } from "react";

import {
  GetProductUpdatesParams,
  ProductUpdateAudience,
  ProductUpdateStatusFilter,
  ProductUpdateSurface,
  useGetProductUpdatesQuery,
  useGetProductUpdatesStatusQuery,
} from "@api";

export const PRODUCT_UPDATES_PAGE_SIZE = 25;
export const PRODUCT_UPDATES_STATUS_POLL_MS = 15_000;

/**
 * State + query wiring for the Product updates table: debounced search, status / audience /
 * surface / hidden filters and offset pagination. Any filter change resets paging to page one.
 */
export function useProductUpdates() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductUpdateStatusFilter | "">("");
  const [audience, setAudience] = useState<ProductUpdateAudience | "">("");
  const [surface, setSurface] = useState<ProductUpdateSurface | "">("");
  const [showHidden, setShowHidden] = useState(false);
  const [offset, setOffset] = useState(0);

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params: GetProductUpdatesParams = useMemo(() => {
    const next: GetProductUpdatesParams = { limit: PRODUCT_UPDATES_PAGE_SIZE, offset };
    if (search) next.search = search;
    if (status) next.status = status;
    if (audience) next.audience = audience;
    if (surface) next.surface = surface;
    // Hidden updates are off the table until asked for; unchecked sends hidden=false.
    if (!showHidden) next.hidden = false;
    return next;
  }, [search, status, audience, surface, showHidden, offset]);

  const { data, isLoading, isFetching, isError, refetch } = useGetProductUpdatesQuery(params);

  // Status is polled only while a run is in flight; the first fetch tells us if one is.
  const [pollMs, setPollMs] = useState(0);
  const { data: automation, isError: isStatusError } = useGetProductUpdatesStatusQuery(undefined, {
    pollingInterval: pollMs,
  });
  const running = automation?.running ?? false;
  useEffect(() => {
    setPollMs(running ? PRODUCT_UPDATES_STATUS_POLL_MS : 0);
  }, [running]);

  // When a run finishes, the table is stale (new or changed updates): refetch it once.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) refetch();
    wasRunning.current = running;
  }, [running, refetch]);

  const updates = data?.updates ?? [];
  const total = data?.count ?? 0;

  const onStatusChange = (value: ProductUpdateStatusFilter | "") => {
    setStatus(value);
    setOffset(0);
  };
  const onAudienceChange = (value: ProductUpdateAudience | "") => {
    setAudience(value);
    setOffset(0);
  };
  const onSurfaceChange = (value: ProductUpdateSurface | "") => {
    setSurface(value);
    setOffset(0);
  };
  const onShowHiddenChange = (value: boolean) => {
    setShowHidden(value);
    setOffset(0);
  };

  const hasActiveFilters = Boolean(search || status || audience || surface || showHidden);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setAudience("");
    setSurface("");
    setShowHidden(false);
    setOffset(0);
  };

  const canPrev = offset > 0;
  const canNext = offset + PRODUCT_UPDATES_PAGE_SIZE < total;
  const goPrev = () => setOffset(prev => Math.max(0, prev - PRODUCT_UPDATES_PAGE_SIZE));
  const goNext = () => setOffset(prev => (canNext ? prev + PRODUCT_UPDATES_PAGE_SIZE : prev));

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PRODUCT_UPDATES_PAGE_SIZE, total);

  return {
    params,
    updates,
    total,
    isLoading,
    isFetching,
    isError,
    automation,
    isStatusError,
    running,
    searchInput,
    setSearchInput,
    status,
    onStatusChange,
    audience,
    onAudienceChange,
    surface,
    onSurfaceChange,
    showHidden,
    onShowHiddenChange,
    hasActiveFilters,
    clearFilters,
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  };
}
