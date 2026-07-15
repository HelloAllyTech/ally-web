import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgTenantBadgesQuery,
  useAssignOrgBadgeMutation,
  useUnassignOrgBadgeMutation,
} from "@api";
import { NoResults, SearchIcon } from "@assets";
import { Input, ToggleSwitch } from "@components";
import { SORT_ORDER } from "@constants";
import { useDebounce } from "@hooks";
import { OrgTenantBadge } from "@types";

const PAGE_SIZE = 20;

const RowSkeleton = () => (
  <div className="flex items-center justify-between gap-4 rounded border border-border-light p-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded bg-neutral-200" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded bg-neutral-200" />
        <div className="h-3 w-56 rounded bg-neutral-200" />
      </div>
    </div>
    <div className="h-6 w-11 rounded-full bg-neutral-200" />
  </div>
);

/**
 * Badges access tab for the org admin's own tenant.
 *
 * Mirrors the super-admin BadgesTab: lists badges via the tenant-visibility
 * endpoint (each row carries an `enabled` flag) and assigns/unassigns the badge
 * to the caller's own tenant via /v1/badges/tenants { badgeId, tenantIds }.
 */
export const OrgBadgesAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce((value: string) => setSearch(value), 300);

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isFetching } = useGetOrgTenantBadgesQuery(
    {
      tenantId,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset,
      sortBy: "name",
      order: SORT_ORDER.ASC,
    },
    { skip: !tenantId },
  );

  const [items, setItems] = useState<OrgTenantBadge[]>([]);
  useEffect(() => {
    if (!data?.data) return;
    setItems(prev => (offset === 0 ? data.data : [...prev, ...data.data]));
  }, [data, offset]);

  const hasMore = (data?.data?.length ?? 0) === PAGE_SIZE;

  const [assignBadge] = useAssignOrgBadgeMutation();
  const [unassignBadge] = useUnassignOrgBadgeMutation();

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!tenantId) return;
    setItems(prev => prev.map(b => (b.id === id ? { ...b, enabled } : b)));
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (enabled) {
        await assignBadge({ badgeId: id, tenantIds: [tenantId] }).unwrap();
      } else {
        await unassignBadge({ badgeId: id, tenantIds: [tenantId] }).unwrap();
      }
    } catch (error: any) {
      setItems(prev => prev.map(b => (b.id === id ? { ...b, enabled: !enabled } : b)));
      toast.error(error?.data?.message || "Failed to update access");
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const showInitialLoading = useMemo(
    () => isLoading || (!!tenantId && !data && items.length === 0),
    [isLoading, tenantId, data, items.length],
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 font-primary">
      <div className="relative w-full max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-500">
          <SearchIcon />
        </span>
        <Input
          value={searchInput}
          onChange={e => {
            setSearchInput(e.target.value);
            debouncedSearch(e.target.value);
          }}
          placeholder="Search badges"
          className="pl-9"
        />
      </div>

      {showInitialLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-typography-600">
          <NoResults />
          <span className="text-sm">No badges found</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(badge => {
            const isPending = pendingIds.has(badge.id);
            const enabled = Boolean(badge.enabled);
            return (
              <div
                key={badge.id}
                className="flex items-center justify-between gap-4 rounded border border-border-light p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt="" className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-typography-900">
                      {badge.name}
                    </span>
                    <span className="truncate text-xs text-typography-600">
                      {badge.description}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className={isPending ? "pointer-events-none opacity-50" : ""}>
                    <ToggleSwitch
                      enabled={enabled}
                      onChange={next => handleToggle(badge.id, next)}
                      label={badge.name}
                    />
                  </div>
                  <span className="w-16 text-sm text-typography-900">
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              disabled={isFetching}
              className="mt-1 self-center text-sm font-medium text-primary-500 disabled:opacity-50"
            >
              {isFetching ? "Loading..." : "+ Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrgBadgesAccess;
