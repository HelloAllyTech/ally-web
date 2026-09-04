import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, ROUTES, TAG_TYPES, en } from "@constants";
import { RefreshResponse } from "@types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const handleLogout = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED);

  window.location.href = ROUTES.LOGIN;
};

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * This function wraps the base query to handle authentication token refresh.
 * When a 401 error is received, it attempts to refresh the access token using
 * the refresh token. If successful, it retries the original request.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  store,
  extraOptions,
) => {
  try {
    let result;
    try {
      result = await baseQuery(args, store, extraOptions);
    } catch (error) {
      // The raw error (often a bare "TypeError: Failed to fetch") used to be
      // interpolated straight into the toast — a technical string with no
      // action the user can take. Keep the detail in the console for
      // debugging; show only the curated message.
      // eslint-disable-next-line no-console
      console.error(en.error.apiRequestFailed, error);
      toast.error(en.error.apiRequestFailed);
      throw error;
    }

    if (result.error && result.error.status === 401) {
      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);

      if (!accessToken || !refreshToken) {
        handleLogout();
        return result;
      }

      try {
        const refreshResult = await baseQuery(
          { url: ApiEndpoints.AUTH.REFRESH, method: HttpMethod.POST, body: { refreshToken } },
          store,
          extraOptions,
        );

        if (!refreshResult.data) {
          handleLogout();
          throw new Error(en.error.noRefreshDataReceived);
        }

        const tokens = refreshResult.data as RefreshResponse;

        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, tokens.accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, tokens.refreshToken);

        try {
          result = await baseQuery(args, store, extraOptions);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(en.error.tokenRefreshFailed, error);
          toast.error(en.error.tokenRefreshFailed);
          throw error;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(en.error.tokenRefreshFailed, error);
        toast.error(en.error.tokenRefreshFailed);
        handleLogout();
        return result;
      }
    } else if (result.error && result.error.status === 403) {
      // Previously fell straight through with no handling at all — every
      // caller had to remember to check `isError` on its own to learn a
      // request was forbidden, which is exactly what let AI Lab's list tabs
      // render "forbidden" identically to "genuinely empty" (see
      // AiLabErrorState / the AI Lab tabs). One consistent toast here means
      // every endpoint gets a permission message even when the calling
      // component only checks `isError`.
      toast.error(en.error.forbidden);
    }

    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(en.error.apiRequestFailed, error);
    toast.error(en.error.apiRequestFailed);
    return { error: { status: "FETCH_ERROR", error: String(error) } };
  }
};

