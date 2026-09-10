/**
 * Types for the Org. Settings screen (helpline / consumer ADMIN).
 *
 * These mirror the super-admin tenant-settings screen but are scoped to the
 * caller's OWN tenant server-side — the client never sends a tenantId.
 * Source of truth for the tenant shape: ally-be
 * src/tenant/dto/tenant-response.dto.ts.
 */

/** The caller's own tenant, as returned by GET /v1/tenants/self. */
export interface OwnTenant {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  enabledDashboardIds: string[];
  hideRankInCommunity: boolean;
  enableAudioUpload: boolean;
  enableMicrophoneMode: boolean;
  enableDictationMode: boolean;
  userCount?: number;
}

/**
 * Body for PATCH /v1/tenants/self/settings — all fields optional, only the
 * feature toggles the tenant admin is allowed to change.
 */
export interface UpdateOwnTenantSettingsBody {
  enabledDashboardIds?: string[];
  enableMicrophoneMode?: boolean;
  enableAudioUpload?: boolean;
  enableDictationMode?: boolean;
  hideRankInCommunity?: boolean;
}

/** A single field inside a summary section (GET /v1/settings/summary-sections). */
export interface SummarySectionField {
  id: string;
  label: string;
  visible: boolean;
}

/** A summary section with its per-field visibility. */
export interface SummarySection {
  id: string;
  label: string;
  defaultVisibility: boolean;
  enabled: boolean;
  fields: SummarySectionField[];
}

export interface GetSummarySectionsResponse {
  sections: SummarySection[];
}

/* ------------------------------------------------------------------------- *
 * Access-management tabs (Simulations / Path / Cases / Badges).
 *
 * These mirror the super-admin OrganizationDetail tabs but every call is
 * scoped to the caller's OWN tenant server-side. The list endpoints return an
 * `isAssignedToTenant` flag per row when the own tenant id is passed; badges
 * use an `enabled` flag on the tenant-visibility list instead.
 * ------------------------------------------------------------------------- */

/** Shared query params for the scenario/path/case list endpoints. */
export interface OrgAccessListParams {
  tenantId: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
}

/** A scenario row (Simulations tab). */
export interface OrgScenario {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  updatedAt: string;
  status: string;
  isAssignedToTenant: boolean;
}

/**
 * A scenario-path or case row (Path / Cases tabs). The backend returns the
 * same shape for both, including a `totalScenarios` count.
 */
export interface OrgScenarioPath {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  status: string;
  isGlobal: boolean;
  totalScenarios: number;
  updatedAt: string;
  isAssignedToTenant: boolean;
}

/** Generic paginated list envelope for the scenario-family endpoints. */
export interface OrgAccessListResponse<T> {
  data: T[];
  count?: number;
}

/** A badge row as returned by GET /v1/badges/tenants/{tenantId}. */
export interface OrgTenantBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  enabled?: boolean;
  visibilityType?: "PUBLIC" | "PRIVATE";
}

export interface OrgTenantBadgesResponse {
  data: OrgTenantBadge[];
  count?: number;
}

export interface OrgTenantBadgesParams {
  tenantId: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
}

/** Body for POST/DELETE /v1/badges/tenants (assign / unassign a badge). */
export interface OrgBadgeTenantVisibilityBody {
  badgeId: string;
  tenantIds: string[];
}

/* ---------------------------------------------------------------------------
 * Cohorts (own tenant)
 *
 * A cohort is a tenant admin's own grouping of their users, and it is MECE: a
 * user is in exactly one, or in none. "None" is not an absence but a real,
 * targetable audience called Unassigned, which the backend synthesises into the
 * cohort list under the id `UNASSIGNED_COHORT_ID`.
 *
 * Restrictions sit on top of the tenant assignment the other tabs manage, and
 * they only ever SUBTRACT: content with no restriction is visible to every user
 * of the tenant, exactly as before cohorts existed. That is why the restriction
 * map omits unrestricted items entirely rather than listing them with an empty
 * array — absence is the meaningful state, and the UI must render it as
 * "Everyone", never as "nobody".
 * ------------------------------------------------------------------------- */

/**
 * The Unassigned audience. Must equal `UNASSIGNED_COHORT_ID` in the backend's
 * src/cohort/constants/cohort.constants.ts — it is the wire value that stands in
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

/** A course row (Courses tab) — Track 2.0, same shape as the scenario rows. */
export interface OrgTrack {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  status: string;
  totalItems?: number;
  updatedAt: string;
  isAssignedToTenant: boolean;
}
