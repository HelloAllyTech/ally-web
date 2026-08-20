/**
 * Cohorts — a tenant's own MECE grouping of its users.
 *
 * A user is in exactly one cohort, or in none. "None" is not an absence but a
 * real, targetable audience called Unassigned, which the backend synthesises
 * into the cohort list under `UNASSIGNED_COHORT_ID`.
 *
 * Restrictions sit on top of the tenant assignment the content tabs manage, and
 * they only ever SUBTRACT: content with no restriction is visible to every user
 * of the tenant, exactly as before cohorts existed. The restriction map
 * therefore omits unrestricted items entirely rather than listing them with an
 * empty array — absence is the meaningful state, and it must render as
 * "Everyone", never as "nobody".
 */

/**
 * The Unassigned audience. Must equal `UNASSIGNED_COHORT_ID` in ally-be's
 * src/cohort/constants/cohort.constants.ts — it is the wire value standing in
 * for a NULL cohortId.
 */
export const UNASSIGNED_COHORT_ID = "unassigned";

export interface Cohort {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  /** True for the synthesised Unassigned bucket: not renamable, not deletable. */
  isUnassignedBucket: boolean;
}

export interface CohortListResponse {
  data: Cohort[];
  /** Cohortable users in the tenant — the denominator for "N of M placed". */
  totalUsers: number;
}

export interface CohortMember {
  userId: number;
  name: string;
  email: string;
  status: string;
  cohortId?: string | null;
  cohortName?: string | null;
}

export interface CohortMemberListResponse {
  data: CohortMember[];
  count: number;
}

export interface CohortMembersParams {
  tenantId: string;
  search?: string;
  cohortId?: string;
  limit?: number;
  offset?: number;
}

export type CohortContentType = "scenario" | "track" | "case";

/** One restricted item. Unrestricted items are absent from the response. */
export interface ContentCohortRestriction {
  contentId: string;
  cohortIds: string[];
}

export interface SetCohortRestrictionsBody {
  tenantId: string;
  contentType: CohortContentType;
  contentId: string;
  /** Empty clears every restriction, returning the item to tenant-wide. */
  cohortIds: string[];
}
