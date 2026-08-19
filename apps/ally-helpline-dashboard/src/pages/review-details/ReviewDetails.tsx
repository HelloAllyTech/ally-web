import { useEffect, useMemo, useRef, useState } from "react";

import { differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { CustomImage, SimulationDetailsModal } from "@ally-ui-mono/ui-shared";
import {
  useAddReactionMutation,
  useGetGeneralCommentsQuery,
  useGetReviewByIdQuery,
  useGetReviewDetailsWithMessagesQuery,
  useUpdateReviewMutation,
  useMarkReviewAsReadMutation,
  useUpdateScribeReviewMutation,
} from "@api";
import { baseAPI } from "@api/baseAPI";
import { ChatBubble, LeftArrow, Smiley, InfoIcon } from "@assets";
import {
  ReactionSelector,
  AudioTranscriptPlayer,
  EmojiStack,
  ReactionsModal,
  ReviewCommentsSidepanel,
  Transcription,
  NativeEmoji,
  ShareForReview,
  ToggleSwitch,
  AddReviewNote,
  GeneralCommentsToShow,
} from "@components";
import { TagType } from "@components/share-for-review/ShareForReview";
import { KeyboardKeys, REVIEW_PRIVACY_OPTIONS_VALUES, TAG_TYPES } from "@constants";
import { RootState } from "@store";
import {
  CommentChangeParams,
  CommentItem,
  ReactionsType,
  ShareForReviewsInput,
  ShareForReviewsScribeInput,
  SimulationTranscriptMessage,
  Thread,
} from "@types";
import { getFormattedDate, getFormattedTimeFromDuration } from "@utils";

import Loader from "./Loader";
import { GENERAL_COMMENTS_PAGE_SIZE, TRANSCRIPT_PAGE_SIZE } from "../calls/components/constants";

export const ReviewDetails = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { user } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const isScribeReview = pathname.includes("scribe-review");

  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deletedReplyId, setDeletedReplyId] = useState<string | null>(null);
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
  const [hasMoreGeneralComments, setHasMoreGeneralComments] = useState(true);
  const [generalComments, setGeneralComments] = useState<CommentItem[]>([]);
  const [generalCommentsOffset, setGeneralCommentsOffset] = useState(0);
  const [changedReply, setChangedReply] = useState<CommentItem | null>(null);
  const [showShareForReviewModal, setShowShareForReviewModal] = useState<boolean>(false);

  const selectEmojiRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: reviewDetails, isLoading: isGetReviewDetailsLoading } = useGetReviewByIdQuery(
    { id: reviewId || "", isScribe: isScribeReview, languageCode: i18n.language },
    {
      skip: !reviewId,
    },
  );

  const { data: simulationTranscript, isLoading: isGetTranscriptLoading } =
    useGetReviewDetailsWithMessagesQuery({
      id: reviewId || "",
      offset: transcriptOffset,
      limit: TRANSCRIPT_PAGE_SIZE,
      sortBy: "startSeconds",
      isScribe: isScribeReview,
      languageCode: i18n.language,
    });

  const { data: generalCommentsList, isLoading: isGetGeneralCommentsLoading } =
    useGetGeneralCommentsQuery({
      reviewId: reviewId || "",
      limit: GENERAL_COMMENTS_PAGE_SIZE,
      offset: generalCommentsOffset,
      isScribe: isScribeReview,
    });
  const [addReactions] = useAddReactionMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();
  const [updateScribeReview] = useUpdateScribeReviewMutation();
  const [markReviewAsRead] = useMarkReviewAsReadMutation();

  useEffect(() => {
    return () => {
      dispatch(baseAPI.util.invalidateTags([TAG_TYPES.REVIEW]));
      dispatch(baseAPI.util.invalidateTags([TAG_TYPES.GENERAL_COMMENTS]));
    };
  }, []);

  useEffect(() => {
    if (!reviewId) return undefined;
    const timer = setTimeout(() => {
      markReviewAsRead({ id: reviewId, isScribe: isScribeReview });
    }, 10000);
    return () => clearTimeout(timer);
  }, [reviewId, isScribeReview]);
  useEffect(() => {
    setTranscriptList([]);
    setTranscriptOffset(0);
  }, [reviewId, i18n.language]);

  useEffect(() => {
    if (reviewDetails?.myReaction?.length > 0) {
      setSelectedEmoji(reviewDetails?.myReaction);
    }
  }, [reviewDetails]);

  const isFeedOwner = useMemo(() => {
    return user?.id === reviewDetails?.createdBy?.id;
  }, [user?.id, reviewDetails?.createdBy?.id]);

  const timeDiff = useMemo(() => {
    return differenceInMinutes(new Date(), new Date(reviewDetails?.createdAt));
  }, [reviewDetails?.createdAt]);

  useEffect(() => {
    if (simulationTranscript) {
      if (simulationTranscript.length > 0) {
        setTranscriptList(prev => {
          if (transcriptOffset > 0) {
            // For pagination, filter out any duplicates before appending
            const existingIds = new Set((prev || []).map(item => item.id));
            const newItems = simulationTranscript.filter(item => !existingIds.has(item.id));
            return [...(prev || []), ...newItems];
          } else {
            // For initial load, replace the list
            return [...simulationTranscript];
          }
        });
        setHasMoreTranscripts(simulationTranscript.length >= TRANSCRIPT_PAGE_SIZE);
      } else {
        setHasMoreTranscripts(false);
      }
    }
  }, [simulationTranscript]);

  useEffect(() => {
    if (generalCommentsList?.data) {
      if (generalCommentsList.data.length > 0) {
        setGeneralComments(prev => {
          if (generalCommentsOffset > 0) {
            const existingIds = new Set((prev || []).map(item => item.id));
            const newItems = generalCommentsList.data.filter(item => !existingIds.has(item.id));
            return [...(prev || []), ...newItems];
          } else {
            return [...generalCommentsList.data];
          }
        });
        setHasMoreGeneralComments(true);
      } else {
        setHasMoreGeneralComments(false);
      }
    }
  }, [generalCommentsList]);

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

  const handleReplyChange = (reply: CommentItem) => {
    setChangedReply(reply);
  };
  const handleCommentChange = ({
    comments,
    threadId,
    transcript: transcriptData,
    selection,
    isThreadExists = true,
  }: CommentChangeParams) => {
    if (threadId) {
      setTranscriptList(prev => {
        const newTranscriptList = prev.map(transcript => {
          // If transcript data is provided, only update the matching transcript
          if (transcriptData && transcript.id !== transcriptData.id) {
            return transcript;
          }

          // const uniqueComments = comments.filter(
          //   (comment, index) => comments.lastIndexOf(comment) === index,
          // );
          const threads = isThreadExists
            ? transcript.threads?.map(thread =>
                thread.id === threadId
                  ? {
                      ...thread,
                      comments: [...(comments || [])],
                    }
                  : thread,
              )
            : [
                ...(transcript.threads || []),
                {
                  id: threadId,
                  comments: comments || [],
                  selection: selection,
                },
              ];
          return { ...transcript, threads: threads.filter(thread => thread.comments.length > 0) };
        });
        return [...newTranscriptList];
      });
    }
  };

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
      isScribe: isScribeReview,
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
      toast.error(
        error?.data?.message || t("review.details.reactionFailed", "Failed to add reaction"),
      );
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

  const handleGeneralCommentsLoadMore = () => {
    if (!hasMoreGeneralComments || isGetGeneralCommentsLoading) return;
    setGeneralCommentsOffset(prev => prev + GENERAL_COMMENTS_PAGE_SIZE);
  };

  const handleReactionsClick = () => {
    setShowReactionsModal(true);
  };

  const handleCreateReview = async ({ status, note }: { status?: string; note?: string }) => {
    if (!reviewDetails?.id) return;

    const isExpired = differenceInMinutes(new Date(), new Date(reviewDetails?.createdAt)) > 10;
    const normalizedNote = note?.trim() || null;
    if (isScribeReview) {
      const params: ShareForReviewsScribeInput = {
        scribeSessionId: reviewDetails?.id,
        status,
      };
      if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN && !isExpired)
        params.note = normalizedNote;
      await updateScribeReview(params).unwrap();
    } else {
      const params: ShareForReviewsInput = {
        scenarioSessionId: reviewDetails?.id,
        status,
      };
      if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN && !isExpired)
        params.note = normalizedNote;
      await updateReview(params).unwrap();
    }
  };

  const isNoteEditable = useMemo(() => {
    return isFeedOwner && timeDiff < 10;
  }, [isFeedOwner, timeDiff]);

  const onTapAddNote = () => {
    setShowShareForReviewModal(true);
  };
  const showAddReviewNotesSection = useMemo(() => {
    return isFeedOwner || (reviewDetails?.note?.length ?? 0) > 0;
  }, [isFeedOwner, reviewDetails?.note]);

  const renderBottomSection = () => {
    return (
      <div className="absolute z-10 flex justify-center bottom-9 left-0 right-0 w-full pointer-events-none">
        <div className="p-2 h-14 rounded-full border flex items-center gap-2 bg-white shadow-2xl max-w-[95vw] overflow-x-auto pointer-events-auto">
          {isFeedOwner && (
            <div
              className="flex items-center gap-2 min-w-fit"
              style={{ opacity: isUpdateReviewLoading ? 0.5 : 1 }}
            >
              <span className="ml-1 font-primary font-regular text-base leading-[1.3] text-[#1A1A1A]">
                {t("review.privacy.share")}
              </span>
              <ToggleSwitch
                enabled={reviewDetails?.reviewStatus === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW}
                onChange={(value: boolean) =>
                  handleCreateReview(
                    value
                      ? {
                          status: REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW,
                          note: reviewDetails?.note,
                        }
                      : { status: REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN },
                  )
                }
              />
              <div className="border-l border-border h-5" />
            </div>
          )}
          <div
            onClick={() => setShowCommentsSidepanel(!showCommentsSidepanel)}
            className="group flex items-center h-full w-fit cursor-pointer hover:border-[#0957D0] gap-2.5 rounded-full border justify-center px-3 shrink-0"
          >
            <ChatBubble className="w-5 h-5 text-neutral-600 group-hover:text-[#0957D0] shrink-0" />
            <div className="text-typography-900 font-primary group-hover:text-[#0957D0] text-sm whitespace-nowrap">
              {t("review.details.comments")}
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
                  <NativeEmoji unified={selectedEmoji} size={16} />
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
          {reviewReactions?.length > 0 && (
            <div className="flex items-center gap-3 justify-between w-full">
              <button
                onClick={handleReactionsClick}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <EmojiStack unicodeCodes={reviewReactions} />
                <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800 truncate">
                  {displayTotalReactionCount}{" "}
                  {reviewReactions?.length !== 1
                    ? t("review.feedCard.reactions_plural")
                    : t("review.feedCard.reactions")}
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
          <Loader />
        ) : (
          <div className="flex flex-col justify-center gap-1.5 font-primary">
            <div className="font-medium text-typography-900 flex flex-row items-center">
              <div
                className={`text-[10px] font-normal ${isScribeReview ? "bg-[#FFF3E0] text-[#E65100]" : "bg-[#EDE7F6] text-[#7E57C2]"} px-1 py-[1.5px] rounded-[2px] mr-1.5`}
              >
                {isScribeReview ? t("common.scribe") : t("common.simulation")}
              </div>
              <span className="text-xl line-clamp-1">
                {reviewDetails?.scenario?.title || reviewDetails?.scribeSession?.summaryName}
              </span>
              {!isScribeReview && (
                <div
                  onClick={() => setShowSimulationDetailsModal(true)}
                  className="text-xs cursor-pointer text-neutral-500 ml-[4px]"
                >
                  <InfoIcon />
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center text-gray-500 text-base">
              <div className="w-[28px] h-[28px] rounded-full">
                <CustomImage
                  src={reviewDetails?.createdBy?.profileImage}
                  alt={reviewDetails?.createdBy?.name ?? t("common.profile")}
                  className="w-full h-full rounded-full"
                  fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-800"
                  fallbackText={reviewDetails?.createdBy?.name?.slice(0, 1)?.toUpperCase() ?? "--"}
                />
              </div>
              {isFeedOwner ? (
                <div>{t("review.details.you")}</div>
              ) : (
                <div>{t("review.details.by", { name: reviewDetails?.createdBy?.name })}</div>
              )}
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div>
                {t("review.details.dateAndTime")}:{" "}
                {getFormattedDate(
                  reviewDetails?.scenarioSession?.createdAt ||
                    reviewDetails?.scribeSession?.createdAt,
                  i18n.language,
                )}
              </div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div className="font-primary  leading-4 text-black/60">
                {reviewDetails?.scenarioSession?.duration < 60
                  ? `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(reviewDetails?.scenarioSession?.duration || reviewDetails?.scribeSession?.duration, "ss")} ${t("review.feedCard.sec")}`
                  : `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(reviewDetails?.scenarioSession?.duration || reviewDetails?.scribeSession?.duration, "mm:ss")} ${t("review.feedCard.min")}`}
              </div>
              <div className="w-1 h-1 bg-neutral-500 rounded-full mx-1" />
              <div className="font-primary  leading-4 text-black/60">
                {`${t("review.details.comments")} : ${reviewDetails?.commentsCount}`}
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
          {showAddReviewNotesSection && (
            <div className="pb-6">
              <AddReviewNote
                isEditable={isNoteEditable}
                note={reviewDetails?.note}
                isEdited={reviewDetails?.noteEditedAt !== null}
                onAddNote={onTapAddNote}
                onEditNote={onTapAddNote}
                reviewCreatedAt={reviewDetails?.createdAt}
              />
            </div>
          )}
          {!isScribeReview && reviewDetails?.scenarioSession?.audioUrl && (
            <div className="pb-6 rounded-[12px] border-[0.5px] px-4 py-3">
              <AudioTranscriptPlayer audioUrl={reviewDetails.scenarioSession.audioUrl} />
            </div>
          )}
          {!isScribeReview && (
            <p className="text-xs text-typography-500 pb-3">
              {t("transcription.accuracyDisclaimer")}
            </p>
          )}
          <Transcription
            councellorName={isFeedOwner ? t("review.details.you") : reviewDetails?.createdBy?.name}
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
            onCommentChange={handleCommentChange}
            isScribeReview={isScribeReview}
            mode={reviewDetails?.scribeSession?.details?.callInfo?.mode}
          />

          <div className="w-full border-t-[0.5px] border-border-light font-primary">
            <div className="w-full h-full overflow-hidden flex flex-col gap-4 pt-4">
              <div className="text-typography-800 font-medium text-lg">
                {t("review.details.comments")}
              </div>
            </div>
            <GeneralCommentsToShow
              generalComments={generalComments}
              handleLoadMore={handleGeneralCommentsLoadMore}
              hasMoreComments={hasMoreGeneralComments}
              isLoading={isGetGeneralCommentsLoading}
              setComments={setGeneralComments}
              deletedReplyId={deletedReplyId}
              setDeletedReplyId={setDeletedReplyId}
              changedReply={changedReply}
              onReplyChange={handleReplyChange}
              isFeedOwner={isFeedOwner}
              show
              isScribeReview={isScribeReview}
            />
          </div>
        </div>
        <ReviewCommentsSidepanel
          isFeedOwner={isFeedOwner}
          threads={threads as Thread[]}
          isOpen={showCommentsSidepanel}
          onCommentClick={handleCommentClick}
          generalComments={generalComments}
          isGeneralCommentsLoading={isGetGeneralCommentsLoading}
          handleGeneralCommentsLoadMore={handleGeneralCommentsLoadMore}
          hasMoreGeneralComments={hasMoreGeneralComments}
          setComments={setGeneralComments}
          className={showCommentsSidepanel ? "min-w-[300px] w-[30%]" : "w-0 border-none"}
          deletedReplyId={deletedReplyId}
          setDeletedReplyId={setDeletedReplyId}
          handleReplyChange={handleReplyChange}
          changedReply={changedReply}
          isScribeReview={isScribeReview}
        />
      </div>
      {transcriptList.length > 0 && renderBottomSection()}

      <ReactionsModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        reviewId={reviewId || ""}
        isScribeReview={isScribeReview}
      />

      <SimulationDetailsModal
        isOpen={showSimulationDetailsModal}
        title={reviewDetails?.scenario?.title}
        description={reviewDetails?.scenario?.description}
        coverImageUrl={reviewDetails?.scenario?.coverImageUrl}
        coverVideoUrl={reviewDetails?.scenario?.coverVideoUrl}
        headerTitle={t("learn.details.modal.headerTitle")}
        headerSubtitle={t("learn.details.modal.headerSubtitle")}
        scenarioLabel={t("common.scenario")}
        showActionButtons={false}
        onClickOutside={() => setShowSimulationDetailsModal(false)}
      />
      <ShareForReview
        isOpen={showShareForReviewModal}
        onClose={() => setShowShareForReviewModal(false)}
        summaryDetails={reviewDetails}
        onNoteChange={(note: string) =>
          handleCreateReview({ status: reviewDetails?.reviewStatus, note: note })
        }
        shareLabel={reviewDetails?.note?.length > 0 ? "Save report" : "Add"}
        modalHeader={reviewDetails?.note?.length > 0 ? "Edit note" : "Add note"}
        sessionCreatedAt={reviewDetails?.createdAt}
        sessionCallDuration={
          reviewDetails?.scenarioSession?.duration || reviewDetails?.scribeSession?.duration
        }
        sessionReviewCreatedAt={reviewDetails?.createdAt}
        tag={isScribeReview ? TagType.SCRIBE : TagType.SIMULATION}
      />
    </div>
  );
};
