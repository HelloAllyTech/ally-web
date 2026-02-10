type PreviewVoiceResponse = ArrayBuffer;

interface GetPreviewVoiceBody {
  provider: string;
  config: {
    voice_id?: string;
    model?: string;
    speaker?: string;
    voice_name?: string;
    gender?: string;
    instant_mode?: boolean;
  };
  text?: string;
  language_code?: string;
}

export type { PreviewVoiceResponse, GetPreviewVoiceBody };
