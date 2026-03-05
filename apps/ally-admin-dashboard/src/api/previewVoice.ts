import { ApiEndpoints, HttpMethod } from "@src/constants";
import { GetPreviewVoiceBody, PreviewVoiceResponse } from "@src/types";

import { baseAPI } from "./baseApi";

const previewVoiceAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPreviewVoice: builder.query<PreviewVoiceResponse, GetPreviewVoiceBody>({
      query: body => ({
        url: ApiEndpoints.AI.GET_PREVIEW_VOICE(body.voiceId),
        method: HttpMethod.GET,
        responseHandler: async (response: Response) => response.arrayBuffer(),
        validateStatus: (response: Response) => response.status === 200 || response.status === 304,
      }),
    }),
  }),
});

export const { useLazyGetPreviewVoiceQuery } = previewVoiceAPI;
