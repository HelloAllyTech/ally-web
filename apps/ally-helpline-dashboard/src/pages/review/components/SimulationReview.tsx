import { FC, useState } from "react";

import { motion } from "framer-motion";

import InfiniteScroll from "@ally-ui-mono/ui-shared/lib/infinite-scroll";
import FeedCard, { Comment } from "@components/feed-card";

import { itemVariants } from "../constants";
import FeedCardSkeleton from "./FeedCardSkeleton";
import { SimulationReviewProps } from "../types";

const SimulationReview: FC<SimulationReviewProps> = ({
  handleLoadMore,
  isLoadingMore,
  feedData,
  selectedReviewId,
  reviewThreadsData,
  onReviewTranscript,
  onCommentsClick,
  isReviewThreadsLoading,
}) => {
  const [expandedViewMoreIds, setExpandedViewMoreIds] = useState<Set<string>>(new Set());

  const handleTapViewMore = (cardId: string) => {
    setExpandedViewMoreIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const getCommentsList = (): Comment[] => {
    let comments: Comment[] = [];
    if (reviewThreadsData?.data?.length === 0) {
      return [];
    }
    comments = reviewThreadsData?.data?.flatMap(thread => thread.comments) ?? [];

    if (comments.length < 2) {
      return comments;
    } else {
      return comments.slice(0, 2);
    }
  };

  return (
    <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isLoadingMore}>
      {feedData.map((item, index) => (
        <motion.div
          key={item.id}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
          className="w-full"
        >
          <FeedCard
            id={item.id}
            createdAt={item.createdAt}
            user={item.createdBy}
            scenario={item.scenario}
            reactions={item.reactions}
            commentsCount={item.commentsCount}
            comments={selectedReviewId === item.id ? getCommentsList() : []}
            isCommentsLoading={selectedReviewId === item.id && isReviewThreadsLoading}
            isCommentsExpanded={selectedReviewId === item.id}
            onReviewTranscript={() => onReviewTranscript(item.id)}
            onCommentsClick={() => onCommentsClick(item.id)}
            duration={item.scenarioSession?.duration}
            dateTime={item.scenarioSession?.createdAt}
            badgeBgColor="#EDE7F6"
            badgeTextColor="#7E57C2"
            badgeText="Simulation"
            isEdited={item.isEdited}
            isViewMoreExpanded={expandedViewMoreIds.has(item.id)}
            onTapViewMore={() => handleTapViewMore(item.id)}
          />
        </motion.div>
      ))}
      {isLoadingMore && <FeedCardSkeleton />}
    </InfiniteScroll>
  );
};

export default SimulationReview;
