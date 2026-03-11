import { FC, useEffect, useRef, useState, useCallback, RefObject } from "react";

import { useTranslation } from "react-i18next";
import "./styles.css";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import SelectableText from "@src/components/selectable-text/SelectableText";
import { CommentItem, CommentChangeParams, SimulationTranscriptMessage, Thread } from "@types";

import { getFreshUserRange, splitByCommentRanges } from "./utils";

interface TranscriptionProps {
  transcriptList: SimulationTranscriptMessage[];
  userId?: number;
  canSelect?: boolean;
  selectedMessageId?: string;
  selectedStartIndex?: number;
  selectedEndIndex?: number;
  isFeedOwner?: boolean;
  handleCommentClick?: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => void;
  commentsList?: CommentItem[];
  selectedThreadId?: string | null;
  onCloseSelectedComment?: () => void;
  className?: string;
  handleLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  scrollContainerRef?: RefObject<HTMLElement>;
  councellorName?: string;
  agentName?: string;
  onCommentChange?: (params: CommentChangeParams) => void;
  onDeleteComment?: (val?: number) => void;
  onAddComment?: () => void;
}

const Transcription: FC<TranscriptionProps> = ({
  isFeedOwner,
  transcriptList,
  canSelect = false,
  selectedMessageId,
  selectedStartIndex,
  selectedEndIndex,
  handleCommentClick,
  onCloseSelectedComment,
  commentsList,
  selectedThreadId,
  className,
  handleLoadMore,
  isLoading,
  hasMore = true,
  scrollContainerRef,
  councellorName,
  agentName,
  onAddComment = () => {},
  onCommentChange = () => {},
  onDeleteComment = () => {},
}) => {
  const { t } = useTranslation();
  const contentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const selectedCommentRef = useRef<HTMLSpanElement | null>(null);
  const [transcriptions, setTranscriptions] = useState<SimulationTranscriptMessage[]>([]);
  const [addCommentDialogOpen, setAddCommentDialogOpen] = useState<string | null>(null);

  const [newCommentSelection, setNewCommentSelection] = useState<{
    startIndex: number;
    endIndex: number;
    transcriptId: number;
  } | null>(null);

  useEffect(() => {
    setTranscriptions(transcriptList);
  }, [transcriptList]);

  useEffect(() => {
    if (selectedMessageId && String(selectedStartIndex) && String(selectedEndIndex)) {
      const index = transcriptions.findIndex(
        transcript => transcript.id === parseInt(selectedMessageId),
      );
      if (index !== -1) {
        const selectedText = transcriptions[index].content.slice(
          selectedStartIndex,
          selectedEndIndex,
        );
        const newMessage = {
          ...transcriptions[index],
          comments: [
            {
              startIndex: selectedStartIndex,
              endIndex: selectedEndIndex,
              selectedText,
              comments: [
                {
                  text: selectedText,
                },
              ],
            },
          ],
        };
        setTranscriptions(prev =>
          prev.map((transcript, i) => (i === index ? newMessage : transcript)),
        );
      }
    }
  }, [selectedMessageId, selectedStartIndex, selectedEndIndex]);
  const convertSecondsToTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toFixed(0).toString().padStart(2, "0")}`;
  };
  const handleSelection = (index: number) => {
    if (!canSelect) return;
    const container = contentRefs.current[index];
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = getFreshUserRange(selection);

    if (!container.contains(range.startContainer)) return;

    let startIndex = 0;
    let found = false;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (node.parentNode && node.parentNode.parentNode === container) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    });
    let node = walker.nextNode();

    while (node) {
      if (node === range.startContainer) {
        startIndex += range.startOffset;
        found = true;
        break;
      }
      startIndex += node.textContent?.length || 0;
      node = walker.nextNode();
    }

    if (!found) return;

    const selectedText = range.toString();
    const endIndex = startIndex + selectedText.length;

    const currentTranscription = transcriptions[index];
    const existingComments =
      currentTranscription.threads?.filter(comment => comment.comments?.length !== 0) || [];

    const newComments = [
      ...existingComments,
      {
        selection: {
          startIndex,
          endIndex,
        },
        selectedText,
        comments: [],
      },
    ];
    setAddCommentDialogOpen(null);
    setNewCommentSelection({ startIndex, endIndex, transcriptId: transcriptions[index].id });
    setTranscriptions(prev =>
      prev.map((transcript, i) =>
        i === index ? { ...transcript, threads: newComments as Thread[] } : transcript,
      ),
    );
  };

  const onCancelComment = useCallback(() => {
    setTranscriptions(prev =>
      prev.map(transcript => ({
        ...transcript,
        threads: transcript.threads?.filter(thread => thread.comments?.length !== 0) || [],
      })),
    );
  }, []);

  // Use document-level mouseup so selection is captured even when user releases outside the text
  // (e.g. when selecting a full line and dragging beyond the span boundary)
  useEffect(() => {
    if (!canSelect) return undefined;

    const handleDocumentMouseUp = () => {
      for (let i = 0; i < contentRefs.current.length; i++) {
        const container = contentRefs.current[i];
        if (!container) continue;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) continue;

        const range = getFreshUserRange(selection);
        if (!container.contains(range.startContainer)) continue;

        handleSelection(i);
        break; // Only process the first matching container
      }
    };

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => document.removeEventListener("mouseup", handleDocumentMouseUp);
  }, [canSelect, transcriptions]);

  const TranscriptSkeleton = () => (
    <div className="flex flex-col gap-6 h-full w-full">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex gap-4 animate-pulse">
          <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
              <div className="h-6 flex-1 bg-gray-200 rounded" />
            </div>
            {index % 2 === 0 && <div className="h-6 w-4/5 bg-gray-200 rounded" />}
            {index % 3 === 0 && <div className="h-6 w-2/3 bg-gray-200 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && transcriptions.length === 0) {
    return (
      <div className={`flex flex-col pt-10 -mt-10 gap-4 font-primary h-full w-full !overflow-clip`}>
        <TranscriptSkeleton />
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className={`flex flex-col justify-center items-center h-full w-full`}>
        <div className="text-xxl font-primary text-typography-700">{t("transcription.empty")}</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef as RefObject<HTMLDivElement>}
      className={`flex flex-col pt-10 -mt-10 gap-4 font-primary font-lg ${className}`}
    >
      <InfiniteScroll
        onInfiniteScroll={handleLoadMore}
        isLoading={isLoading}
        hasMore={hasMore}
        scrollContainerRef={scrollContainerRef}
      >
        {transcriptions?.map((transcript, index) => (
          <div
            key={transcript.startSeconds}
            className={`flex gap-4 ${!canSelect ? "pointer-events-none select-none" : ""}`}
          >
            <div className="text-neutral-500">
              {convertSecondsToTime(transcript.startSeconds ?? 0)}
            </div>
            <div>
              <span className="font-medium pr-1">
                {transcript.senderId === -1 ? (
                  <span className="text-typography-900">
                    {agentName
                      ? `${agentName} (${t("transcription.aiClientSuffix")}) :`
                      : t("transcription.agentLabel")}
                  </span>
                ) : (
                  <span className="text-primary-700">
                    {councellorName ? councellorName : t("transcription.youLabel")}:
                  </span>
                )}
              </span>
              <span
                ref={el => (contentRefs.current[index] = el)}
                className={`text-typography-900 selected-text relative w-full ${canSelect ? "cursor-text" : "cursor-default"}`}
              >
                {splitByCommentRanges(
                  transcript.content,
                  (transcript.threads ?? []).map(thread => ({
                    id: thread.id,
                    start: thread.selection.startIndex,
                    end: thread.selection.endIndex,
                  })),
                ).map((segment, segIdx) => {
                  const isSelectedComment =
                    selectedMessageId &&
                    transcript.id === parseInt(selectedMessageId) &&
                    segment.commentIds.length > 0;

                  return (
                    <SelectableText
                      onDeleteComment={onDeleteComment}
                      key={segIdx}
                      onCommentChange={onCommentChange}
                      setAddCommentDialogOpen={setAddCommentDialogOpen}
                      addCommentDialogOpen={addCommentDialogOpen}
                      onCloseSelectedComment={onCloseSelectedComment}
                      segment={segment}
                      segIdx={segIdx}
                      isFeedOwner={isFeedOwner}
                      newCommentSelection={newCommentSelection}
                      isSelectedComment={isSelectedComment}
                      selectedCommentRef={selectedCommentRef}
                      selectedMessageId={selectedMessageId}
                      transcript={transcript}
                      selectedEndIndex={selectedEndIndex}
                      handleCommentClick={handleCommentClick}
                      selectedThreadId={selectedThreadId}
                      index={index}
                      commentsList={commentsList}
                      setNewCommentSelection={setNewCommentSelection}
                      onCancelComment={onCancelComment}
                      onAddComment={onAddComment}
                    />
                  );
                })}
              </span>
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default Transcription;
