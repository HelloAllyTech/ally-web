import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseApi";

type LegalContentResponse = {
  html: string;
};

type UpdateLegalContentRequest = {
  html: string;
};

export const legalContentAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getTerms: builder.query<LegalContentResponse, void>({
      query: () => ({
        url: ApiEndpoints.SETTINGS.TERMS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SETTINGS],
    }),
    getPrivacy: builder.query<LegalContentResponse, void>({
      query: () => ({
        url: ApiEndpoints.SETTINGS.PRIVACY,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SETTINGS],
    }),
    updateTerms: builder.mutation<{ success: boolean }, UpdateLegalContentRequest>({
      query: body => ({
        url: ApiEndpoints.SETTINGS.TERMS,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SETTINGS],
    }),
    updatePrivacy: builder.mutation<{ success: boolean }, UpdateLegalContentRequest>({
      query: body => ({
        url: ApiEndpoints.SETTINGS.PRIVACY,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SETTINGS],
    }),
    getTermsAndAgreement: builder.query<LegalContentResponse, void>({
      query: () => ({
        url: ApiEndpoints.SETTINGS.TERMS_AND_AGREEMENT,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SETTINGS],
    }),
    updateTermsAndAgreement: builder.mutation<{ success: boolean }, UpdateLegalContentRequest>({
      query: body => ({
        url: ApiEndpoints.SETTINGS.TERMS_AND_AGREEMENT,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SETTINGS],
    }),
  }),
});

export const {
  useGetTermsQuery,
  useGetPrivacyQuery,
  useUpdateTermsMutation,
  useUpdatePrivacyMutation,
  useGetTermsAndAgreementQuery,
  useUpdateTermsAndAgreementMutation,
} = legalContentAPI;
