import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgCasesQuery,
  useEnableOrgCasesMutation,
  useDisableOrgCasesMutation,
} from "@api";
import { SORT_ORDER } from "@constants";

import { OrgAccessItem, OrgAccessList } from "./OrgAccessList";
import { useCohortRestrictions } from "./useCohortRestrictions";

const PAGE_SIZE = 20;

/**
 * Cases (case access) tab for the org admin's own tenant. Mirrors the
 * super-admin CasesTab, scoped to the caller's tenant. Cases share the
 * scenario-path row shape server-side.
 */
export const OrgCasesAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isFetching } = useGetOrgCasesQuery(
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
    const rows: OrgAccessItem[] = data.data.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      isAssignedToTenant: c.isAssignedToTenant,
      totalScenarios: c.totalScenarios,
    }));
    setItems(prev => (offset === 0 ? rows : [...prev, ...rows]));
  }, [data, offset]);

  const hasMore = (data?.data?.length ?? 0) === PAGE_SIZE;

  const [enableCases] = useEnableOrgCasesMutation();
  const [disableCases] = useDisableOrgCasesMutation();

  const handleToggle = async (id: number | string, enabled: boolean) => {
    if (!tenantId) return;
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isAssignedToTenant: enabled } : item)),
    );
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (enabled) {
        await enableCases({ tenantId, caseIds: [Number(id)] }).unwrap();
      } else {
        await disableCases({ tenantId, caseIds: [Number(id)] }).unwrap();
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

  const { renderRowAction } = useCohortRestrictions(tenantId, "case");

  return (
    <OrgAccessList
      items={items}
      isLoading={showInitialLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      pendingIds={pendingIds}
      searchPlaceholder="Search cases"
      emptyLabel="No cases found"
      onSearchChange={setSearch}
      onToggle={handleToggle}
      onLoadMore={() => setOffset(prev => prev + PAGE_SIZE)}
      renderRowAction={renderRowAction}
    />
  );
};

export default OrgCasesAccess;
