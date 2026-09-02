import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { UxScanStarted, UxSignalScansResponse } from "@types";

import { baseAPI } from "./baseApi";

/**
 * UX Signals endpoints — start a scan, read the scan log.
 *
 * The scan log is not just history: it is the only place a scan's result ever
 * appears, because starting one returns before there is a result. Callers follow
 * a run by polling `getUxSignalScans` and matching on the returned `scanId`.
 *
 * Note what the mutation does *not* invalidate. Findings and suggestions land in
 * two other queues, but not by the time this responds — invalidating them here
 * would refetch both tables to show exactly what they already showed. The caller
 * invalidates them when it observes the scan reach `completed`, which is the
 * first moment there is anything new to fetch.
 */
export const uxSignalsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Start one scan. Returns 202 as soon as the run is claimed — the work itself
     * takes minutes (seven detector queries over a week of telemetry, then one
     * triage call), which is longer than any gateway between here and the app
     * will hold a connection open. Resolving does not mean the scan finished; it
     * means the scan exists.
     */
    scanUxSignals: builder.mutation<UxScanStarted, void>({
      query: () => ({
        url: ApiEndpoints.UX_SIGNALS.SCAN,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [{ type: TAG_TYPES.UX_SIGNAL_SCANS, id: "LIST" }],
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
