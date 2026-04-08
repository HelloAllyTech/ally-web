import { FC, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { AudioTranscriptPlayer, type AudioTranscriptSeekRequest } from "@components";
import { SimulationTranscriptMessage, TranscriptMessage } from "@types";

const NEAR_END_THRESHOLD = 3;
const NEAR_END_COOLDOWN_MS = 900;

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
}

const categoryColoeMap = {
  POSITIVE: "bg-[#C8E6C9] text-[#18441B]",
  NEGATIVE: "bg-[#FFD9D4] text-[#390002]",
  NEUTRAL: "bg-[#E0E0E0] text-[#333333]",
};

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
  const rowClassName = ` flex gap-2 p-4 rounded-md w-full min-w-0 box-border text-left transition-colors ${borderWidthClass} ${
    isAIClient ? "border-[#7E57C2] bg-[#F5F3FA]" : "border-[#6188C9] bg-[#f7fcff]"
  } ${hoverBgClass}`;

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
        {"tags" in transcript && transcript.tags && transcript.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 my-1">
            {transcript.tags.map(tag => (
              <div
                key={tag.tagId}
                className={`text-typography-900 px-1 text-xs rounded-[2px] leading-relaxed ${categoryColoeMap[tag.category]}`}
              >
                {tag.label}
              </div>
            ))}
          </div>
        )}
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
}) => {
  const { t } = useTranslation();
  const aiClientSuffix = t("transcription.aiClientSuffix");
  const aiAgentName = t("transcription.aiAgentName");
  const youLabel = t("transcription.youLabel");
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const seekRequestIdRef = useRef(0);
  const prevIsLoadingRef = useRef(false);
  /** Max transcript time when the in-flight fetch started (detect no-op pages). */
  const lastTimeOnPageAtFetchStartRef = useRef<number | null>(null);
  const nearEndLastCallRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(-1);
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
            {transcriptList.map((transcript, index) => {
              const isItemActive = index === activeIndex;
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
                  itemRef={isItemActive ? activeItemRef : undefined}
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
