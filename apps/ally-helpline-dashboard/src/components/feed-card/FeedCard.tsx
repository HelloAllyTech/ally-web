import { FC, useMemo, useState, useRef, useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { CustomImage, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useLazyGetGeneralCommentsOverviewQuery, useLazyGetReviewThreadsQuery } from "@api";
import { ReviewTranscript, ScribeImage } from "@assets";
import { ReactionsModal } from "@components";
import { useUser } from "@hooks";
import { getFormattedTimeFromDuration, formatDateTime, formatRelativeTime } from "@utils";

import CommentsSection from "./CommentsSection";
import EmojiStack from "./EmojiStack";
import { FeedCardProps } from "./types";

const FeedCard: FC<FeedCardProps> = ({
  id,
  createdAt,
  user,
  scenario,
  reactions,
  commentsCount,
  note,
  onReviewTranscript,
  duration,
  dateTime,
  badgeBgColor,
  badgeTextColor,
  badgeText,
  isEdited = false,
  isViewMoreExpanded = false,
  isScribeReview,
  onTapViewMore,
  scribeSummaryName,
}) => {
  const { user: currentDetails } = useUser();
  const { t } = useTranslation();

  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const titleMeasureRef = useRef<HTMLDivElement>(null);
  const descriptionMeasureRef = useRef<HTMLDivElement>(null);
  const [isTitleTwoLines, setIsTitleTwoLines] = useState(false);
  const [shouldShowViewMoreButton, setShouldShowViewMoreButton] = useState(false);

  const descriptionMaxLines = isTitleTwoLines ? 1 : 2;
  const descriptionLineClampClass = isViewMoreExpanded
    ? ""
    : isTitleTwoLines
      ? "line-clamp-1"
      : "line-clamp-2";

  useEffect(() => {
    const el = titleMeasureRef.current;
    if (!el || scenario?.title == null) {
      setIsTitleTwoLines(false);
      return;
    }
    setIsTitleTwoLines(el.scrollHeight > el.clientHeight);
  }, [scenario?.title]);

  useEffect(() => {
    const el = descriptionMeasureRef.current;
    if (!el || scenario?.description == null) {
      setShouldShowViewMoreButton(false);
      return;
    }
    setShouldShowViewMoreButton(el.scrollHeight > el.clientHeight);
  }, [scenario?.description, descriptionMaxLines]);

  const formattedDateTime = formatDateTime(dateTime);
  const relativeTime = formatRelativeTime(createdAt, t);

  const entries = Object.entries(reactions ?? {});
  const unicodeCodes = entries.map(([code]) => code);
  const totalReactionCount = entries.reduce((sum, [, count]) => sum + count, 0);

  const [fetchReviewThreads, { data: reviewThreadsData, isLoading: isReviewThreadsLoading }] =
    useLazyGetReviewThreadsQuery();

  const [
    fetchGeneralCommentsOverview,
    { data: generalCommentsData, isLoading: isGeneralCommentsLoading },
  ] = useLazyGetGeneralCommentsOverviewQuery();

  const comments = useMemo(() => {
    if (FEATURE_FLAGS_MAP?.GENERAL_COMMENTS_FLAG) {
      return generalCommentsData?.data ?? [];
    }
    return reviewThreadsData?.data?.flatMap(thread => thread.comments) ?? [];
  }, [reviewThreadsData, generalCommentsData]);

  const handleCommentsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const willExpand = !isCommentsExpanded;
    if (willExpand && id) {
      if (FEATURE_FLAGS_MAP?.GENERAL_COMMENTS_FLAG) {
        fetchGeneralCommentsOverview({
          reviewId: id,
          limit: 2,
          offset: 0,
          isScribe: isScribeReview ?? false,
        });
      } else {
        fetchReviewThreads({ id, limit: 2, offset: 0 });
      }
    }
    setIsCommentsExpanded(willExpand);
  };

  const handleReactionsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsReactionsModalOpen(true);
  };

  const handleCloseReactionsModal = () => {
    setIsReactionsModalOpen(false);
  };

  const collapseComments = () => {
    setIsCommentsExpanded(false);
  };

  const fallbackText = () => {
    if (user?.name?.length > 1) {
      return user?.name?.slice(0, 1)?.toUpperCase();
    }
    if (user?.name?.length === 1) {
      return user?.name?.toUpperCase();
    }
    return "NA";
  };

  const divider = () => {
    return <div className="w-full h-[0.5px] bg-[#D2D2D2]" />;
  };

  const userImage = useMemo(() => {
    if (user?.id === currentDetails?.id) {
      return currentDetails?.profileImageUrl;
    }
    return user?.profileImage;
  }, [user, currentDetails]);

  const headerSection = () => {
    return FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG ? (
      <div className="flex items-center justify-between cursor-default">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ${!user?.profileImage ? "border border-border-light" : ""} flex items-center justify-center flex-shrink-0`}
          >
            <CustomImage
              src={userImage}
              alt={user?.name ?? ""}
              fallbackText={fallbackText()}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-primary font-medium text-sm sm:text-base leading-[1.4] text-[#1A1A1A]">
              {user?.name ?? ""}
            </span>
            <div className="flex items-center gap-1">
              <span className="font-primary text-xs sm:text-[13px] leading-[1.5] text-gray-500">
                {relativeTime}
              </span>
              {isEdited && (
                <>
                  <span className="font-primary text-xs sm:text-[13px] leading-[1.5] text-[#D1D5DB]">
                    •
                  </span>
                  <span className="font-primary text-xs sm:text-[13px] leading-[1.5] text-gray-500">
                    Edited
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-between cursor-default">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ${!user?.profileImage ? "border border-border-light" : ""} flex items-center justify-center flex-shrink-0`}
          >
            <CustomImage
              src={userImage}
              alt={user?.name ?? ""}
              fallbackText={fallbackText()}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-primary font-medium text-sm sm:text-base leading-[1.4] text-[#1A1A1A]">
              {user?.name ?? ""}
            </span>
            <span className="font-primary text-xs sm:text-[13px] leading-[1.5] text-gray-500">
              {relativeTime}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const badgeSection = () => {
    return (
      <div
        className="h-4 w-fit flex flex-col rounded-[2px] items-center justify-center px-1 py-[1.5px] text-[10px]"
        style={{
          backgroundColor: badgeBgColor ?? "#EDE7F6",
          color: badgeTextColor ?? "#7E57C2",
        }}
      >
        {badgeText}
      </div>
    );
  };

  const scenarioSection = () => {
    return FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG ? (
      <div className="flex flex-col gap-2 cursor-default">
        <div className="font-primary text-sm sm:text-base leading-5 text-[#1A1A1A]">{note}</div>
        {!isScribeReview && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-primary text-xs sm:text-[13px] leading-[1.38] text-black/60">
              {t("review.feedCard.dateTime")}: {formattedDateTime}
            </span>
            <span className="font-tertiary text-lg text-border-medium hidden sm:block">•</span>
            <span className="font-primary text-xs sm:text-[13px] leading-4 text-black/60">
              {duration < 60
                ? `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(duration, "ss")} ${t("review.feedCard.sec")}`
                : `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(duration, "mm:ss")} ${t("review.feedCard.min")}`}
            </span>
          </div>
        )}

        <div className="border-[0.5px] rounded-[12px] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4">
            <div
              className={`flex-shrink-0 w-full sm:w-[200px] rounded-[4px] overflow-hidden ${isScribeReview ? "h-[95px] sm:h-[85px]" : "h-[120px] sm:h-[110px]"}`}
            >
              {isScribeReview ? (
                <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded-[8px]">
                  <ScribeImage className="w-full h-full object-cover" />
                </div>
              ) : (
                <CustomImage
                  src={scenario?.coverImageUrl}
                  alt={scenario?.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div
              className={`flex flex-col justify-center flex-1 min-w-0 relative overflow-hidden ${isScribeReview ? "sm:min-h-[85px]" : "sm:min-h-[110px]"}`}
            >
              {badgeText && badgeText.length > 0 && badgeSection()}
              {/* Hidden: measure if title wraps to 2 lines (overflow 1 line) */}
              <div
                ref={titleMeasureRef}
                aria-hidden
                className="font-primary text-sm sm:text-lg sm:leading-[1.3] text-[#1A1A1A] line-clamp-1 absolute left-0 right-0 top-0 opacity-0 pointer-events-none select-none"
              >
                {scenario?.title}
              </div>
              <div className="overflow-hidden font-primary text-sm sm:text-lg sm:leading-[1.3] text-[#1A1A1A] py-1 sm:py-2 line-clamp-2">
                {isScribeReview ? scribeSummaryName : scenario?.title}
              </div>
              {/* Hidden: measure if description overflows 1 or 2 lines */}
              <div
                ref={descriptionMeasureRef}
                aria-hidden
                className={`font-primary text-xs sm:text-sm text-black/60 sm:leading-[1.3] absolute left-0 right-0 top-0 opacity-0 pointer-events-none select-none ${descriptionMaxLines === 1 ? "line-clamp-1" : "line-clamp-2"}`}
              >
                {scenario?.description}
              </div>
              <div
                className={`font-primary text-xs sm:text-sm text-black/60 sm:leading-[1.3] ${descriptionLineClampClass} ${isScribeReview ? "whitespace-pre-wrap" : ""}`}
              >
                {isScribeReview
                  ? `Date & time: ${formattedDateTime}   Duration: ${
                      duration < 60
                        ? `${getFormattedTimeFromDuration(duration, "ss")} ${t("review.feedCard.sec")}`
                        : `${getFormattedTimeFromDuration(duration, "mm:ss")} ${t("review.feedCard.min")}`
                    }`
                  : scenario?.description}
              </div>

              {shouldShowViewMoreButton && renderShowMoreLess()}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-2 cursor-default">
        <div className="font-primary text-sm sm:text-base leading-5 text-[#1A1A1A]">{note}</div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-primary text-xs sm:text-[13px] leading-[1.38] text-black/60">
            {t("review.feedCard.dateTime")}: {formattedDateTime}
          </span>
          <span className="font-tertiary text-lg text-border-medium hidden sm:block">•</span>
          <span className="font-primary text-xs sm:text-[13px] leading-4 text-black/60">
            {duration < 60
              ? `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(duration, "ss")} ${t("review.feedCard.sec")}`
              : `${t("review.feedCard.duration")}: ${getFormattedTimeFromDuration(duration, "mm:ss")} ${t("review.feedCard.min")}`}
          </span>
        </div>

        <div className="border-[0.5px] rounded-[12px] overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="flex-shrink-0 w-full sm:w-[200px] h-[120px] sm:h-[100px] rounded-[4px] overflow-hidden">
              {isScribeReview ? (
                <ScribeImage />
              ) : (
                <CustomImage
                  src={scenario?.coverImageUrl}
                  alt={scenario?.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex flex-col justify-start gap-1 sm:gap-2 flex-1 min-w-0">
              <div className="text-xs bg-[#EDE7F6] text-[#7E57C2] px-2 w-fit font-normal rounded-[3px]">
                Simulation
              </div>
              <h4 className="font-primary text-sm sm:text-base leading-[1.3] text-[#1A1A1A]">
                {scenario?.title}
              </h4>
              <p className="font-primary text-xs sm:text-sm leading-[1.3] text-black/60 line-clamp-3 sm:line-clamp-none">
                {scenario?.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShowMoreLess = () => {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="font-primary text-xs sm:text-sm sm:leading-[1.3] mt-1 font-medium text-primary-500"
        >
          <button
            data-testid="resource-card-toggle-button"
            className={`text-sm transition-colors`}
            onClick={e => {
              e.stopPropagation();
              onTapViewMore();
            }}
          >
            {isViewMoreExpanded ? (
              <div className="flex items-center" data-testid="resource-card-view-less">
                {"View less"}
              </div>
            ) : (
              <div className="flex items-center" data-testid="resource-card-view-more">
                {"View more"}
              </div>
            )}
          </button>
        </motion.div>
      </AnimatePresence>
    );
  };

  const reviewTranscriptSection = () => {
    return (
      <button
        onClick={onReviewTranscript}
        className="flex cursor-pointer items-center justify-center gap-2 sm:gap-2.5 py-2 px-3"
      >
        <ReviewTranscript className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="font-tertiary font-medium text-sm sm:text-base leading-[1.3] text-primary-500">
          {t("review.feedCard.reviewTranscript")}
        </span>
      </button>
    );
  };

  const reactionsAndCommentsCountSection = () => {
    return (
      <div className="flex items-center justify-between gap-2">
        {totalReactionCount > 0 && (
          <button
            onClick={handleReactionsClick}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <EmojiStack unicodeCodes={unicodeCodes} />
            <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800 truncate">
              {totalReactionCount}{" "}
              {totalReactionCount !== 1
                ? t("review.feedCard.reactions_plural")
                : t("review.feedCard.reactions")}
            </span>
          </button>
        )}
        {commentsCount > 0 && (
          <button
            onClick={handleCommentsClick}
            className="ml-auto font-primary font-medium text-xs sm:text-sm leading-[1.5] text-typography-800 hover:underline flex-shrink-0"
          >
            {commentsCount}{" "}
            {commentsCount !== 1
              ? t("review.feedCard.comments_plural")
              : t("review.feedCard.comments")}
          </button>
        )}
      </div>
    );
  };

  const renderCommentsSection = () => {
    if (isReviewThreadsLoading || isGeneralCommentsLoading)
      return (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
        </div>
      );
    if (comments.length > 0)
      return (
        <CommentsSection
          comments={comments}
          collapseComments={collapseComments}
          handleShowMore={generalCommentsData?.count > 2 ? () => onReviewTranscript() : null}
        />
      );
    return (
      <div className="flex items-center justify-center py-4">
        <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800">
          No comments yet
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="w-full bg-white font-primary rounded-[16px] border-[0.5px] border-border flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 shadow-[2.13px_2.84px_7.81px_0px_rgba(160,158,158,0.1),8.52px_11.36px_14.2px_0px_rgba(160,158,158,0.09)]">
        <div className="flex flex-col gap-3 sm:gap-4 w-full">
          {headerSection()}

          {divider()}

          {scenarioSection()}

          {reviewTranscriptSection()}

          {(totalReactionCount > 0 || commentsCount > 0) && (
            <>
              {divider()}
              {reactionsAndCommentsCountSection()}
            </>
          )}

          {isCommentsExpanded && renderCommentsSection()}
        </div>
      </div>

      <ReactionsModal
        isOpen={isReactionsModalOpen}
        onClose={handleCloseReactionsModal}
        reviewId={id}
        isScribeReview={isScribeReview}
      />
    </>
  );
};

export default FeedCard;
