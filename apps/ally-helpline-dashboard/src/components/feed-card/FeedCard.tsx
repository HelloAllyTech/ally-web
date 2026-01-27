import { FC, useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { ReviewTranscript } from "@assets";

import CommentsSection from "./CommentsSection";
import EmojiStack from "./EmojiStack";
import { FeedCardProps } from "./types";
import { formatDateTime, formatRelativeTime } from "./utils";
import ReactionsModal from "../reaction-modal/ReactionModal";

const FeedCard: FC<FeedCardProps> = ({
  id,
  createdAt,
  user,
  scenario,
  reactions,
  commentsCount,
  comments = [],
  isCommentsLoading = false,
  onReviewTranscript,
  onCommentsClick,
}) => {
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);

  const formattedDateTime = formatDateTime(scenario.createdAt);
  const relativeTime = formatRelativeTime(createdAt);

  const entries = Object.entries(reactions);
  const unicodeCodes = entries.map(([code]) => code);
  const totalReactionCount = entries.reduce((sum, [, count]) => sum + count, 0);

  const handleCommentsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsCommentsExpanded(!isCommentsExpanded);
    onCommentsClick?.();
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

  const divider = () => {
    return <div className="w-full h-[0.5px] bg-[#D2D2D2]" />;
  };

  const headerSection = () => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ${!user?.profileImage ? "border border-border-light" : ""} flex items-center justify-center flex-shrink-0`}
          >
            <CustomImage
              src={user.profileImage}
              alt={user?.name ?? ""}
              fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
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

  const scenarioSection = () => {
    return (
      <div className="flex flex-col gap-2">
        <div className="font-primary text-sm sm:text-base leading-5 text-[#1A1A1A]">
          Shared simulation for review
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-primary text-xs sm:text-[13px] leading-[1.38] text-black/60">
            Date &amp; time: {formattedDateTime}
          </span>
          <span className="font-tertiary text-lg text-border-medium hidden sm:block">•</span>
          <span className="font-primary text-xs sm:text-[13px] leading-4 text-black/60">
            Duration: {scenario?.duration} Min{parseInt(scenario?.duration ?? "0") !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="border-[0.5px] rounded-[12px] overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="flex-shrink-0 w-full sm:w-[200px] h-[120px] sm:h-[100px] rounded-[4px] overflow-hidden">
              <CustomImage
                src={scenario?.coverImageUrl}
                alt={scenario?.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-start gap-1 sm:gap-2 flex-1 min-w-0">
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

  const reviewTranscriptSection = () => {
    return (
      <button
        onClick={onReviewTranscript}
        className="flex cursor-pointer items-center justify-center gap-2 sm:gap-2.5 py-2 px-3"
      >
        <ReviewTranscript className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="font-tertiary font-medium text-sm sm:text-base leading-[1.3] text-primary-500">
          Review transcript
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
            className="flex items-center gap-2 text-black/60 min-w-0 hover:opacity-80 transition-opacity"
          >
            <EmojiStack unicodeCodes={unicodeCodes} />
            <span className="font-primary text-xs sm:text-sm leading-[1.5] text-typography-800 truncate">
              {totalReactionCount} reaction{totalReactionCount !== 1 ? "s" : ""}
            </span>
          </button>
        )}
        {commentsCount > 0 && (
          <button
            onClick={handleCommentsClick}
            className="ml-auto font-primary font-medium text-xs sm:text-sm leading-[1.5] text-typography-800 hover:underline flex-shrink-0"
          >
            {commentsCount} comment{commentsCount !== 1 ? "s" : ""}
          </button>
        )}
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

          {isCommentsExpanded &&
            commentsCount > 0 &&
            (isCommentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : (
              <CommentsSection comments={comments} collapseComments={collapseComments} />
            ))}
        </div>
      </div>

      <ReactionsModal
        isOpen={isReactionsModalOpen}
        onClose={handleCloseReactionsModal}
        reviewId={id}
      />
    </>
  );
};

export default FeedCard;
