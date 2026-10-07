import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  ConfigureSkillExperimentRequest,
  ConnectedSkillRow,
  SkillExperimentDetail,
  SkillExperimentObservationsResponse,
} from "@types";

import { baseAPI } from "./baseApi";
import { simulationStudioAPI } from "./simulationStudio";

/** Tag for one skill's experiment; the list uses the bare tag. */
const detailTag = (promptId: string) => ({
  type: TAG_TYPES.SKILL_EXPERIMENTS,
  id: promptId,
});

/**
 * Every action returns the refreshed detail, so the drawer never needs a second request.
 * `url` is a thunk on purpose: `ApiEndpoints` must be read when a request is made, not when
 * this module loads — suites that mock `@constants` wholesale import this slice via `@api`.
 */
const action = (url: (promptId: string) => string) => ({
  query: (promptId: string) => ({ url: url(promptId), method: HttpMethod.POST }),
  invalidatesTags: (_r: unknown, _e: unknown, promptId: string) => [
    TAG_TYPES.SKILL_EXPERIMENTS,
    detailTag(promptId),
  ],
});

export const skillExperimentsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getSkillExperiments: builder.query<ConnectedSkillRow[], void>({
      query: () => ({ url: ApiEndpoints.SKILL_EXPERIMENTS.LIST, method: HttpMethod.GET }),
      providesTags: [TAG_TYPES.SKILL_EXPERIMENTS],
    }),
    getSkillExperiment: builder.query<SkillExperimentDetail, string>({
      query: promptId => ({
        url: ApiEndpoints.SKILL_EXPERIMENTS.BY_PROMPT(promptId),
        method: HttpMethod.GET,
      }),
      providesTags: (_r, _e, promptId) => [detailTag(promptId)],
    }),
    configureSkillExperiment: builder.mutation<
      SkillExperimentDetail,
      { promptId: string; data: ConfigureSkillExperimentRequest }
    >({
      query: ({ promptId, data }) => ({
        url: ApiEndpoints.SKILL_EXPERIMENTS.BY_PROMPT(promptId),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: (_r, _e, { promptId }) => [TAG_TYPES.SKILL_EXPERIMENTS, detailTag(promptId)],
    }),
    startSkillExperiment: builder.mutation<SkillExperimentDetail, string>(
      action(id => ApiEndpoints.SKILL_EXPERIMENTS.START(id)),
    ),
    stopSkillExperiment: builder.mutation<SkillExperimentDetail, string>(
      action(id => ApiEndpoints.SKILL_EXPERIMENTS.STOP(id)),
    ),
    resumeSkillExperiment: builder.mutation<SkillExperimentDetail, string>(
      action(id => ApiEndpoints.SKILL_EXPERIMENTS.RESUME(id)),
    ),
    applySkillExperiment: builder.mutation<SkillExperimentDetail, string>({
      ...action(id => ApiEndpoints.SKILL_EXPERIMENTS.APPLY(id)),
      /**
       * Apply writes a new version of the skill's text. The System Skills list
       * caches that text, and its PROMPTS tag is not registered on baseAPI, so
       * no invalidation would reach it — an admin opening the skill straight
       * after could auto-save the stale text over the winner. Re-fetch every
       * cached prompt list instead.
       */
      async onQueryStarted(_promptId, { dispatch, getState, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          return;
        }
        const state = getState() as Parameters<
          typeof simulationStudioAPI.util.selectCachedArgsForQuery
        >[0];
        for (const args of simulationStudioAPI.util.selectCachedArgsForQuery(state, "getPrompts")) {
          dispatch(
            simulationStudioAPI.endpoints.getPrompts.initiate(args, {
              forceRefetch: true,
              subscribe: false,
            }),
          );
        }
      },
    }),
    getSkillExperimentObservations: builder.query<
      SkillExperimentObservationsResponse,
      { promptId: string; variantId?: string; limit?: number; offset?: number }
    >({
      query: ({ promptId, ...params }) => ({
        url: ApiEndpoints.SKILL_EXPERIMENTS.OBSERVATIONS(promptId),
        method: HttpMethod.GET,
        params,
      }),
      providesTags: (_r, _e, { promptId }) => [detailTag(promptId)],
    }),
  }),
});

export const {
  useGetSkillExperimentsQuery,
  useGetSkillExperimentQuery,
  useConfigureSkillExperimentMutation,
  useStartSkillExperimentMutation,
  useStopSkillExperimentMutation,
  useResumeSkillExperimentMutation,
  useApplySkillExperimentMutation,
  useGetSkillExperimentObservationsQuery,
} = skillExperimentsAPI;