export const baseAPI = createApi({
  reducerPath: "baseAPI",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    TAG_TYPES.USERS,
    TAG_TYPES.TENANTS,
    TAG_TYPES.SESSION_EVENTS,
    TAG_TYPES.SESSION_EVENT_TAGS,
    TAG_TYPES.SIMULATION,
    TAG_TYPES.SCENARIO_VERSIONS,
    TAG_TYPES.SIMULATION_EVENTS,
    TAG_TYPES.SIMULATION_PATHS,
    TAG_TYPES.SCENARIO_PATHS,
    TAG_TYPES.EACH_SESSION,
    TAG_TYPES.TRIGGER_WARNINGS,
    TAG_TYPES.LANGUAGE_GLOSSARY,
    TAG_TYPES.GLOSSARY_ADHERENCE,
    TAG_TYPES.HELPER_TAGS,
    TAG_TYPES.FILLER_TAGS,
    TAG_TYPES.COMPETENCIES,
    TAG_TYPES.COMPETENCY_BEHAVIOURS,
    TAG_TYPES.AGENT_TEST_CASES,
    TAG_TYPES.ADMIN_TENANTS,
    TAG_TYPES.CUSTOM_FIELD_TYPES,
    TAG_TYPES.CUSTOM_FIELDS_ENABLED,
    TAG_TYPES.CHARACTER_LIBRARY_ENABLED,
    TAG_TYPES.PROGRESS_DASHBOARD_ENABLED,
    TAG_TYPES.SCRIBE_NOTE_CREATION_ENABLED,
    TAG_TYPES.I18N_TRANSLATIONS,
    TAG_TYPES.SETTINGS,
    TAG_TYPES.USER_PREFERENCES,
    TAG_TYPES.ROLEPLAY_SESSION_LOGS,
    TAG_TYPES.COHORTS,
    TAG_TYPES.COHORT_MEMBERS,
    TAG_TYPES.COHORT_RESTRICTIONS,
    TAG_TYPES.COMFORT_AUDIO_LIBRARY,
    TAG_TYPES.WHATSAPP_BOT_DOCUMENTS,
    TAG_TYPES.WHATSAPP_BOT_DOCUMENT_CHUNKS,
    TAG_TYPES.WHATSAPP_BOT_STATS,
    TAG_TYPES.WHATSAPP_BOT_TEMPLATES,
    TAG_TYPES.WHATSAPP_BOT_SETTINGS,
    TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS,
    TAG_TYPES.WHATSAPP_BOT_UNANSWERED,
    TAG_TYPES.WHATSAPP_BOT_ANALYTICS,
    TAG_TYPES.TRACKS_V2,
    TAG_TYPES.BLOGS,
    TAG_TYPES.IMAGE_LIBRARY,
    TAG_TYPES.SUPER_DUPER_ADMINS,
    TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
    TAG_TYPES.PRODUCT_ROADMAP_VOTE_BUDGET,
    TAG_TYPES.PRODUCT_ROADMAP_FACETS,
    TAG_TYPES.PRODUCT_ROADMAP_GOALS,
    TAG_TYPES.PRODUCT_ROADMAP_STRATEGY_GOALS,
    TAG_TYPES.PRODUCT_ROADMAP_RANK_WEIGHTS,
    TAG_TYPES.PRODUCT_ROADMAP_GOAL_IMPACT,
    TAG_TYPES.PRODUCT_ROADMAP_OWNERS,
    TAG_TYPES.PRODUCT_ROADMAP_COMMENTS,
    TAG_TYPES.PRODUCT_ROADMAP_INTERVIEWS,
    TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS,
    TAG_TYPES.PRODUCT_ROADMAP_VIEW_ORDER,
    TAG_TYPES.AI_LAB_SKILLS,
    TAG_TYPES.AI_LAB_VARIABLES,
    TAG_TYPES.AI_LAB_VALUES,
    TAG_TYPES.AI_LAB_RUNS,
    TAG_TYPES.AI_LAB_EVALUATORS,
    TAG_TYPES.AI_LAB_ASSIGNMENTS,
    TAG_TYPES.AI_LAB_AUTO_EVALS,
    TAG_TYPES.AI_LAB_QUESTION_SETS,
    TAG_TYPES.ANALYTICS_SUGGESTIONS,
    TAG_TYPES.ANALYTICS_CHART_PREFERENCES,
    TAG_TYPES.BUG_HUNTER_SETTINGS,
    TAG_TYPES.BUG_HUNTER_RUNS,
    TAG_TYPES.BUG_HUNTER_FINDINGS,
    TAG_TYPES.UX_SIGNAL_SCANS,
    TAG_TYPES.BUILDER_SESSIONS,
    TAG_TYPES.BUILDER_SESSION,
    TAG_TYPES.BUILDER_PRD_VERSIONS,
    TAG_TYPES.BUILDER_SETTINGS,
    TAG_TYPES.BUILDER_NOTIFICATIONS,
    TAG_TYPES.BUILDER_LESSONS,
    TAG_TYPES.BUILDER_EXEMPLARS,
    // These four were used in providesTags/invalidatesTags but never declared
    // here, so RTK Query silently ignored them and the invalidation never
    // fired — saving a voice or a config left the list showing stale data
    // until something else forced a refetch.
    TAG_TYPES.SCENARIO_VOICES,
    TAG_TYPES.STT_CONFIGS,
    TAG_TYPES.LLM_CONFIGS,
    TAG_TYPES.SCENARIO_LANGUAGES,
    TAG_TYPES.LLM_MODEL_CATALOG,
    TAG_TYPES.LLM_MODELS,
    TAG_TYPES.MY_FEATURE_TOGGLES,
    TAG_TYPES.FEATURE_TOGGLE_REGISTRY,
    TAG_TYPES.USER_FEATURE_TOGGLES,
    TAG_TYPES.PLATFORM_ADMINS,
    TAG_TYPES.MOBILE_RELEASE_RUNS,
    TAG_TYPES.MIN_APP_VERSION,
  ],
  endpoints: () => ({}),
});

export { baseQuery, baseQueryWithReauth };
