import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RecorderStatus } from "@hooks";

interface VoiceNotePanelProps {
  status: RecorderStatus;
  /** Elapsed recorded time in milliseconds. */
  durationMs: number;
  isGenerating: boolean;
  /** True once the drawer has aborted a generate call for taking too long. */
  hasTimedOut: boolean;
  /** Rotating status lines shown while generating (already translated). */
  generatingMessages: string[];
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onGenerate: () => void;
  onDiscard: () => void;
}

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Static bar heights (%) for the "listening" equaliser — animated via framer.
const BAR_HEIGHTS = [40, 70, 100, 60, 85, 45, 75, 55];

const ListeningBars: FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end gap-1 h-6" aria-hidden>
    {BAR_HEIGHTS.map((peak, i) => (
      <motion.span
        key={i}
        className="w-1 rounded-full bg-[#264D8E]"
        style={{ height: `${peak}%` }}
        animate={active ? { scaleY: [0.4, 1, 0.4] } : { scaleY: 0.4 }}
        transition={
          active
            ? { repeat: Infinity, duration: 0.9, delay: i * 0.08, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      />
    ))}
  </div>
);

const ctrlButton =
  "inline-flex items-center gap-1.5 h-9 px-3 font-primary text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * The recording / generation surface for the manual scribe-note voice flow.
 * Presentational only — the drawer owns the recorder and the generate call and
 * passes state + handlers in. Rendered at the top of the drawer body while a
 * dictation is in progress, being reviewed, or being transcribed.
 */
const VoiceNotePanel: FC<VoiceNotePanelProps> = ({
  status,
  durationMs,
  isGenerating,
  hasTimedOut,
  generatingMessages,
  onPause,
  onResume,
  onStop,
  onGenerate,
  onDiscard,
}) => {
  const { t } = useTranslation();
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle the generating status lines so the user sees continuous progress.
  useEffect(() => {
    if (!isGenerating || generatingMessages.length <= 1) {
      setMessageIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % generatingMessages.length);
    }, 2200);
    return () => clearInterval(id);
  }, [isGenerating, generatingMessages.length]);

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isStopped = status === "stopped";

  // Checked before isGenerating: the request has just been aborted for
  // taking too long, but the mutation's own isLoading flag may take a beat
  // to catch up, and we want the timed-out screen the instant that happens
  // rather than a flash back to the spinner.
  if (hasTimedOut) {
    return (
      <div
        className="flex flex-col items-center gap-3 border border-[#e0e0e0] bg-[#f4f4f4] p-5"
        data-testid="voice-note-timeout"
      >
        <p className="font-primary text-sm text-[#525252] text-center">
          {t("calls.createNote.voice.timeout")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className={`${ctrlButton} border-[#8d8d8d] text-[#525252] hover:bg-[#e8e8e8]`}
            data-testid="voice-note-timeout-back"
          >
            {t("calls.createNote.voice.backToForm")}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className={`${ctrlButton} border-[#264D8E] bg-[#264D8E] text-white hover:bg-[#1F3F75]`}
            data-testid="voice-note-timeout-retry"
          >
            {t("calls.createNote.voice.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div
        className="flex flex-col items-center gap-3 border border-[#e0e0e0] bg-[#f4f4f4] p-5"
        data-testid="voice-note-generating"
      >
        <Loader2 className="h-6 w-6 animate-spin text-[#264D8E]" />
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-primary text-sm text-[#525252]"
        >
          {generatingMessages[messageIndex] ?? t("calls.createNote.voice.generating")}
        </motion.p>
        <button
          type="button"
          onClick={onDiscard}
          className={`${ctrlButton} border-[#8d8d8d] text-[#525252] hover:bg-[#e8e8e8]`}
          data-testid="voice-note-cancel"
        >
          {t("calls.createNote.voice.cancel")}
        </button>
      </div>
    );
  }

  if (isRecording || isPaused) {
    return (
      <div
        className="flex items-center justify-between gap-4 border border-[#e0e0e0] bg-[#f4f4f4] p-4"
        data-testid="voice-note-recording"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            {isRecording && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#da1e28] opacity-60" />
            )}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                isRecording ? "bg-[#da1e28]" : "bg-[#8d8d8d]"
              }`}
            />
          </span>
          <ListeningBars active={isRecording} />
          <div className="flex flex-col min-w-0">
            <span className="font-primary text-sm text-[#161616]">
              {isRecording
                ? t("calls.createNote.voice.listening")
                : t("calls.createNote.voice.paused")}
            </span>
            <span className="font-primary text-xs tabular-nums text-[#525252]">
              {formatDuration(durationMs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRecording ? (
            <button
              type="button"
              onClick={onPause}
              className={`${ctrlButton} border-[#8d8d8d] text-[#161616] hover:bg-[#e8e8e8]`}
              data-testid="voice-note-pause"
            >
              <Pause className="h-4 w-4" />
              {t("calls.createNote.voice.pause")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              className={`${ctrlButton} border-[#8d8d8d] text-[#161616] hover:bg-[#e8e8e8]`}
              data-testid="voice-note-resume"
            >
              <Play className="h-4 w-4" />
              {t("calls.createNote.voice.resume")}
            </button>
          )}
          <button
            type="button"
            onClick={onStop}
            className={`${ctrlButton} border-[#da1e28] text-[#da1e28] hover:bg-[#fff1f1]`}
            data-testid="voice-note-stop"
          >
            <Square className="h-4 w-4" />
            {t("calls.createNote.voice.stop")}
          </button>
        </div>
      </div>
    );
  }

  if (isStopped) {
    return (
      <div
        className="flex items-center justify-between gap-4 border border-[#e0e0e0] bg-[#f4f4f4] p-4"
        data-testid="voice-note-ready"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Mic className="h-5 w-5 shrink-0 text-[#161616]" />
          <div className="flex flex-col min-w-0">
            <span className="font-primary text-sm text-[#161616]">
              {t("calls.createNote.voice.ready")}
            </span>
            <span className="font-primary text-xs tabular-nums text-[#525252]">
              {formatDuration(durationMs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDiscard}
            className={`${ctrlButton} border-[#8d8d8d] text-[#525252] hover:bg-[#e8e8e8]`}
            data-testid="voice-note-discard"
          >
            <Trash2 className="h-4 w-4" />
            {t("calls.createNote.voice.discard")}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className={`${ctrlButton} border-[#264D8E] bg-[#264D8E] text-white hover:bg-[#1F3F75]`}
            data-testid="voice-note-generate"
          >
            <Sparkles className="h-4 w-4" />
            {t("calls.createNote.voice.generate")}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default VoiceNotePanel;
