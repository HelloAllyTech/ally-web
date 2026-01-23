import { useEffect, useMemo, useRef, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { CustomImage, SimulationDetailsModal } from "@ally-ui-mono/ui-shared";
import {
  useCreateCommentMutation,
  useAddReactionMutation,
  useGetReviewByIdQuery,
  useGetReviewDetailsWithMessagesQuery,
} from "@api";
import { ChatBubble, LeftArrow, Smiley, InfoIcon } from "@assets";
import {
  ReactionSelector,
  EmojiStack,
  ReactionsModal,
  ReviewCommentsSidepanel,
  Transcription,
} from "@components";
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
  const [selectedThreadId, setSelectedThreadId] = useState<number>(null);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showSimulationDetailsModal, setShowSimulationDetailsModal] = useState(false);
  const { data: reviewDetails, isLoading: isGetReviewDetailsLoading } = useGetReviewByIdQuery(
    reviewId || "",
  );

  const selectEmojiRef = useRef<HTMLDivElement>(null);

  const [createComment, { isLoading: isCreateCommentLoading, isSuccess: isCreateCommentSuccess }] =
    useCreateCommentMutation();
  const { data: simulationTranscript, isLoading: isGetTranscriptLoading } =
    useGetReviewDetailsWithMessagesQuery({
      id: reviewId || "",
      offset: transcriptOffset,
      limit: TRANSCRIPT_PAGE_SIZE,
      sortBy: "startSeconds",
    });
  const [addReactions] = useAddReactionMutation();

  useEffect(() => {
    setTranscriptList([]);
    setTranscriptOffset(0);
  }, [reviewId]);

  useEffect(() => {
    if (simulationTranscript?.length > 0) {
      setTranscriptList(prev => {
        return [...prev, ...simulationTranscript];
      });
    }
  }, [simulationTranscript]);

  const reviewReactions = useMemo(() => {
    if (!reviewDetails?.reactions) return [];
    return Object.keys(reviewDetails?.reactions);
  }, [reviewDetails?.reactions]);

  const totalReactionCount = useMemo(() => {
    if (!reviewReactions) return 0;
    const reactionsCount = reviewReactions.reduce(
      (acc: number, curr: string) => acc + reviewReactions[curr],
      0,
    );
    if (reactionsCount > 999) {
      const count = Number((reactionsCount / 1000).toFixed(1));
      return `${count}k`;
    }
    return reactionsCount;
  }, [reviewReactions]);

  // Reset transcript list when comment is successfully created to reflect new data
  useEffect(() => {
    if (isCreateCommentSuccess) {
      setTranscriptOffset(0);
    }
  }, [isCreateCommentSuccess]);

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
      if (selectedEmoji === emoji) {
        await sendReaction(emoji, ReactionsType.REMOVE);
        setSelectedEmoji("");
      } else {
        if (selectedEmoji) {
          await sendReaction(selectedEmoji, ReactionsType.REMOVE);
        }
        await sendReaction(emoji, ReactionsType.ADD);
        setSelectedEmoji(emoji);
      }

      setShowEmojiPicker(false);
    } catch (error) {
      toast.error(error?.data?.message || "Reaction update failed");
    }
  };

  const handleCommentClick = (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: number;
  }) => {
    setSelectedMessageId(props.messageId);
    setSelectedStartIndex(props.startIndex);
    setSelectedEndIndex(props.endIndex);
    setSelectedThreadId(props.threadId);
  };

  const handleCloseSelectedComment = () => {
    setSelectedThreadId(null);
    setSelectedMessageId("");
    setSelectedStartIndex(0);
    setSelectedEndIndex(0);
  };

  const handleLoadMore = () => {
    if (transcriptOffset >= simulationTranscript?.messages?.length) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };
  const onCreateComment = async (
    reviewId: string,
    body: {
      threadId: number;
      parentCommentId: number;
      messageId: number;
      content: string;
      selection: { startIndex: number; endIndex: number };
    },
  ) => {
    createComment({ reviewId, body });
  };

  const handleReactionsClick = () => {
    setShowReactionsModal(true);
  };

  const renderBottomSection = () => {
    return (
      <div className="absolute flex justify-center bottom-9 left-0 right-0 w-full">
        <div className="p-2 h-14 rounded-full border flex items-center gap-2 bg-white shadow-2xl">
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
              className="flex relative items-center h-9 min-w-9 rounded-full border cursor-pointer hover:border-[#0957D0] justify-center"
              ref={selectEmojiRef}
            >
              {selectedEmoji ? (
                <div className="pb-0.5">
                  <Emoji unified={selectedEmoji} size={16} emojiStyle={EmojiStyle.NATIVE} />
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
          {totalReactionCount > 0 && (
            <div className="flex items-center gap-3 justify-between w-full">
              <button
                onClick={handleReactionsClick}
                className="flex items-center gap-2 text-black/60 min-w-0 hover:opacity-80 transition-opacity"
              >
                <EmojiStack unicodeCodes={reviewReactions} />
                <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800 truncate">
                  {totalReactionCount} reaction{totalReactionCount !== 1 ? "s" : ""}
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
      <div className="flex px-6 items-center gap-4 py-5 border-b-[0.5px]">
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
          <div className="flex flex-col justify-center gap-1.5 font-primary">
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
              <div className="w-[18px] h-[18px] rounded-full">
                <CustomImage
                  src={reviewDetails?.createdBy?.profileImage}
                  alt="Profile"
                  className="w-full h-full rounded-full"
                  fallbackText={reviewDetails?.createdBy?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
                />
              </div>
              <div>By {reviewDetails?.createdBy?.name}</div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                Date & time:{" "}
                {getFormattedDateTime(reviewDetails?.scenario?.createdAt, "MMM dd, yyyy hh:mm a")}
              </div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                Duration:{" "}
                {getFormattedTimeFromDuration(reviewDetails?.scenarioSession?.duration, "mm:ss")}{" "}
                Min
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full h-[calc(100%-103px)]">
        <div className="pt-5 mx-auto px-10 h-full w-[calc(100%-384px)] overflow-y-auto pb-20 transition-all duration-400">
          <Transcription
            commentsList={
              threads.find(
                thread =>
                  thread.selection.messageId === parseInt(selectedMessageId) &&
                  thread.id === selectedThreadId,
              )?.comments
            }
            handleCommentClick={handleCommentClick}
            createComment={onCreateComment}
            isCreateCommentLoading={isCreateCommentLoading}
            isCreateCommentSuccess={isCreateCommentSuccess}
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
          threads={threads as Thread[]}
          totalComments={reviewDetails?.commentsCount || 0}
          isOpen={showCommentsSidepanel}
          onCommentClick={handleCommentClick}
          className={showCommentsSidepanel ? "w-96" : "w-0 border-none"}
        />
      </div>
      {renderBottomSection()}

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
