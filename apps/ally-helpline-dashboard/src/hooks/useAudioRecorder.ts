import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

export type RecorderError = "permission" | "unsupported" | "generic" | null;

export interface UseAudioRecorderResult {
  status: RecorderStatus;
  isRecording: boolean;
  isPaused: boolean;
  /** Elapsed recorded time in milliseconds (excludes paused spans). */
  durationMs: number;
  /** The finished recording, available once status is "stopped". */
  blob: Blob | null;
  error: RecorderError;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Discard the recording and release the microphone. */
  reset: () => void;
}

// MediaRecorder produces webm/opus in Chromium/Firefox and mp4 in Safari.
// We never ask for wav — browsers don't record it — and let the server-side
// STT auto-detect the container.
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const pickMimeType = (): string => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return PREFERRED_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
};

/**
 * Records microphone audio with start/pause/resume/stop controls, tracks
 * elapsed duration, and cleans up the media stream on stop/unmount. Designed
 * for the manual scribe-note dictation flow: the produced Blob is handed to the
 * "Generate notes" call and then discarded (never uploaded until requested).
 */
export const useAudioRecorder = (): UseAudioRecorderResult => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<RecorderError>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  // Set while reset() tears down an active recorder, so the async `onstop`
  // that stop() triggers doesn't resurrect the "stopped" state / a stale blob.
  const resettingRef = useRef(false);

  // Duration bookkeeping: accumulate completed spans, plus the live span.
  const accumulatedRef = useRef(0);
  const spanStartRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    spanStartRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const live = spanStartRef.current ? Date.now() - spanStartRef.current : 0;
      setDurationMs(accumulatedRef.current + live);
    }, 250);
  }, [clearTick]);

  const freezeTick = useCallback(() => {
    if (spanStartRef.current != null) {
      accumulatedRef.current += Date.now() - spanStartRef.current;
      spanStartRef.current = null;
    }
    clearTick();
    setDurationMs(accumulatedRef.current);
  }, [clearTick]);

  const reset = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        resettingRef.current = true;
        recorderRef.current.stop();
      }
    } catch {
      resettingRef.current = false;
      // ignore — recorder may already be torn down
    }
    clearTick();
    releaseStream();
    recorderRef.current = null;
    chunksRef.current = [];
    accumulatedRef.current = 0;
    spanStartRef.current = null;
    setDurationMs(0);
    setBlob(null);
    setError(null);
    setStatus("idle");
  }, [clearTick, releaseStream]);

  const start = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }
    try {
      // Fresh recording — clear any prior state first.
      chunksRef.current = [];
      accumulatedRef.current = 0;
      spanStartRef.current = null;
      setBlob(null);
      setError(null);
      setDurationMs(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        releaseStream();
        // A reset() tore this recorder down — don't revive stopped state.
        if (resettingRef.current) {
          resettingRef.current = false;
          return;
        }
        const type = mimeTypeRef.current || chunksRef.current[0]?.type || "audio/webm";
        setBlob(new Blob(chunksRef.current, { type }));
        setStatus("stopped");
      };
      recorder.onerror = () => {
        setError("generic");
      };

      recorder.start();
      startTick();
      setStatus("recording");
    } catch (err) {
      releaseStream();
      const name = (err as DOMException)?.name;
      setError(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "generic");
      setStatus("idle");
    }
  }, [releaseStream, startTick]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording" && typeof recorder.pause === "function") {
      recorder.pause();
      freezeTick();
      setStatus("paused");
    }
  }, [freezeTick]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused" && typeof recorder.resume === "function") {
      recorder.resume();
      startTick();
      setStatus("recording");
    }
  }, [startTick]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      freezeTick();
      // onstop assembles the blob, releases the stream, and sets "stopped".
      recorder.stop();
    }
  }, [freezeTick]);

  // Release the microphone if the consumer unmounts mid-recording.
  useEffect(() => {
    return () => {
      clearTick();
      releaseStream();
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }
    };
  }, [clearTick, releaseStream]);

  return {
    status,
    isRecording: status === "recording",
    isPaused: status === "paused",
    durationMs,
    blob,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
