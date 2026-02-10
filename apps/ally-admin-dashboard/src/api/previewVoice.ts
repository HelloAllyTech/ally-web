import { aiAPI } from "@src/api/aiAPI";
import { GetPreviewVoiceBody, PreviewVoiceResponse } from "@src/types";

const previewVoiceAPI = aiAPI.injectEndpoints({
  endpoints: builder => ({
    getPreviewVoice: builder.mutation<PreviewVoiceResponse, GetPreviewVoiceBody>({
      query: body => ({
        url: "/v1/voice-preview/generate",
        method: "POST",
        body,
        responseHandler: async response => {
          return response.arrayBuffer();
        },
      }),
    }),
  }),
});

export const { useGetPreviewVoiceMutation } = previewVoiceAPI;
