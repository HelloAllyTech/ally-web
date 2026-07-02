import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgScenariosQuery,
  useEnableOrgScenariosMutation,
  useDisableOrgScenariosMutation,
} from "@api";
import { SORT_ORDER } from "@constants";

import { OrgAccessItem, OrgAccessList } from "./OrgAccessList";

const PAGE_SIZE = 20;

/**
 * Simulations (scenario access) tab for the org admin's own tenant.
 *
 * Lists all admin scenarios with an assigned/unassigned toggle per row, scoped
 * to the caller's own tenant. Mirrors the super-admin SimulationsTab, but the
 * assign/unassign mutations are owned here (helpline has no parent handler).
 */
export const OrgSimulationsAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  // Reset paging whenever the search term changes.
  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isFetching } = useGetOrgScenariosQuery(
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

  // Accumulate pages so "Load more" appends rather than replaces.
  const [items, setItems] = useState<OrgAccessItem[]>([]);
  useEffect(() => {
    if (!data?.data) return;
    const rows: OrgAccessItem[] = data.data.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      coverImageUrl: s.coverImageUrl,
      isAssignedToTenant: s.isAssignedToTenant,
    }));
    setItems(prev => (offset === 0 ? rows : [...prev, ...rows]));
  }, [data, offset]);

  const hasMore = (data?.data?.length ?? 0) === PAGE_SIZE;

  const [enableScenarios] = useEnableOrgScenariosMutation();
  const [disableScenarios] = useDisableOrgScenariosMutation();

  const handleToggle = async (id: number, enabled: boolean) => {
    if (!tenantId) return;
    // Optimistic flip + pending guard.
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isAssignedToTenant: enabled } : item)),
    );
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (enabled) {
        await enableScenarios({ tenantId, scenarioIds: [id] }).unwrap();
      } else {
        await disableScenarios({ tenantId, scenarioIds: [id] }).unwrap();
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

  // Only the very first load shows skeletons; subsequent pages keep the list.
  const showInitialLoading = useMemo(
    () => isLoading || (!!tenantId && !data && items.length === 0),
    [isLoading, tenantId, data, items.length],
  );

  return (
    <OrgAccessList
      items={items}
      isLoading={showInitialLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      pendingIds={pendingIds}
      searchPlaceholder="Search simulations"
      emptyLabel="No simulations found"
      onSearchChange={setSearch}
      onToggle={handleToggle}
      onLoadMore={() => setOffset(prev => prev + PAGE_SIZE)}
    />
  );
};

export default OrgSimulationsAccess;
