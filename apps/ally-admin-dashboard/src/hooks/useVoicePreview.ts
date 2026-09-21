import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useLazyGetPreviewVoiceQuery } from "@api";

/**
 * Audio auditioning for a TTS voice, shared by every surface that picks one.
 *
 * Replaces two separate implementations that had drifted apart — ScenarioVoices
 * played an object URL through `new Audio()`, LanguageVoiceMapping decoded into
 * a Web Audio buffer — each with its own cache, loading flag and error toast.
 * This is the `new Audio()` one: it needs no AudioContext (browsers suspend
 * those until a gesture and they must be closed to free the hardware), and its
 * `pause()` is genuinely a pause rather than a stop.
 *
 * Caches per (voice, text) rather than per voice, since the same voice is
 * auditioned saying different lines and the old caches would have replayed the
 * first line forever.
 */

export interface UseVoicePreviewResult {
  /** Voice currently playing or loading, for rendering the row's control. */
  playingVoiceId: string | null;
  /** True while that voice's audio is still being fetched. */
  isLoading: boolean;
  /** Play a voice, or pause it when it is the one already playing. */
  play: (voiceId: string, text?: string) => Promise<void>;
  pause: () => void;
}

const cacheKey = (voiceId: string, text?: string) => `${voiceId}::${text?.trim() ?? ""}`;

export const useVoicePreview = (): UseVoicePreviewResult => {
  const [getPreviewVoice] = useLazyGetPreviewVoiceQuery();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCacheRef = useRef<Record<string, string>>({});

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audioRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    stop();
    setPlayingVoiceId(null);
    setIsLoading(false);
  }, [stop]);

  const play = useCallback(
    async (voiceId: string, text?: string) => {
      if (!voiceId) return;
      // Clicking the control of the voice already playing is a pause.
      if (playingVoiceId === voiceId) {
        pause();
        return;
      }
      stop();
      setPlayingVoiceId(voiceId);

      const key = cacheKey(voiceId, text);
      // Only the row being awaited shows a spinner, so a stale response for a
      // voice the user has moved on from cannot revive it.
      const settle = () => setPlayingVoiceId(current => (current === voiceId ? null : current));

      try {
        let url = urlCacheRef.current[key];
        if (!url) {
          setIsLoading(true);
          const buffer = await getPreviewVoice({ voiceId, text }).unwrap();
          url = URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" }));
          urlCacheRef.current[key] = url;
        }
        setIsLoading(false);

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = settle;
        audio.onerror = () => {
          settle();
          toast.error("Failed to play voice preview");
        };
        await audio.play();
      } catch {
        setIsLoading(false);
        settle();
        toast.error("Failed to load voice preview");
      }
    },
    [getPreviewVoice, pause, playingVoiceId, stop],
  );

  // Stop on unmount and release the blobs; a side panel that closes mid-preview
  // would otherwise keep talking, and every audition leaks a URL until reload.
  useEffect(
    () => () => {
      stop();
      // Wrapped rather than passed by reference: forEach would hand
      // revokeObjectURL the index and array as extra arguments.
      Object.values(urlCacheRef.current).forEach(url => URL.revokeObjectURL(url));
      urlCacheRef.current = {};
    },
    [stop],
  );

  return { playingVoiceId, isLoading, play, pause };
};
