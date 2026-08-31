import { FC, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { AudioTranscriptPlayer, type AudioTranscriptSeekRequest } from "@components";
import { ScribeSessionMode } from "@constants";
import { SimulationTranscriptMessage, TranscriptFocusRequest, TranscriptMessage } from "@types";

const NEAR_END_THRESHOLD = 3;
const NEAR_END_COOLDOWN_MS = 900;

/**
 * How long a jumped-to moment stays visibly marked. Long enough to catch the
 * eye once the smooth scroll settles, short enough that it reads as "here it
 * is" rather than as a selection the reader now has to dismiss.
 */
const FOCUS_HIGHLIGHT_MS = 2500;

/** Transcript ids are numeric in the payload but strings in note anchors. */
const getMessageId = (
  message: SimulationTranscriptMessage | TranscriptMessage,
): string | undefined =>
  "id" in message && message.id !== null && message.id !== undefined
    ? String(message.id)
    : undefined;

interface TranscriptListingProps {
  /** Messages in backend order (sorted server-side; append pages in that same order). */
  transcriptList: SimulationTranscriptMessage[] | TranscriptMessage[];
  handleLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  scrollContainerRef?: RefObject<HTMLElement>;
  counsellorName?: string;
  agentName?: string;
  className?: string;
  audioUrl?: string;
  mode?: string;
  /**
   * A message to scroll into view and briefly highlight. Ignored when the id
   * isn't in `transcriptList` — the caller owns that fallback, because only it
   * knows whether the transcript has finished loading or has more pages.
   */
  focusRequest?: TranscriptFocusRequest | null;
}

const convertSecondsToTime = (sec: number) => {
  const totalSeconds = Math.floor(sec);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/** Latest second covered by the loaded transcript page (uses end when present). */
const getLastTranscriptSecond = (
  list: SimulationTranscriptMessage[] | TranscriptMessage[],
): number => {
  let max = 0;
  for (const t of list) {
    const start = t.startSeconds ?? 0;
    const end =
      "endSeconds" in t && typeof t.endSeconds === "number" && t.endSeconds != null
        ? t.endSeconds
        : start;
    max = Math.max(max, start, end);
  }
  return max;
};

/**
 * Index of the segment that should be highlighted: largest startSeconds still <= playback time.
 * List order does not need to match timeline (API may sort by createdAt).
 */
const getActiveTranscriptIndex = (
  list: SimulationTranscriptMessage[] | TranscriptMessage[],
  seconds: number,
): number => {
  if (!Number.isFinite(seconds) || list.length === 0) return -1;
  let bestIdx = -1;
  let bestStart = -Infinity;
  for (let i = 0; i < list.length; i++) {
    const start = list[i].startSeconds ?? 0;
    if (!Number.isFinite(start)) continue;
    if (seconds >= start && start >= bestStart) {
      bestStart = start;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const TranscriptItem = ({
  transcript,
  agentName,
  counsellorName,
  aiClientSuffix,
  aiAgentName,
  youLabel,
  isActive,
  isFocused,
  itemRef,
  onRowClick,
}: {
  agentName: string;
  counsellorName: string;
  aiClientSuffix: string;
  aiAgentName: string;
  youLabel: string;
  transcript: SimulationTranscriptMessage | TranscriptMessage;
  isActive: boolean;
  isFocused: boolean;
  itemRef?: RefObject<HTMLDivElement | HTMLButtonElement | null>;
  onRowClick?: () => void;
}) => {
  const isAIClient = transcript.senderId === -1;
  const simId = "id" in transcript ? transcript.id : undefined;
  const speakerName = isAIClient
    ? simId && agentName
      ? `${agentName} (${aiClientSuffix})`
      : (agentName ?? aiAgentName)
    : counsellorName || youLabel;

  const borderWidthClass = isActive ? "border-[3px]" : "border";
  const hoverBgClass = onRowClick ? (isAIClient ? "hover:bg-[#EDE7F6]" : "hover:bg-[#e8f2ff]") : "";
  // A jumped-to moment is marked with a ring rather than a border change, so it
  // reads on top of whatever the audio playback highlight is doing to the row.
  const focusRingClass = isFocused ? "ring-2 ring-offset-1 ring-primary-500" : "";
  const rowClassName = ` flex gap-2 p-4 rounded-md w-full min-w-0 box-border text-left transition-all ${borderWidthClass} ${
    isAIClient ? "border-[#7E57C2] bg-[#F5F3FA]" : "border-[#6188C9] bg-[#f7fcff]"
  } ${hoverBgClass} ${focusRingClass}`;

  const body = (
    <>
      <div className="text-neutral-600 text-sm font-medium shrink-0 min-w-[36px] pt-[2px]">
        {convertSecondsToTime(transcript.startSeconds ?? 0)}
      </div>

      <div className="flex-1 ph-mask">
        <div
          className={`font-semibold text-base ${isAIClient ? "text-[#7E57C2]" : "text-[#0957D0]"}`}
        >
          {speakerName}
        </div>
        <div className="text-typography-900 text-base leading-relaxed">{transcript.content}</div>
      </div>
    </>
  );

  if (onRowClick) {
    return (
      <button
        type="button"
        ref={itemRef as RefObject<HTMLButtonElement>}
        onClick={onRowClick}
        className={rowClassName}
      >
        {body}
      </button>
    );
  }

  return (
    <div ref={itemRef as RefObject<HTMLDivElement>} className={rowClassName}>
      {body}
    </div>
  );
};

const TranscriptListing: FC<TranscriptListingProps> = ({
  transcriptList,
  handleLoadMore,
  isLoading,
  hasMore = true,
  scrollContainerRef,
  counsellorName,
  agentName,
  className = "",
  audioUrl,
  mode,
  focusRequest,
}) => {
  const { t } = useTranslation();
  const aiClientSuffix = t("transcription.aiClientSuffix");
  const aiAgentName = t("transcription.aiAgentName");
  const youLabel = t("transcription.youLabel");
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const focusedItemRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const focusHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Last request acted on, so a re-render doesn't re-scroll an old jump. */
  const handledFocusRequestRef = useRef<number | null>(null);
  const seekRequestIdRef = useRef(0);
  const prevIsLoadingRef = useRef(false);
  /** Max transcript time when the in-flight fetch started (detect no-op pages). */
  const lastTimeOnPageAtFetchStartRef = useRef<number | null>(null);
  const nearEndLastCallRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(-1);
  /**
   * Message currently marked as the jumped-to moment, plus the requestId that
   * asked for it; cleared on a timer. requestId rides along so a repeat tap on
   * the same message still produces a new object and re-triggers the
   * scroll/highlight effect below — a plain messageId string would be
   * `Object.is`-equal to the current state and React would bail out.
   */
  const [focusedMessage, setFocusedMessage] = useState<{
    id: string;
    requestId: number;
  } | null>(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [transcriptSeekRequest, setTranscriptSeekRequest] =
    useState<AudioTranscriptSeekRequest | null>(null);
  const hasInteractedRef = useRef(false);
  const clickSuppressUntilRef = useRef(0);

  const lastTimeOnPage = useMemo(() => getLastTranscriptSecond(transcriptList), [transcriptList]);

  const hasTranscriptTimestamps = useMemo(
    () =>
      transcriptList.some(
        transcript =>
          typeof transcript.startSeconds === "number" && Number.isFinite(transcript.startSeconds),
      ),
    [transcriptList],
  );

  const isDictationMode = mode === ScribeSessionMode.DICTATION;

  // ── Highlight: latest segment with startSeconds <= playback ──
  const handleTimeChange = useCallback(
    (seconds: number) => {
      if (!hasTranscriptTimestamps || !hasInteractedRef.current) return;
      if (Date.now() < clickSuppressUntilRef.current) return;
      const newIndex = getActiveTranscriptIndex(transcriptList, seconds);
      setActiveIndex(prev => (prev !== newIndex ? newIndex : prev));
    },
    [transcriptList, hasTranscriptTimestamps],
  );

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setAudioIsPlaying(playing);
    if (playing) hasInteractedRef.current = true;
  }, []);

  // ── On seek beyond loaded timeline, set target and kick first page fetch ──
  const handleAudioSeek = useCallback(
    (seekSeconds: number) => {
      if (!hasTranscriptTimestamps || !handleLoadMore) return;
      if (!Number.isFinite(seekSeconds)) return;
      if (seekSeconds <= lastTimeOnPage) {
        setSeekTarget(null);
        return;
      }
      if (!hasMore) {
        setSeekTarget(null);
        return;
      }
      setSeekTarget(seekSeconds);
      if (!isLoading) handleLoadMore();
    },
    [handleLoadMore, hasMore, hasTranscriptTimestamps, isLoading, lastTimeOnPage],
  );

  // When a fetch starts, snapshot timeline coverage (for stuck detection).
  useEffect(() => {
    if (isLoading && lastTimeOnPageAtFetchStartRef.current === null) {
      lastTimeOnPageAtFetchStartRef.current = lastTimeOnPage;
    }
  }, [isLoading, lastTimeOnPage]);

  // After each fetch completes: extend timeline for seekTarget, or stop if nothing new arrived.
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    const justFinished = wasLoading && !isLoading;
    if (!justFinished) return;

    const timeAtStart = lastTimeOnPageAtFetchStartRef.current;
    lastTimeOnPageAtFetchStartRef.current = null;

    if (seekTarget === null) return;

    if (seekTarget <= lastTimeOnPage || !hasMore) {
      setSeekTarget(null);
      return;
    }

    if (timeAtStart !== null && lastTimeOnPage <= timeAtStart) {
      setSeekTarget(null);
      return;
    }

    if (seekTarget > lastTimeOnPage && hasMore && handleLoadMore) {
      handleLoadMore();
    }
  }, [isLoading, lastTimeOnPage, seekTarget, hasMore, handleLoadMore]);

  // ── Auto-scroll to the active transcript item ──
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeIndex]);

  // ── Jump to a requested moment (debrief note chip) ──
  // The list can arrive after the request does, so this re-runs on
  // transcriptList too rather than only on the request itself.
  useEffect(() => {
    if (!focusRequest) return;
    if (handledFocusRequestRef.current === focusRequest.requestId) return;
    const targetId = String(focusRequest.messageId);
    if (!transcriptList.some(message => getMessageId(message) === targetId)) return;
    handledFocusRequestRef.current = focusRequest.requestId;
    setFocusedMessage({ id: targetId, requestId: focusRequest.requestId });
  }, [focusRequest, transcriptList]);

  // Scroll only once the highlighted row has rendered and its ref is attached,
  // then let the highlight expire on its own.
  useEffect(() => {
    if (!focusedMessage) return undefined;
    focusedItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    focusHighlightTimerRef.current = setTimeout(() => setFocusedMessage(null), FOCUS_HIGHLIGHT_MS);
    return () => {
      if (focusHighlightTimerRef.current) clearTimeout(focusHighlightTimerRef.current);
    };
  }, [focusedMessage]);

  // ── While playing, prefetch when near the chronological end of loaded data ──
  useEffect(() => {
    if (
      !audioIsPlaying ||
      isLoading ||
      !hasMore ||
      !handleLoadMore ||
      activeIndex < 0 ||
      transcriptList.length === 0
    ) {
      return;
    }
    const activeStart = transcriptList[activeIndex]?.startSeconds;
    if (typeof activeStart !== "number" || !Number.isFinite(activeStart)) return;
    if (lastTimeOnPage - activeStart > 45) return;
    if (activeIndex < transcriptList.length - NEAR_END_THRESHOLD) return;

    const now = Date.now();
    if (now - nearEndLastCallRef.current < NEAR_END_COOLDOWN_MS) return;
    nearEndLastCallRef.current = now;
    handleLoadMore();
  }, [
    activeIndex,
    audioIsPlaying,
    isLoading,
    hasMore,
    handleLoadMore,
    lastTimeOnPage,
    transcriptList,
  ]);

  const TranscriptSkeleton = () => (
    <div className="flex flex-col gap-6 w-full">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex gap-4 animate-pulse">
          <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded shrink-0" />
            </div>
            <div className="h-6 flex-1 bg-gray-200 rounded" />
            {index % 2 === 0 && <div className="h-6 w-4/5 bg-gray-200 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && transcriptList.length === 0) {
    return (
      <div className={`flex flex-col pt-10 -mt-10 gap-4 font-primary ${className}`}>
        <TranscriptSkeleton />
      </div>
    );
  }

  return (
    <>
      {audioUrl && (
        <div>
          <AudioTranscriptPlayer
            audioUrl={audioUrl}
            seekRequest={transcriptSeekRequest}
            onSeekSeconds={handleAudioSeek}
            onTimeChange={handleTimeChange}
            onPlayStateChange={handlePlayStateChange}
          />
        </div>
      )}
      {transcriptList.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <div className="text-xxl font-primary text-typography-700">
            {t("transcription.empty")}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef ? undefined : containerRef}
          className={`flex flex-col gap-3 font-primary overflow-y-auto custom-scrollbar ${className}`}
        >
          <InfiniteScroll
            onInfiniteScroll={handleLoadMore}
            isLoading={isLoading}
            hasMore={hasMore}
            scrollContainerRef={scrollContainerRef ?? containerRef}
          >
            {isDictationMode
              ? transcriptList.map((item, index) => (
                  <div
                    key={`dictation-${index}`}
                    className="text-base font-primary leading-relaxed text-typography-900 ph-mask p-4 border border-[#cfd3d8] rounded-md bg-white"
                  >
                    {item.content}
                  </div>
                ))
              : transcriptList.map((transcript, index) => {
                  const isItemActive = index === activeIndex;
                  const isItemFocused =
                    focusedMessage !== null && getMessageId(transcript) === focusedMessage.id;
                  return (
                    <TranscriptItem
                      key={`${transcript.senderId}-${transcript.startSeconds}-${index}`}
                      transcript={transcript}
                      agentName={agentName}
                      counsellorName={counsellorName}
                      aiClientSuffix={aiClientSuffix}
                      aiAgentName={aiAgentName}
                      youLabel={youLabel}
                      isActive={isItemActive}
                      isFocused={isItemFocused}
                      // A row can be both the playback-active one and the
                      // jumped-to one; the jump owns the ref while it lasts,
                      // since it is the scroll the reader just asked for.
                      itemRef={
                        isItemFocused ? focusedItemRef : isItemActive ? activeItemRef : undefined
                      }
                      onRowClick={
                        audioUrl
                          ? () => {
                              hasInteractedRef.current = true;
                              clickSuppressUntilRef.current = Date.now() + 500;
                              seekRequestIdRef.current += 1;
                              setTranscriptSeekRequest({
                                seconds: transcript.startSeconds ?? 0,
                                requestId: seekRequestIdRef.current,
                              });
                              setActiveIndex(index);
                            }
                          : undefined
                      }
                    />
                  );
                })}
          </InfiniteScroll>
        </div>
      )}
    </>
  );
};

export default TranscriptListing;
