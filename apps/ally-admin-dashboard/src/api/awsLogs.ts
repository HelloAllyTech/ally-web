import { baseAPI } from "@api";
import { ApiEndpoints } from "@constants";
import { AwsLogsParams, AwsLogsResponse, AwsLogStreamsParams, AwsLogStreamsResponse } from "@types";

const awsLogsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getAwsLogs: builder.query<AwsLogsResponse, AwsLogsParams>({
      query: params => ({
        url: ApiEndpoints.AWS_LOGS.LIST,
        params,
      }),
    }),

    getAwsLogStreams: builder.query<AwsLogStreamsResponse, AwsLogStreamsParams>({
      query: params => ({
        url: ApiEndpoints.AWS_LOGS.STREAMS,
        params,
      }),
    }),
  }),
});

export const { useGetAwsLogsQuery, useGetAwsLogStreamsQuery } = awsLogsAPI;
