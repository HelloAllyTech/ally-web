import { ApiEndpoints } from "@constants";
import { User } from "@types";

import { baseAPI } from "./baseAPI";

const TermsAndAgreementAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    checkTermsAndAgreement: builder.query<User, void>({
      query: () => ApiEndpoints.AUTH.GET_USER,
    }),
  }),
});

export const { useCheckTermsAndAgreementQuery } = TermsAndAgreementAPI;
