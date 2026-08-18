/**
 * "Report a problem" — any logged-in app user can file one, not just admin staff.
 * No cache tags: there is deliberately no "my reports" list to invalidate.
 */
import { ApiEndpoints, HttpMethod } from "@constants";
import { CreateBugReportBody, CreateBugReportResponse } from "@types";

import { baseAPI } from "./baseAPI";

const bugReportAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    createBugReport: builder.mutation<CreateBugReportResponse, CreateBugReportBody>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.CREATE_BUG_REPORT,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const { useCreateBugReportMutation } = bugReportAPI;
