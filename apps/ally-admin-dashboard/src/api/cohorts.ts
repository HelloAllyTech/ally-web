import { HttpMethod, TAG_TYPES } from "@constants";
import {
  Cohort,
  CohortListResponse,
  CohortMemberListResponse,
  CohortMembersParams,
  CohortContentType,
  ContentCohortRestriction,
  SetCohortRestrictionsBody,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Cohorts — a tenant's own MECE grouping of its users, plus the per-cohort
 * narrowing of content already assigned to that tenant.
 *
 * The tenant admin manages these themselves in the consumer app's Organization
 * Settings; this slice exists so a platform admin can set up or repair an org's
 * grouping from the org-detail page without impersonating them, which is the
 * only way support can currently answer "why can't this person see the course?".
 *
 * **`tenantId` is a PATH segment on every route, including the GETs, and must
 * stay that way.** OwnTenantScopeGuard on the backend resolves the target tenant
 * from route params and the request body only — never the query string — so a
 * `?tenantId=` variant is not merely inconsistent, it is unscoped.
 */
const COHORT_BASE = "/v1/cohorts/tenant";

const cohortsApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCohorts: builder.query<CohortListResponse, { tenantId: string }>({
      query: ({ tenantId }) => `${COHORT_BASE}/${tenantId}`,
      providesTags: [TAG_TYPES.COHORTS],
    }),

    createCohort: builder.mutation<
      Cohort,
      { tenantId: string; name: string; description?: string }
    >({
      query: ({ tenantId, ...body }) => ({
        url: `${COHORT_BASE}/${tenantId}`,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COHORTS, TAG_TYPES.COHORT_MEMBERS],
    }),

    updateCohort: builder.mutation<
      Cohort,
      { tenantId: string; cohortId: string; name?: string; description?: string }
    >({
      query: ({ tenantId, cohortId, ...body }) => ({
        url: `${COHORT_BASE}/${tenantId}/${cohortId}`,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COHORTS, TAG_TYPES.COHORT_MEMBERS],
    }),

    // Deleting a cohort returns its members to Unassigned AND drops every
    // restriction that named it, so all three tags must be invalidated.
    deleteCohort: builder.mutation<{ success: boolean }, { tenantId: string; cohortId: string }>({
      query: ({ tenantId, cohortId }) => ({
        url: `${COHORT_BASE}/${tenantId}/${cohortId}`,
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.COHORTS, TAG_TYPES.COHORT_MEMBERS, TAG_TYPES.COHORT_RESTRICTIONS],
    }),

    getCohortMembers: builder.query<CohortMemberListResponse, CohortMembersParams>({
      query: ({ tenantId, ...params }) => ({
        url: `${COHORT_BASE}/${tenantId}/members`,
        params,
      }),
      providesTags: [TAG_TYPES.COHORT_MEMBERS],
    }),

    // Membership is exclusive, so this MOVES rather than adds. Invalidates the
    // cohort list too, because every move changes two member counts.
    moveCohortMembers: builder.mutation<
      { success: boolean },
      { tenantId: string; userIds: number[]; cohortId: string }
    >({
      query: ({ tenantId, ...body }) => ({
        url: `${COHORT_BASE}/${tenantId}/members`,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COHORT_MEMBERS, TAG_TYPES.COHORTS],
    }),

    // Items with no restriction are ABSENT from this response — that is the
    // "visible to everyone" default, not an empty result.
    getCohortRestrictions: builder.query<
      ContentCohortRestriction[],
      { tenantId: string; contentType: CohortContentType; contentIds?: string }
    >({
      query: ({ tenantId, ...params }) => ({
        url: `${COHORT_BASE}/${tenantId}/restrictions`,
        params,
      }),
      providesTags: [TAG_TYPES.COHORT_RESTRICTIONS],
    }),

    setCohortRestrictions: builder.mutation<{ success: boolean }, SetCohortRestrictionsBody>({
      query: ({ tenantId, ...body }) => ({
        url: `${COHORT_BASE}/${tenantId}/restrictions`,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COHORT_RESTRICTIONS],
    }),
  }),
});

export const {
  useGetCohortsQuery,
  useCreateCohortMutation,
  useUpdateCohortMutation,
  useDeleteCohortMutation,
  useGetCohortMembersQuery,
  useMoveCohortMembersMutation,
  useGetCohortRestrictionsQuery,
  useSetCohortRestrictionsMutation,
} = cohortsApi;
