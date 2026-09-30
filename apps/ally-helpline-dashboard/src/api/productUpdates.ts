import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

export type ProductUpdateKind = "new" | "improved" | "fixed";

export type ProductUpdateSurface = "web_app" | "mobile_app" | "admin_console" | "whatsapp";

/** One feature-level update on the public changelog — already live in production. */
export type PublicProductUpdate = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: ProductUpdateKind;
  surfaces: ProductUpdateSurface[];
  area: string;
  /** When it reached production — the date the changelog shows. */
  liveAt: string;
};

type GetPublicProductUpdatesResponse = { updates: PublicProductUpdate[]; count: number };

export type GetPublicProductUpdatesArgs = {
  offset?: number;
  limit?: number;
  surface?: ProductUpdateSurface;
};

const productUpdatesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPublicProductUpdates: builder.query<
      GetPublicProductUpdatesResponse,
      GetPublicProductUpdatesArgs | void
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.PRODUCT_UPDATES.GET_PUBLIC,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
    }),
  }),
});

export const { useGetPublicProductUpdatesQuery } = productUpdatesAPI;
