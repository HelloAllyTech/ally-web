import { useEffect, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { useGetReviewByIdQuery, useGetReviewDetailsWithMessagesQuery } from "@api";
import { AccountCircle, ChatBubble, LeftArrow, Smiley } from "@assets";
import ReviewCommentsSidepanel from "@components/review-comments-sidepanel/ReviewCommentsSidepanel";
import Transcription from "@components/transcription";
import { PLATFORM_EMOJIS } from "@constants";
import { RootState } from "@store";
import { SimulationTranscriptMessage } from "@types";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

import { THREAD_LIST, HEADING } from "./dummy";
import { Thread } from "./types";
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
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
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

  useEffect(() => {
    setTranscriptList([]);
  }, [reviewId]);

  useEffect(() => {
    if (simulationTranscript?.length > 0) {
      setTranscriptList(prev => [...prev, ...simulationTranscript]);
    }
  }, [simulationTranscript]);

  const handleGoBack = () => {
    navigate(-1);
  };
  const getTotalReactions = () => {
    const reactionsCount = Object.values(HEADING.reactions).reduce((acc, curr) => acc + curr, 0);
    if (reactionsCount > 999) {
      const count = Number((reactionsCount / 1000).toFixed(1));
      return `${count}k`;
    }
    return reactionsCount;
  };

  const handleEmojiClick = (emoji: string) => {
    if (selectedEmoji === emoji) {
      setSelectedEmoji("");
    } else {
      setSelectedEmoji(emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleCommentClick = (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
  }) => {
    setSelectedMessageId(props.messageId);
    setSelectedStartIndex(props.startIndex);
    setSelectedEndIndex(props.endIndex);
  };

  const handleCloseSelectedComment = () => {
    setSelectedMessageId("");
    setSelectedStartIndex(0);
    setSelectedEndIndex(0);
  };

  const handleLoadMore = () => {
    if (transcriptOffset >= simulationTranscript?.messages?.length) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
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
            <div className="text-xl font-medium text-typography-900">
              {reviewDetails?.scenario?.title}
            </div>
            <div className="flex gap-2 items-center text-gray-500">
              <div className="w-4 h-4 rounded-full">
                {reviewDetails?.createdBy?.profileUrl ? (
                  <CustomImage
                    src={reviewDetails?.createdBy?.profileUrl}
                    alt="Profile"
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <AccountCircle className="w-4 h-4 text-neutral-500" />
                )}
              </div>
              <div>By {reviewDetails?.createdBy?.name}</div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                Date & time:{" "}
                {getFormattedDateTime(reviewDetails?.scenario?.createdAt, "MMM dd, yyyy hh:mm a")}
              </div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                Duration: {getFormattedTimeFromDuration(reviewDetails?.scenario?.duration, "mm:ss")}{" "}
                Min
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full h-[calc(100%-103px)]">
        <div className="pt-5 mx-auto px-10 h-full w-[calc(100%-384px)] overflow-y-auto pb-20 transition-all duration-400">
          <Transcription
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
          threads={THREAD_LIST as Thread[]}
          totalComments={THREAD_LIST.reduce((acc, thread) => acc + thread.comments.length, 0)}
          isOpen={showCommentsSidepanel}
          onCommentClick={handleCommentClick}
          className={showCommentsSidepanel ? "w-96" : "w-0 border-none"}
        />
      </div>
      <div className="absolute flex justify-center bottom-9 left-0 right-0 w-full">
        <div className="p-2 pr-3 h-14 rounded-full border flex items-center gap-2 bg-white shadow-2xl">
          {reviewDetails?.commentsCount > 0 && (
            <div
              onClick={() => setShowCommentsSidepanel(!showCommentsSidepanel)}
              className="group flex items-center h-full w-fit cursor-pointer hover:border-[#0957D0] gap-2.5 rounded-full border justify-center px-3"
            >
              <ChatBubble className="w-6 h-6 text-neutral-600 group-hover:text-[#0957D0]" />
              <div className="text-typography-900 font-primary group-hover:text-[#0957D0]">
                Comments
              </div>
            </div>
          )}
          <div className="relative w-fit">
            <div
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex relative items-center h-9 min-w-9 rounded-full border cursor-pointer hover:border-[#0957D0] justify-center"
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
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-full w-fit p-2 border-[0.5px] bg-white flex gap-1 items-center shadow-lg">
                {PLATFORM_EMOJIS.map((emoji, index) => (
                  <div
                    key={index}
                    onClick={() => handleEmojiClick(emoji)}
                    style={{ borderColor: selectedEmoji === emoji ? "#0957D0" : "" }}
                    className="hover:scale-[2] bg-white transition-all origin-bottom duration-400 w-[26px] h-[26px] pb-1.5 flex items-center justify-center overflow-visible cursor-pointer rounded-full border-[0.5px] border-neutral-300"
                  >
                    <Emoji unified={emoji} size={13} emojiStyle={EmojiStyle.NATIVE} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 justify-between w-full">
            <div className="flex">
              {Object.keys(HEADING.reactions).map((reaction, index) => (
                <div key={index} className="w-[18px] overflow-visible">
                  <div
                    className="relative pb-1.5 left-0 w-[26px] bg-white rounded-full border-[0.5px] h-[26px] flex items-center justify-center text-[14px]"
                    style={{ zIndex: 10 - index }}
                  >
                    <Emoji unified={reaction} size={13} emojiStyle={EmojiStyle.NATIVE} />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-typography-900 text-[12px] font-primary whitespace-nowrap">
              {getTotalReactions()} reactions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
