import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgTracksQuery,
  useEnableOrgTracksMutation,
  useDisableOrgTracksMutation,
} from "@api";
import { SORT_ORDER } from "@constants";

import { OrgAccessItem, OrgAccessList } from "./OrgAccessList";
import { useCohortRestrictions } from "./useCohortRestrictions";

const PAGE_SIZE = 20;

/**
 * Courses (Track 2.0) tab for the org admin's own tenant.
 *
 * This tab did not exist before cohorts: `track_tenants` and the tenant-scoped
 * assign/unassign endpoints were already there, and the ADMIN role already held
 * `view:admin:tracks` + `edit`/`delete:track-tenant` from the original
 * access-management grant — only the UI was missing. Adding per-group targeting
 * for courses required the tenant-level tab first, since the group control hangs
 * off these rows.
 *
 * Unlike scenarios, course ids are uuids, which is why OrgAccessItem.id is
 * `number | string`.
 */
export const OrgTracksAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isFetching } = useGetOrgTracksQuery(
    {
      tenantId,
      search: search || undefined,
      status: "ACTIVE",
      limit: PAGE_SIZE,
      offset,
      sortBy: "updatedAt",
      order: SORT_ORDER.DESC,
    },
    { skip: !tenantId },
  );

  const [items, setItems] = useState<OrgAccessItem[]>([]);
  useEffect(() => {
    if (!data?.data) return;
    const rows: OrgAccessItem[] = data.data.map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      coverImageUrl: track.coverImageUrl,
      isAssignedToTenant: track.isAssignedToTenant,
      totalScenarios: track.totalItems,
    }));
    setItems(prev => (offset === 0 ? rows : [...prev, ...rows]));
  }, [data, offset]);

  const hasMore = (data?.data?.length ?? 0) === PAGE_SIZE;

  const [enableTracks] = useEnableOrgTracksMutation();
  const [disableTracks] = useDisableOrgTracksMutation();

  const handleToggle = async (id: number | string, enabled: boolean) => {
    if (!tenantId) return;
    const trackId = String(id);
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isAssignedToTenant: enabled } : item)),
    );
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (enabled) {
        await enableTracks({ tenantId, trackIds: [trackId] }).unwrap();
      } else {
        await disableTracks({ tenantId, trackIds: [trackId] }).unwrap();
      }
    } catch (error: any) {
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, isAssignedToTenant: !enabled } : item)),
      );
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

  const { renderRowAction } = useCohortRestrictions(tenantId, "track");

  return (
    <OrgAccessList
      items={items}
      isLoading={showInitialLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      pendingIds={pendingIds}
      searchPlaceholder="Search courses"
      emptyLabel="No courses found"
      onSearchChange={setSearch}
      onToggle={handleToggle}
      onLoadMore={() => setOffset(prev => prev + PAGE_SIZE)}
      renderRowAction={renderRowAction}
    />
  );
};

export default OrgTracksAccess;
