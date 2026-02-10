import { aiAPI } from "@src/api/aiAPI";
import { ApiEndpoints, HttpMethod } from "@src/constants";
import { GetPreviewVoiceBody, PreviewVoiceResponse } from "@src/types";

const previewVoiceAPI = aiAPI.injectEndpoints({
  endpoints: builder => ({
    getPreviewVoice: builder.mutation<PreviewVoiceResponse, GetPreviewVoiceBody>({
      query: body => ({
        url: ApiEndpoints.AI.GET_PREVIEW_VOICE,
        method: HttpMethod.POST,
        body,
        responseHandler: async response => {
          return response.arrayBuffer();
        },
      }),
    }),
  }),
});

export const { useGetPreviewVoiceMutation } = previewVoiceAPI;
