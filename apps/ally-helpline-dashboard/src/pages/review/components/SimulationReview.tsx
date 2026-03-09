import { FC, useState } from "react";

import { motion } from "framer-motion";

import InfiniteScroll from "@ally-ui-mono/ui-shared/lib/infinite-scroll";
import FeedCard from "@components/feed-card";

import { itemVariants } from "../constants";
import FeedCardSkeleton from "./FeedCardSkeleton";
import { SimulationReviewProps } from "../types";

const SimulationReview: FC<SimulationReviewProps> = ({
  handleLoadMore,
  isLoadingMore,
  feedData,
  onReviewTranscript,
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
            onReviewTranscript={() => onReviewTranscript(item.id)}
            duration={item.scenarioSession?.duration}
            dateTime={item.scenarioSession?.createdAt}
            badgeBgColor="#EDE7F6"
            badgeTextColor="#7E57C2"
            badgeText="Simulation"
            isEdited={item.isEdited}
            isViewMoreExpanded={expandedViewMoreIds.has(item.id)}
            onTapViewMore={() => handleTapViewMore(item.id)}
            note={item.note}
          />
        </motion.div>
      ))}
      {isLoadingMore && <FeedCardSkeleton />}
    </InfiniteScroll>
  );
};

export default SimulationReview;
