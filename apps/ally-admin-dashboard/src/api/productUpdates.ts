import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseApi";

export type ProductUpdateKind = "new" | "improved" | "fixed";
export type ProductUpdateAudience = "public" | "internal";
export type ProductUpdateSurface = "web_app" | "mobile_app" | "admin_console" | "whatsapp";

export interface ProductUpdateSource {
  id: string;
  repo: string;
  prNumber: number | null;
  prUrl: string | null;
  author: string | null;
  subjects: string[];
  mergedAt: string;
  liveAt: string | null;
  deployables: string[];
  gatesLiveness: boolean;
}

export interface ProductUpdate {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** Markdown bullets, shown only in the team digest. */
  teamNotes: string;
  kind: ProductUpdateKind;
  audience: ProductUpdateAudience;
  surfaces: ProductUpdateSurface[];
  area: string;
  /** 0-1. */
  confidence: number;
  hidden: boolean;
  /** On the public changelog right now. */
  isPublic: boolean;
  /** Fields a person saved; the automatic job never rewrites these. */
  editedFields: string[];
  firstMergedAt: string;
  lastMergedAt: string;
  liveAt: string | null;
  publishedAt: string | null;
  decisionReason: string | null;
  model: string | null;
  sourceCount: number;
  /** Only on the single-update endpoint. */
  sources?: ProductUpdateSource[];
}

export type ProductUpdateStatusFilter = "live" | "merged";

export interface GetProductUpdatesParams {
  status?: ProductUpdateStatusFilter;
  audience?: ProductUpdateAudience;
  surface?: ProductUpdateSurface;
  hidden?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GetProductUpdatesResponse {
  updates: ProductUpdate[];
  count: number;
}

export interface ProductUpdatesRunBatch {
  [key: string]: unknown;
}

export interface ProductUpdatesLastRun {
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  ingested: number;
  enriched: number;
  degraded: boolean;
  batches: ProductUpdatesRunBatch[];
  liveness: Record<string, unknown> | null;
  error: string | null;
}

export interface ProductUpdatesStatus {
  enabled: boolean;
  digestConfigured: boolean;
  running: boolean;
  sources: { pending: number; enriched: number; consolidated: number; noise: number };
  updates: { total: number; public: number; waiting: number };
  lastRun: ProductUpdatesLastRun | null;
}

export interface RunProductUpdatesRequest {
  backfill?: boolean;
}

export interface RunProductUpdatesResponse {
  started: boolean;
  reason?: string;
}

/** Only the fields a person changed — the server locks exactly what is sent. */
export type UpdateProductUpdateBody = Partial<
  Pick<
    ProductUpdate,
    "title" | "summary" | "teamNotes" | "kind" | "audience" | "surfaces" | "area" | "hidden"
  >
>;

export const productUpdatesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getProductUpdates: builder.query<GetProductUpdatesResponse, GetProductUpdatesParams>({
      query: params => ({
        url: ApiEndpoints.PRODUCT_UPDATES.LIST,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.PRODUCT_UPDATES],
    }),
    getProductUpdatesStatus: builder.query<ProductUpdatesStatus, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_UPDATES.STATUS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_UPDATES],
    }),
    getProductUpdate: builder.query<ProductUpdate, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_UPDATES.GET(id),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, id) => [{ type: TAG_TYPES.PRODUCT_UPDATES, id }],
    }),
    runProductUpdates: builder.mutation<RunProductUpdatesResponse, RunProductUpdatesRequest | void>(
      {
        query: body => ({
          url: ApiEndpoints.PRODUCT_UPDATES.RUN,
          method: HttpMethod.POST,
          body: body ?? {},
        }),
        // The run is asynchronous; refetching status flips `running` on straight away.
        invalidatesTags: [TAG_TYPES.PRODUCT_UPDATES],
      },
    ),
    updateProductUpdate: builder.mutation<
      ProductUpdate,
      {
        id: string;
        data: UpdateProductUpdateBody;
        /**
         * The table's query args, to move the row before the server answers (the audience
         * toggle). Must be the SAME memoised object the table subscribes with, or the patch
         * lands on a cache entry nobody is rendering.
         */
        listArgs?: GetProductUpdatesParams;
      }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.PRODUCT_UPDATES.UPDATE(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      onQueryStarted: async ({ id, data, listArgs }, { dispatch, queryFulfilled }) => {
        if (!listArgs) return;
        const patch = dispatch(
          productUpdatesAPI.util.updateQueryData("getProductUpdates", listArgs, draft => {
            const row = draft.updates.find(update => update.id === id);
            if (!row) return;
            Object.assign(row, data);
            // The server's definition: public, live and not hidden.
            row.isPublic = row.audience === "public" && !row.hidden && Boolean(row.liveAt);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [TAG_TYPES.PRODUCT_UPDATES],
    }),
  }),
});

export const {
  useGetProductUpdatesQuery,
  useGetProductUpdatesStatusQuery,
  useGetProductUpdateQuery,
  useRunProductUpdatesMutation,
  useUpdateProductUpdateMutation,
} = productUpdatesAPI;
