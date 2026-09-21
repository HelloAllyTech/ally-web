import { ReactNode, useMemo } from "react";

import { useGetCohortsQuery, useGetCohortRestrictionsQuery } from "@api";
import { CohortContentType } from "@types";

import { CohortRestrictionCell } from "./CohortRestrictionCell";

/**
 * Shared wiring for the "who can see this" control on the Simulations, Courses
 * and Cases tabs of an organization's detail page.
 *
 * Fetches the tenant's groups and its restriction map once per tab and hands
 * back a `renderRestrictionCell` the tab drops into each row — so the three
 * tabs gain the control by adding one call, and none of them repeats the lookup
 * logic or the empty-means-everyone rule.
 *
 * Mirrors the helpline hook of the same name deliberately: the two apps hit the
 * same endpoints with the same semantics, and any divergence in how absence is
 * interpreted would show up as two different answers to "who can see this?".
 *
 * Two behaviours worth preserving:
 *
 * - **The whole restriction map is fetched, not one request per row.** Both
 *   queries are unparameterised by content id, so they dedupe across the tab and
 *   the control renders without a per-row spinner.
 * - **The control is absent until a group exists.** A tenant that has never made
 *   a group has exactly one possible answer to "who can see this?", and offering
 *   the control anyway would be a dead end that implies the Everyone default is
 *   a choice needing confirmation.
 */
export function useCohortRestrictions(
  tenantId: string,
  contentType: CohortContentType,
): {
  hasCohorts: boolean;
  renderRestrictionCell: (contentId: string | number, title: string) => ReactNode;
} {
  const { data: cohortData } = useGetCohortsQuery({ tenantId }, { skip: !tenantId });
  const { data: restrictions } = useGetCohortRestrictionsQuery(
    { tenantId, contentType },
    { skip: !tenantId },
  );

  const cohorts = useMemo(() => cohortData?.data ?? [], [cohortData]);
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

  const renderRestrictionCell = useMemo(() => {
    return (contentId: string | number, title: string): ReactNode => {
      if (!hasCohorts) return null;
      const id = String(contentId);
      return (
        <CohortRestrictionCell
          tenantId={tenantId}
          contentType={contentType}
          contentId={id}
          contentTitle={title}
          cohorts={cohorts}
          restrictedTo={restrictionMap.get(id) ?? []}
        />
      );
    };
  }, [hasCohorts, tenantId, contentType, cohorts, restrictionMap]);

  return { hasCohorts, renderRestrictionCell };
}
