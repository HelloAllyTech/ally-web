import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

const TermsAndAgreementAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    checkTermsAndAgreement: builder.query<{ success: boolean }, { token?: string } | void>({
      query: args => ({
        url: ApiEndpoints.AUTH.TERMS_AND_AGREEMENT,
        method: HttpMethod.GET,
        headers:
          args && "token" in args && args.token
            ? { authorization: `Bearer ${args.token}` }
            : undefined,
      }),
    }),
    putTermsAndAgreement: builder.mutation<{ success: boolean }, { token?: string } | void>({
      query: args => ({
        url: ApiEndpoints.AUTH.TERMS_AND_AGREEMENT,
        method: HttpMethod.PUT,
        headers:
          args && "token" in args && args.token
            ? { authorization: `Bearer ${args.token}` }
            : undefined,
      }),
    }),
  }),
});

export const { useLazyCheckTermsAndAgreementQuery, usePutTermsAndAgreementMutation } =
  TermsAndAgreementAPI;
