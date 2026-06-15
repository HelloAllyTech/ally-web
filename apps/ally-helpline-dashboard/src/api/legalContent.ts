import { ApiEndpoints, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseAPI";

type LegalContentResponse = {
  html: string;
};

const legalContentAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTerms: builder.query<LegalContentResponse, void>({
      query: () => ({ url: ApiEndpoints.SETTINGS.TERMS }),
      providesTags: [{ type: TAG_TYPES.SETTINGS, id: "TERMS" }],
    }),
    getPrivacy: builder.query<LegalContentResponse, void>({
      query: () => ({ url: ApiEndpoints.SETTINGS.PRIVACY }),
      providesTags: [{ type: TAG_TYPES.SETTINGS, id: "PRIVACY" }],
    }),
  }),
});

export const { useGetTermsQuery, useGetPrivacyQuery } = legalContentAPI;
