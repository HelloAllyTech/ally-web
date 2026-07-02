import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgScenarioPathsQuery,
  useEnableOrgScenarioPathsMutation,
  useDisableOrgScenarioPathsMutation,
} from "@api";
import { SORT_ORDER } from "@constants";

import { OrgAccessItem, OrgAccessList } from "./OrgAccessList";

const PAGE_SIZE = 20;

/**
 * Path (scenario-path access) tab for the org admin's own tenant. Mirrors the
 * super-admin PathTab, scoped to the caller's tenant.
 */
export const OrgPathsAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isFetching } = useGetOrgScenarioPathsQuery(
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
    const rows: OrgAccessItem[] = data.data.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      coverImageUrl: p.coverImageUrl,
      isAssignedToTenant: p.isAssignedToTenant,
      totalScenarios: p.totalScenarios,
    }));
    setItems(prev => (offset === 0 ? rows : [...prev, ...rows]));
  }, [data, offset]);

  const hasMore = (data?.data?.length ?? 0) === PAGE_SIZE;

  const [enablePaths] = useEnableOrgScenarioPathsMutation();
  const [disablePaths] = useDisableOrgScenarioPathsMutation();

  const handleToggle = async (id: number, enabled: boolean) => {
    if (!tenantId) return;
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isAssignedToTenant: enabled } : item)),
    );
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (enabled) {
        await enablePaths({ tenantId, scenarioPathIds: [id] }).unwrap();
      } else {
        await disablePaths({ tenantId, scenarioPathIds: [id] }).unwrap();
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

  return (
    <OrgAccessList
      items={items}
      isLoading={showInitialLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      pendingIds={pendingIds}
      searchPlaceholder="Search paths"
      emptyLabel="No paths found"
      onSearchChange={setSearch}
      onToggle={handleToggle}
      onLoadMore={() => setOffset(prev => prev + PAGE_SIZE)}
    />
  );
};

export default OrgPathsAccess;
