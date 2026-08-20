import { ReactNode, useMemo } from "react";

import { useGetOrgCohortsQuery, useGetOrgCohortRestrictionsQuery } from "@api";
import { CohortContentType } from "@types";

import { CohortRestrictionCell } from "./CohortRestrictionCell";
import { OrgAccessItem } from "./OrgAccessList";

/**
 * Shared wiring for the "who can see this" control on the Simulations, Courses
 * and Cases tabs.
 *
 * Fetches the tenant's groups and its restriction map once per tab and hands
 * back a `renderRowAction` ready to pass straight to OrgAccessList — so the three
 * content tabs gain the control by adding one prop, and none of them repeats the
 * lookup logic or the empty-means-everyone rule.
 *
 * Two behaviours worth preserving:
 *
 * - **The whole restriction map is fetched, not one request per row.** Both
 *   queries are unparameterised by content id, so they dedupe across the tab
 *   and the control renders without a per-row spinner.
 * - **The control is hidden entirely until a group exists.** A tenant that has
 *   never made a group has exactly one possible answer to "who can see this?",
 *   and offering the control anyway would be a dead end that implies the
 *   Everyone default is a choice needing confirmation.
 */
export function useCohortRestrictions(
  tenantId: string,
  contentType: CohortContentType,
): {
  hasCohorts: boolean;
  renderRowAction: ((item: OrgAccessItem) => ReactNode) | undefined;
} {
  const { data: cohortData } = useGetOrgCohortsQuery({ tenantId }, { skip: !tenantId });
  const { data: restrictions } = useGetOrgCohortRestrictionsQuery(
    { tenantId, contentType },
    { skip: !tenantId },
  );

  const cohorts = cohortData?.data ?? [];
  // The Unassigned bucket is always returned, so "has groups" means at least one
  // the admin actually made.
  const hasCohorts = cohorts.some(cohort => !cohort.isUnassignedBucket);

  const restrictionMap = useMemo(() => {
    const map = new Map<string, string[]>();
    // Items absent from this response are unrestricted — the tenant-wide
    // default. A missing key is therefore an empty array, never "unknown".
    (restrictions ?? []).forEach(entry => map.set(entry.contentId, entry.cohortIds));
    return map;
  }, [restrictions]);

  const renderRowAction = useMemo(() => {
    if (!hasCohorts) return undefined;
    return (item: OrgAccessItem) => (
      <CohortRestrictionCell
        tenantId={tenantId}
        contentType={contentType}
        contentId={String(item.id)}
        contentTitle={item.title}
        cohorts={cohorts}
        restrictedTo={restrictionMap.get(String(item.id)) ?? []}
      />
    );
  }, [hasCohorts, tenantId, contentType, cohorts, restrictionMap]);

  return { hasCohorts, renderRowAction };
}
