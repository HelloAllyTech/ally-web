type PreviewVoiceResponse = ArrayBuffer;

interface GetPreviewVoiceBody {
  voiceId: string;
  /**
   * What the voice should say. Optional: the backend falls back to a generic
   * per-language sample ("Hi this is a preview of my voice."). Pass the
   * character's or client's own words instead wherever they are known — the
   * point of an audition is to hear the real line, not a stock one. Capped at
   * 500 chars server-side (PreviewRequestDto).
   */
  text?: string;
}

export type { PreviewVoiceResponse, GetPreviewVoiceBody };
