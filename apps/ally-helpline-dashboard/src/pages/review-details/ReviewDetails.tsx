import { useEffect, useMemo, useRef, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { CustomImage, SimulationDetailsModal, Toggle } from "@ally-ui-mono/ui-shared";
import {
  useAddReactionMutation,
  useGetReviewByIdQuery,
  useGetReviewDetailsWithMessagesQuery,
  useUpdateReviewMutation,
} from "@api";
import { ChatBubble, LeftArrow, Smiley, InfoIcon } from "@assets";
import {
  ReactionSelector,
  EmojiStack,
  ReactionsModal,
  ReviewCommentsSidepanel,
  Transcription,
} from "@components";
import { KeyboardKeys, REVIEW_PRIVACY_OPTIONS } from "@constants";
import { RootState } from "@store";
import { ReactionsType, SimulationTranscriptMessage, Thread } from "@types";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

import { TRANSCRIPT_PAGE_SIZE } from "../calls/components/constants";

export const ReviewDetails = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { user } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [showCommentsSidepanel, setShowCommentsSidepanel] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [selectedStartIndex, setSelectedStartIndex] = useState<number>(0);
  const [selectedEndIndex, setSelectedEndIndex] = useState<number>(0);
  const [selectedThreadId, setSelectedThreadId] = useState<string>(null);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showSimulationDetailsModal, setShowSimulationDetailsModal] = useState(false);
  const [hasMoreTranscripts, setHasMoreTranscripts] = useState(true);

  const selectEmojiRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: reviewDetails, isLoading: isGetReviewDetailsLoading } = useGetReviewByIdQuery(
    reviewId || "",
  );

  const { data: simulationTranscript, isLoading: isGetTranscriptLoading } =
    useGetReviewDetailsWithMessagesQuery({
      id: reviewId || "",
      offset: transcriptOffset,
      limit: TRANSCRIPT_PAGE_SIZE,
      sortBy: "startSeconds",
    });
  const [addReactions] = useAddReactionMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();
  useEffect(() => {
    setTranscriptList([]);
    setTranscriptOffset(0);
  }, [reviewId]);

  useEffect(() => {
    if (reviewDetails?.myReaction?.length > 0) {
      setSelectedEmoji(reviewDetails?.myReaction);
    }
  }, [reviewDetails]);

  const isFeedOwner = useMemo(() => {
    return user?.id === reviewDetails?.createdBy?.id;
  }, [user?.id, reviewDetails?.createdBy?.id]);

  useEffect(() => {
    if (simulationTranscript?.length > 0) {
      setTranscriptList(prev => {
        return transcriptOffset > 0
          ? [...prev, ...simulationTranscript]
          : [...simulationTranscript];
      });
    } else {
      setHasMoreTranscripts(false);
    }
  }, [simulationTranscript]);

  const handleCloseSelectedComment = () => {
    setSelectedThreadId(null);
    setSelectedMessageId("");
    setSelectedStartIndex(0);
    setSelectedEndIndex(0);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE && selectedThreadId) {
        handleCloseSelectedComment();
      }
    };

    const el = transcriptScrollRef.current;
    if (!el) return undefined;

    if (selectedThreadId) {
      document.addEventListener("keydown", handleEscKey);

      el.style.overflowY = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      el.style.overflowY = "auto";
    };
  }, [selectedThreadId, handleCloseSelectedComment]);

  const reviewReactions = useMemo(() => {
    if (!reviewDetails?.reactions) return [];
    return Object.keys(reviewDetails?.reactions);
  }, [reviewDetails?.reactions]);

  const displayTotalReactionCount: string | number = useMemo(() => {
    if (!reviewReactions) return 0;
    const reactionsCount: number =
      (Object.values(reviewDetails?.reactions || {}) as number[])?.reduce(
        (acc: number, curr: number) => acc + curr,
        0,
      ) || 0;
    if (reactionsCount > 999) {
      const count = Number((reactionsCount / 1000).toFixed(1));
      return `${count}k`;
    }
    return reactionsCount;
  }, [reviewReactions]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const threads = useMemo(() => {
    return transcriptList
      .map(transcript =>
        transcript.threads?.map(thread => ({
          ...thread,
          selection: {
            text: transcript.content.slice(thread.selection.startIndex, thread.selection.endIndex),
            startIndex: thread.selection.startIndex,
            endIndex: thread.selection.endIndex,
            messageId: transcript.id,
          },
        })),
      )
      .flat();
  }, [transcriptList]);

  const sendReaction = (reaction: string, action: ReactionsType) =>
    addReactions({
      id: reviewId,
      reaction: { reaction, action },
    }).unwrap();

  const handleEmojiClick = async (emoji: string) => {
    try {
      let action: ReactionsType;
      let nextEmoji = selectedEmoji;

      if (selectedEmoji === emoji) {
        action = ReactionsType.REMOVE;
        nextEmoji = "";
      } else if (selectedEmoji) {
        action = ReactionsType.UPDATE;
        nextEmoji = emoji;
      } else {
        action = ReactionsType.ADD;
        nextEmoji = emoji;
      }

      await sendReaction(emoji, action);
      setSelectedEmoji(nextEmoji);
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error(error?.data?.message || "Reaction update failed");
    }
  };

  const handleCommentClick = (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => {
    setSelectedMessageId(props.messageId);
    setSelectedStartIndex(props.startIndex);
    setSelectedEndIndex(props.endIndex);
    setSelectedThreadId(props.threadId);
  };

  const handleLoadMore = () => {
    if (!hasMoreTranscripts || isGetTranscriptLoading) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  const handleReactionsClick = () => {
    setShowReactionsModal(true);
  };

  const isReactionOnCommentFromThisUser = () => {
    return reviewReactions.length === 1 && reviewReactions[0] === reviewDetails?.myReaction;
  };

  const handleCreateReview = async (status: string) => {
    await updateReview({ id: reviewDetails.id, status });
  };

  const renderBottomSection = () => {
    return (
      <div className="absolute flex justify-center bottom-9 left-0 right-0 w-full">
        <div className="p-2 h-14 rounded-full border flex items-center gap-2 bg-white shadow-2xl">
          {isFeedOwner && (
            <div
              className="flex items-center gap-2 min-w-fit"
              style={{ opacity: isUpdateReviewLoading ? 0.5 : 1 }}
            >
              <Toggle
                items={REVIEW_PRIVACY_OPTIONS}
                initialValue={reviewDetails?.reviewStatus || "IN_REVIEW"}
                onChange={handleCreateReview}
              />
            </div>
          )}
          <div
            onClick={() => setShowCommentsSidepanel(!showCommentsSidepanel)}
            className="group flex items-center h-full w-fit cursor-pointer hover:border-[#0957D0] gap-2.5 rounded-full border justify-center px-3"
          >
            <ChatBubble className="w-6 h-6 text-neutral-600 group-hover:text-[#0957D0]" />
            <div className="text-typography-900 font-primary group-hover:text-[#0957D0]">
              Comments
            </div>
          </div>
          <div className="relative w-fit">
            <div
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`flex relative items-center h-9 min-w-9 rounded-full border cursor-pointer justify-center ${selectedEmoji ? "border-primary-400" : "border-neutral-300"}`}
              ref={selectEmojiRef}
            >
              {selectedEmoji ? (
                <div className="pb-0.5">
                  <Emoji unified={selectedEmoji} size={16} emojiStyle={EmojiStyle.GOOGLE} />
                </div>
              ) : (
                <Smiley className="w-6 h-6 text-neutral-600 hover:text-[#0957D0]" />
              )}
            </div>
            {showEmojiPicker && (
              <ReactionSelector
                anchorElement={selectEmojiRef.current}
                selectedEmoji={selectedEmoji}
                handleEmojiClick={handleEmojiClick}
              />
            )}
          </div>
          {reviewReactions?.length > 0 && !isReactionOnCommentFromThisUser() && (
            <div className="flex items-center gap-3 justify-between w-full">
              <button
                onClick={handleReactionsClick}
                className="flex items-center gap-2 text-black/60 min-w-0 hover:opacity-80 transition-opacity"
              >
                <EmojiStack unicodeCodes={reviewReactions} />
                <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800 truncate">
                  {displayTotalReactionCount} reaction{reviewReactions?.length !== 1 ? "s" : ""}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-hidden">
      <div className="flex px-6 items-center gap-4 py-4 border-b-[0.5px] border-border-light">
        <div
          className="w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-neutral-100 rounded-full"
          onClick={handleGoBack}
        >
          <LeftArrow className=" w-5 h-5" />
        </div>
        {isGetReviewDetailsLoading ? (
          <div className="flex flex-col justify-center gap-2 font-primary animate-pulse">
            <div className="h-6 w-64 bg-gray-200 rounded" />
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 bg-gray-200 rounded-full" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="w-1 h-1 bg-gray-200 rounded-full mx-1" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="w-1 h-1 bg-gray-200 rounded-full mx-1" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-1.5 font-primary text-base">
            <div className="text-xl font-medium text-typography-900 flex flex-row items-center">
              <span className="line-clamp-1">{reviewDetails?.scenario?.title}</span>
              <div
                onClick={() => setShowSimulationDetailsModal(true)}
                className="text-xs cursor-pointer text-neutral-500 ml-[4px]"
              >
                <InfoIcon />
              </div>
            </div>
            <div className="flex gap-2 items-center text-gray-500">
              <div className="w-[28px] h-[28px] rounded-full">
                <CustomImage
                  src={reviewDetails?.createdBy?.profileImage}
                  alt="Profile"
                  className="w-full h-full rounded-full"
                  fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-800"
                  fallbackText={reviewDetails?.createdBy?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
                />
              </div>
              {isFeedOwner ? <div>You</div> : <div>By {reviewDetails?.createdBy?.name}</div>}
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                Date & time:{" "}
                {getFormattedDateTime(
                  reviewDetails?.scenarioSession?.createdAt,
                  "MMM dd, yyyy hh:mm a",
                )}
              </div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div className="font-primary  leading-4 text-black/60">
                {reviewDetails?.scenarioSession?.duration < 60
                  ? `Duration: ${getFormattedTimeFromDuration(reviewDetails?.scenarioSession?.duration, "ss")} sec`
                  : `Duration: ${getFormattedTimeFromDuration(reviewDetails?.scenarioSession?.duration, "mm:ss")} min`}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full h-[calc(100%-103px)]">
        <div
          ref={transcriptScrollRef}
          className="pt-5 mx-auto px-10 w-[calc(100%-384px)] h-[99%] pb-20 transition-all duration-400 custom-scrollbar"
        >
          <Transcription
            councellorName={isFeedOwner ? "You" : reviewDetails?.createdBy?.name}
            agentName={reviewDetails?.scenario?.name}
            commentsList={
              threads.find(
                thread =>
                  thread.selection.messageId === parseInt(selectedMessageId) &&
                  thread.id === selectedThreadId,
              )?.comments
            }
            isFeedOwner={isFeedOwner}
            handleCommentClick={handleCommentClick}
            selectedThreadId={selectedThreadId}
            transcriptList={transcriptList}
            userId={user?.id}
            canSelect={true}
            handleLoadMore={handleLoadMore}
            isLoading={isGetTranscriptLoading}
            selectedMessageId={selectedMessageId}
            selectedStartIndex={selectedStartIndex}
            selectedEndIndex={selectedEndIndex}
            onCloseSelectedComment={handleCloseSelectedComment}
          />
        </div>
        <ReviewCommentsSidepanel
          isFeedOwner={isFeedOwner}
          threads={threads as Thread[]}
          totalComments={reviewDetails?.commentsCount || 0}
          isOpen={showCommentsSidepanel}
          onCommentClick={handleCommentClick}
          className={showCommentsSidepanel ? "min-w-[300px] w-[30%]" : "w-0 border-none"}
        />
      </div>
      {transcriptList.length > 0 && renderBottomSection()}

      <ReactionsModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        reviewId={reviewId || ""}
      />

      <SimulationDetailsModal
        isOpen={showSimulationDetailsModal}
        title={reviewDetails?.scenario?.title}
        description={reviewDetails?.scenario?.description}
        coverImageUrl={reviewDetails?.scenario?.coverImageUrl}
        coverVideoUrl={reviewDetails?.scenario?.coverVideoUrl}
        headerTitle="Simulation"
        headerSubtitle="Details"
        scenarioLabel="Scenario:"
        showActionButtons={false}
        onClickOutside={() => setShowSimulationDetailsModal(false)}
      />
    </div>
  );
};
