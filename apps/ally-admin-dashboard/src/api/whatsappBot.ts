import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateKbDocumentRequest,
  CreateKbUploadUrlRequest,
  CreateKbUploadUrlResponse,
  GetKbChunksResponse,
  KbChunk,
  GetKbDocumentsParams,
  GetKbDocumentsResponse,
  KbDocument,
  KbSearchRequest,
  KbSearchResponse,
  KbStats,
  ReplaceKbDocumentContentRequest,
  UpdateKbDocumentRequest,
  CreateWaTemplateRequest,
  GetWaTemplatesResponse,
  TestWaTemplateRequest,
  TestWaTemplateResponse,
  UpdateWaTemplateRequest,
  WaBotSettings,
  WaPreviewRequest,
  WaPreviewResponse,
  WaProviderHealth,
  WaTemplate,
  WaTemplateKind,
  GetWaConversationsParams,
  GetWaConversationsResponse,
  GetWaUnansweredResponse,
  WaAnalyticsBucket,
  WaAnalyticsOverview,
  WaConversationDetail,
  WaCorpusCoverageResponse,
  WaLanguageRow,
  WaUnansweredQuestion,
  WaUnansweredReason,
  WaUnansweredStatus,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * WhatsApp Q&A bot admin endpoints.
 *
 * Injected onto `baseAPI` rather than creating a new api, so no store change is needed. Every tag
 * used here is also registered in baseApi.ts's `tagTypes` — an unregistered tag is silently ignored
 * by RTK Query and the invalidation never fires, which is the documented scar in that file.
 */
const whatsappBotAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    // ---- Corpus documents ----

    getKbDocuments: builder.query<GetKbDocumentsResponse, GetKbDocumentsParams | void>({
      query: (params?: GetKbDocumentsParams) => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENTS,
        method: HttpMethod.GET,
        params: {
          limit: params?.limit ?? 25,
          offset: params?.offset ?? 0,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.sourceType ? { sourceType: params.sourceType } : {}),
          includeArchived: params?.includeArchived ?? false,
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
          ...(params?.sortDir ? { sortDir: params.sortDir } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS],
    }),

    getKbDocument: builder.query<KbDocument, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS],
    }),

    getKbStats: builder.query<KbStats, void>({
      query: () => ({
        url: ApiEndpoints.WHATSAPP_BOT.STATS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_STATS],
    }),

    /** Presigned S3 PUT for a pdf/docx/epub. The browser uploads directly; see DocumentUploadField. */
    createKbUploadUrl: builder.mutation<CreateKbUploadUrlResponse, CreateKbUploadUrlRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_UPLOAD_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Create a document. Returns immediately at status=pending — extraction, chunking and indexing
     * run on a queue, so the corpus list polls until the row reaches a terminal status.
     */
    createKbDocument: builder.mutation<KbDocument, CreateKbDocumentRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENTS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS, TAG_TYPES.WHATSAPP_BOT_STATS],
    }),

    /** Metadata only (title, tags, language). Never triggers a re-index. */
    updateKbDocument: builder.mutation<KbDocument, UpdateKbDocumentRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS],
    }),

    /** Replace a pasted document's body. A no-op server-side when the text is unchanged. */
    replaceKbDocumentContent: builder.mutation<KbDocument, ReplaceKbDocumentContentRequest>({
      query: ({ id, text }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_CONTENT(id),
        method: HttpMethod.PUT,
        body: { text },
      }),
      invalidatesTags: [
        TAG_TYPES.WHATSAPP_BOT_DOCUMENTS,
        TAG_TYPES.WHATSAPP_BOT_DOCUMENT_CHUNKS,
        TAG_TYPES.WHATSAPP_BOT_STATS,
      ],
    }),

    /** Re-chunk and re-index. Also the Retry action for a failed document. */
    reindexKbDocument: builder.mutation<KbDocument, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_REINDEX(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [
        TAG_TYPES.WHATSAPP_BOT_DOCUMENTS,
        TAG_TYPES.WHATSAPP_BOT_DOCUMENT_CHUNKS,
        TAG_TYPES.WHATSAPP_BOT_STATS,
      ],
    }),

    /**
     * Archive: the bot stops retrieving it, but its chunks stay so citations already recorded in
     * the conversation log still resolve. There is no delete — ally-be answers 409 and points here.
     */
    archiveKbDocument: builder.mutation<KbDocument, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_ARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS, TAG_TYPES.WHATSAPP_BOT_STATS],
    }),

    unarchiveKbDocument: builder.mutation<KbDocument, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_UNARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENTS, TAG_TYPES.WHATSAPP_BOT_STATS],
    }),

    /** A document's chunks — literally what the bot can see. */
    getKbDocumentChunks: builder.query<
      GetKbChunksResponse,
      { id: string; limit?: number; offset?: number }
    >({
      query: ({ id, limit, offset }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.DOCUMENT_CHUNKS(id),
        method: HttpMethod.GET,
        params: { limit: limit ?? 50, offset: offset ?? 0 },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_DOCUMENT_CHUNKS],
    }),

    /** Retrieval preview — no LLM call, so thresholds can be tuned without generation cost. */
    searchKbCorpus: builder.mutation<KbSearchResponse, KbSearchRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.SEARCH,
        method: HttpMethod.POST,
        body,
      }),
    }),

    // ---- Keyword templates ----

    getWaTemplates: builder.query<
      GetWaTemplatesResponse,
      { kind?: WaTemplateKind; includeArchived?: boolean } | void
    >({
      query: (params?: { kind?: WaTemplateKind; includeArchived?: boolean }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATES,
        method: HttpMethod.GET,
        params: {
          ...(params?.kind ? { kind: params.kind } : {}),
          includeArchived: params?.includeArchived ?? false,
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_TEMPLATES],
    }),

    createWaTemplate: builder.mutation<WaTemplate, CreateWaTemplateRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_TEMPLATES],
    }),

    updateWaTemplate: builder.mutation<WaTemplate, UpdateWaTemplateRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATE_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_TEMPLATES],
    }),

    /** Archive a template. 403 for a mandatory safety template. */
    archiveWaTemplate: builder.mutation<WaTemplate, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATE_ARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_TEMPLATES],
    }),

    /** Rewrite priorities from an ordered id list; renumbers within each kind band. */
    reorderWaTemplates: builder.mutation<GetWaTemplatesResponse, string[]>({
      query: ids => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATES_REORDER,
        method: HttpMethod.POST,
        body: { ids },
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_TEMPLATES],
    }),

    /** Which rule a message would match. Sends nothing. */
    testWaTemplate: builder.mutation<TestWaTemplateResponse, TestWaTemplateRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.TEMPLATES_TEST,
        method: HttpMethod.POST,
        body,
      }),
    }),

    // ---- Settings ----

    getWaSettings: builder.query<WaBotSettings, void>({
      query: () => ({
        url: ApiEndpoints.WHATSAPP_BOT.SETTINGS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_SETTINGS],
    }),

    updateWaSettings: builder.mutation<WaBotSettings, Partial<WaBotSettings>>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.SETTINGS,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_SETTINGS],
    }),

    getWaProviderHealth: builder.query<WaProviderHealth, void>({
      query: () => ({
        url: ApiEndpoints.WHATSAPP_BOT.PROVIDER_HEALTH,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_SETTINGS],
    }),

    // ---- Preview console ----

    /**
     * Ask a question and get back the exact reply a worker would receive.
     *
     * A mutation rather than a query even though it reads nothing: it must run only when the admin
     * presses Ask. As a query, RTK Query would refetch it on mount and on cache invalidation, which
     * would silently spend generation tokens.
     */
    previewWaAsk: builder.mutation<WaPreviewResponse, WaPreviewRequest>({
      query: body => ({
        url: ApiEndpoints.WHATSAPP_BOT.PREVIEW_ASK,
        method: HttpMethod.POST,
        body,
      }),
    }),

    // ---- Conversation log ----

    getWaConversations: builder.query<GetWaConversationsResponse, GetWaConversationsParams | void>({
      query: (params?: GetWaConversationsParams) => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONVERSATIONS,
        method: HttpMethod.GET,
        params: {
          limit: params?.limit ?? 25,
          offset: params?.offset ?? 0,
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
          ...(params?.handledBy ? { handledBy: params.handledBy } : {}),
          ...(params?.language ? { language: params.language } : {}),
          ...(params?.declinedOnly ? { declinedOnly: true } : {}),
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
          ...(params?.sortDir ? { sortDir: params.sortDir } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    /**
     * The languages present in the log, for its filter.
     *
     * Not the analytics language breakdown: that one is windowed and sits behind a different
     * permission, so it would hand an empty filter to a conversations-only admin and would drop a
     * language nobody used this month while its threads were still listed.
     */
    getWaConversationLanguages: builder.query<string[], void>({
      query: () => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONVERSATION_LANGUAGES,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    getWaConversation: builder.query<WaConversationDetail, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONVERSATION_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    /**
     * Resolve a citation to the exact passage that was quoted.
     *
     * Reads the chunk row rather than the vector index, so a document re-chunked since the answer
     * was sent still resolves: the row holding the quoted text survives even though its vector
     * object was replaced.
     */
    getWaCitation: builder.query<KbChunk, string>({
      query: chunkId => ({
        url: ApiEndpoints.WHATSAPP_BOT.CITATION_BY_CHUNK(chunkId),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    /**
     * Reveal one contact's full phone number.
     *
     * A mutation despite being a read: it must fire only on an explicit click, and every call is
     * logged server-side. As a query, RTK Query would refetch it on mount and on cache
     * invalidation — quietly re-emitting identifiable data nobody asked for again.
     */
    revealWaContactPhone: builder.mutation<{ id: string; phoneE164: string }, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONTACT_REVEAL(id),
        method: HttpMethod.POST,
      }),
    }),

    blockWaContact: builder.mutation<
      { id: string; blocked: boolean },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONTACT_BLOCK(id),
        method: HttpMethod.POST,
        body: { reason },
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    unblockWaContact: builder.mutation<{ id: string; blocked: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.WHATSAPP_BOT.CONTACT_UNBLOCK(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_CONVERSATIONS],
    }),

    // ---- Unanswered queue ----

    getWaUnanswered: builder.query<
      GetWaUnansweredResponse,
      {
        limit?: number;
        offset?: number;
        status?: WaUnansweredStatus;
        reason?: WaUnansweredReason;
        sortBy?: string;
        sortDir?: "asc" | "desc";
      } | void
    >({
      query: (params?: {
        limit?: number;
        offset?: number;
        status?: WaUnansweredStatus;
        reason?: WaUnansweredReason;
        sortBy?: string;
        sortDir?: "asc" | "desc";
      }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.UNANSWERED,
        method: HttpMethod.GET,
        params: {
          limit: params?.limit ?? 25,
          offset: params?.offset ?? 0,
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.reason ? { reason: params.reason } : {}),
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
          ...(params?.sortDir ? { sortDir: params.sortDir } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_UNANSWERED],
    }),

    updateWaUnanswered: builder.mutation<
      WaUnansweredQuestion,
      {
        id: string;
        status?: WaUnansweredStatus;
        assignedTo?: number | null;
        resolutionNote?: string;
        linkedDocumentId?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.UNANSWERED_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_UNANSWERED],
    }),

    /**
     * Write the answer as a corpus document and resolve the gap in one action.
     *
     * Invalidates the corpus tag too: the new document must appear in the corpus list, which is
     * where its ingest status is watched.
     */
    createDocumentFromWaUnanswered: builder.mutation<
      { question: WaUnansweredQuestion; document: KbDocument },
      { id: string; title: string; text: string; tags?: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.UNANSWERED_CREATE_DOCUMENT(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.WHATSAPP_BOT_UNANSWERED, TAG_TYPES.WHATSAPP_BOT_DOCUMENTS],
    }),

    // ---- Usage dashboard ----

    getWaAnalyticsOverview: builder.query<
      WaAnalyticsOverview,
      { from?: string; to?: string } | void
    >({
      query: (params?: { from?: string; to?: string }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.ANALYTICS_OVERVIEW,
        method: HttpMethod.GET,
        params: {
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_ANALYTICS],
    }),

    getWaAnalyticsTimeseries: builder.query<
      WaAnalyticsBucket[],
      { from?: string; to?: string } | void
    >({
      query: (params?: { from?: string; to?: string }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.ANALYTICS_TIMESERIES,
        method: HttpMethod.GET,
        params: {
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_ANALYTICS],
    }),

    getWaAnalyticsLanguages: builder.query<WaLanguageRow[], { from?: string; to?: string } | void>({
      query: (params?: { from?: string; to?: string }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.ANALYTICS_LANGUAGES,
        method: HttpMethod.GET,
        params: {
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_ANALYTICS],
    }),

    getWaCorpusCoverage: builder.query<
      WaCorpusCoverageResponse,
      { from?: string; to?: string } | void
    >({
      query: (params?: { from?: string; to?: string }) => ({
        url: ApiEndpoints.WHATSAPP_BOT.ANALYTICS_CORPUS_COVERAGE,
        method: HttpMethod.GET,
        params: {
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
        },
      }),
      providesTags: [TAG_TYPES.WHATSAPP_BOT_ANALYTICS],
    }),
  }),
});

export const {
  useGetKbDocumentsQuery,
  useGetKbDocumentQuery,
  useGetKbStatsQuery,
  useCreateKbUploadUrlMutation,
  useCreateKbDocumentMutation,
  useUpdateKbDocumentMutation,
  useReplaceKbDocumentContentMutation,
  useReindexKbDocumentMutation,
  useArchiveKbDocumentMutation,
  useUnarchiveKbDocumentMutation,
  useGetKbDocumentChunksQuery,
  useSearchKbCorpusMutation,
  useGetWaTemplatesQuery,
  useCreateWaTemplateMutation,
  useUpdateWaTemplateMutation,
  useArchiveWaTemplateMutation,
  useReorderWaTemplatesMutation,
  useTestWaTemplateMutation,
  useGetWaSettingsQuery,
  useUpdateWaSettingsMutation,
  useGetWaProviderHealthQuery,
  usePreviewWaAskMutation,
  useGetWaConversationsQuery,
  useGetWaConversationQuery,
  useGetWaConversationLanguagesQuery,
  useGetWaCitationQuery,
  useRevealWaContactPhoneMutation,
  useBlockWaContactMutation,
  useUnblockWaContactMutation,
  useGetWaUnansweredQuery,
  useUpdateWaUnansweredMutation,
  useCreateDocumentFromWaUnansweredMutation,
  useGetWaAnalyticsOverviewQuery,
  useGetWaAnalyticsTimeseriesQuery,
  useGetWaAnalyticsLanguagesQuery,
  useGetWaCorpusCoverageQuery,
} = whatsappBotAPI;
