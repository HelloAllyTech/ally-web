import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  DynamicI18nAuditLog,
  DynamicI18nDiffResponse,
  DynamicI18nManifest,
  DynamicI18nStatus,
  DynamicI18nTranslationsResponse,
} from "@types";

import { baseAPI } from "./baseApi";

type TranslationQuery = {
  language: string;
  namespace: string;
  search?: string;
};

export const dynamicI18nAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getI18nStatus: builder.query<DynamicI18nStatus, void>({
      query: () => ({
        url: ApiEndpoints.I18N.STATUS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    getI18nTranslations: builder.query<DynamicI18nTranslationsResponse, TranslationQuery>({
      query: params => ({
        url: ApiEndpoints.I18N.TRANSLATIONS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    updateI18nTranslations: builder.mutation<
      { language: string; namespace: string; changedKeys: string[] },
      { language: string; namespace: string; key: string; value: string }
    >({
      query: body => ({
        url: ApiEndpoints.I18N.TRANSLATIONS,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    getI18nDiff: builder.query<DynamicI18nDiffResponse, TranslationQuery>({
      query: params => ({
        url: ApiEndpoints.I18N.DIFF,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    publishI18n: builder.mutation<DynamicI18nManifest, { note?: string } | void>({
      query: body => ({
        url: ApiEndpoints.I18N.PUBLISH,
        method: HttpMethod.POST,
        body: body ?? {},
      }),
      invalidatesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    rollbackI18n: builder.mutation<DynamicI18nManifest, { version: number; note?: string }>({
      query: body => ({
        url: ApiEndpoints.I18N.ROLLBACK,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
    getI18nAuditLog: builder.query<DynamicI18nAuditLog[], { limit?: number; offset?: number }>({
      query: params => ({
        url: ApiEndpoints.I18N.AUDIT_LOG,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.I18N_TRANSLATIONS],
    }),
  }),
});

export const {
  useGetI18nStatusQuery,
  useGetI18nTranslationsQuery,
  useUpdateI18nTranslationsMutation,
  useGetI18nDiffQuery,
  usePublishI18nMutation,
  useRollbackI18nMutation,
  useGetI18nAuditLogQuery,
} = dynamicI18nAPI;
