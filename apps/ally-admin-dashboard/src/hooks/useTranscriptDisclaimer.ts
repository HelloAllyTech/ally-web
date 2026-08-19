import { useGetI18nTranslationsQuery } from "@api";

export const TRANSCRIPT_DISCLAIMER_FALLBACK = "Transcription may not always be fully accurate.";

export const useTranscriptDisclaimer = (): string => {
  const { data } = useGetI18nTranslationsQuery({ language: "en", namespace: "transcription" });
  const entry = data?.entries.find(e => e.key === "accuracyDisclaimer");
  return entry?.liveValue || entry?.value || TRANSCRIPT_DISCLAIMER_FALLBACK;
};
