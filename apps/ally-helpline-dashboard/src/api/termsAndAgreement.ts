import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

const TermsAndAgreementAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    checkTermsAndAgreement: builder.query<{ success: boolean }, void>({
      query: () => ApiEndpoints.AUTH.GET_USER,
    }),
    putTermsAndAgreement: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: ApiEndpoints.AUTH.GET_USER,
        method: HttpMethod.PUT,
      }),
    }),
  }),
});

export const { useLazyCheckTermsAndAgreementQuery, usePutTermsAndAgreementMutation } =
  TermsAndAgreementAPI;
