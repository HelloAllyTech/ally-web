import { ApiEndpoints, HttpMethod } from "@src/constants";
import { GetPreviewVoiceBody, PreviewVoiceResponse } from "@src/types";

import { baseAPI } from "./baseApi";

export const previewVoiceAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPreviewVoice: builder.query<PreviewVoiceResponse, GetPreviewVoiceBody>({
      query: body => ({
        url: ApiEndpoints.AI.GET_PREVIEW_VOICE(body.voiceId),
        method: HttpMethod.GET,
        // `text` has been accepted by /voice-preview/generate since it shipped;
        // nothing sent it, so every audition said "Hi this is a preview of my
        // voice." Omitted entirely when blank so the backend keeps choosing
        // its per-language default.
        ...(body.text?.trim() ? { params: { text: body.text.trim() } } : {}),
        responseHandler: async (response: Response) => response.arrayBuffer(),
        validateStatus: (response: Response) => response.status === 200 || response.status === 304,
      }),
    }),
  }),
});

export const { useLazyGetPreviewVoiceQuery } = previewVoiceAPI;
