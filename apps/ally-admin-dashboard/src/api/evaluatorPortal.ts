import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { ApiEndpoints, HttpMethod, LOCAL_STORAGE_KEYS, ROUTES, TAG_TYPES } from "@constants";
import {
  EvaluatorAssignmentDetail,
  EvaluatorAssignmentListItem,
  EvaluatorLoginResponse,
  SubmitEvaluationAnswerInput,
} from "@types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const clearEvaluatorSession = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.EVALUATOR_ACCESS_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.EVALUATOR_EMAIL);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.EVALUATOR_ID);
};

const rawEvaluatorBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: headers => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATOR_ACCESS_TOKEN);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * 401 → the evaluator session is gone (expired token or a regenerated
 * password). Clear it and send them back to the /evaluate login. Login
 * itself is excluded so a wrong password shows an error instead of a reload.
 */
const evaluatorBaseQuery: typeof rawEvaluatorBaseQuery = async (args, api, extraOptions) => {
  const result = await rawEvaluatorBaseQuery(args, api, extraOptions);
  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status === 401 && url !== ApiEndpoints.AI_LAB.EVAL_LOGIN) {
    clearEvaluatorSession();
    window.location.href = ROUTES.EVALUATE;
  }
  return result;
};

/**
 * Standalone RTK Query api for the evaluator micro-app (/evaluate). Uses the
 * EVALUATOR token — completely separate from the admin session in baseAPI.
 */
export const evaluatorAPI = createApi({
  reducerPath: "evaluatorAPI",
  baseQuery: evaluatorBaseQuery,
  tagTypes: [TAG_TYPES.EVAL_ASSIGNMENTS],
  endpoints: builder => ({
    evaluatorLogin: builder.mutation<EvaluatorLoginResponse, { email: string; password: string }>({
      query: body => ({
        url: ApiEndpoints.AI_LAB.EVAL_LOGIN,
        method: HttpMethod.POST,
        body,
      }),
    }),
    getMyAssignments: builder.query<{ items: EvaluatorAssignmentListItem[] }, void>({
      query: () => ({
        url: ApiEndpoints.AI_LAB.EVAL_ASSIGNMENTS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.EVAL_ASSIGNMENTS],
    }),
    getMyAssignment: builder.query<EvaluatorAssignmentDetail, string>({
      query: id => ({
        url: ApiEndpoints.AI_LAB.EVAL_ASSIGNMENT_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.EVAL_ASSIGNMENTS, id }],
    }),
    submitEvaluation: builder.mutation<
      EvaluatorAssignmentDetail,
      { assignmentId: string; answers: SubmitEvaluationAnswerInput[] }
    >({
      query: ({ assignmentId, answers }) => ({
        url: ApiEndpoints.AI_LAB.EVAL_ASSIGNMENT_SUBMIT(assignmentId),
        method: HttpMethod.POST,
        body: { answers },
      }),
      invalidatesTags: (result, error, { assignmentId }) => [
        TAG_TYPES.EVAL_ASSIGNMENTS,
        { type: TAG_TYPES.EVAL_ASSIGNMENTS, id: assignmentId },
      ],
    }),
  }),
});

export const {
  useEvaluatorLoginMutation,
  useGetMyAssignmentsQuery,
  useGetMyAssignmentQuery,
  useSubmitEvaluationMutation,
} = evaluatorAPI;
