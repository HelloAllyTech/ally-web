import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { UxScanOutcome, UxSignalScansResponse } from "@types";

import { baseAPI } from "./baseApi";

/**
 * UX Signals endpoints — trigger a scan, read the scan log.
 *
 * A scan invalidates the two queues it writes into, not just its own log:
 * findings land in the Bug Hunter table and suggestions in the Analytics
 * Suggestions queue, so an admin who scans and stays on the page must see what
 * arrived. Without these invalidations the scan reports "3 findings" to a table
 * that still shows the old rows.
 */
export const uxSignalsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * One scan. Slow by nature (up to ~2 minutes: seven detector queries over a
     * week of telemetry, then one triage call), so callers must show a bounded
     * progress narrative rather than an open-ended spinner.
     */
    scanUxSignals: builder.mutation<UxScanOutcome, void>({
      query: () => ({
        url: ApiEndpoints.UX_SIGNALS.SCAN,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [
        { type: TAG_TYPES.UX_SIGNAL_SCANS, id: "LIST" },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
        { type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" },
      ],
    }),

    getUxSignalScans: builder.query<UxSignalScansResponse, { limit?: number }>({
      query: ({ limit }) => ({
        url: ApiEndpoints.UX_SIGNALS.SCANS,
        method: HttpMethod.GET,
        // Omitted rather than sent empty: RTK keys the cache on the arg object,
        // so an explicit `undefined` would fragment it across identical requests.
        params: limit ? { limit } : {},
      }),
      providesTags: [{ type: TAG_TYPES.UX_SIGNAL_SCANS, id: "LIST" }],
    }),
  }),
});

export const { useScanUxSignalsMutation, useGetUxSignalScansQuery } = uxSignalsAPI;
