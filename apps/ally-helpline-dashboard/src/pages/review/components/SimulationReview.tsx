import { FC, useState, useEffect } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { useGetReviewsQuery } from "@api";
import { NoResults } from "@assets";
import { FallbackUI } from "@components";
import FeedCard from "@components/feed-card";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS, REVIEW_ACTOR_TYPE, ROUTES } from "@constants";
import { useAnalytics, useUser } from "@hooks";
import { ReviewItem } from "@types";

import { PAGE_SIZE, SKELETON_COUNT } from "../constants";
import { itemVariants } from "../constants";
import EmptyState from "./EmptyState";
import FeedCardSkeleton from "./FeedCardSkeleton";
import { SimulationReviewProps } from "../types";

const SkeletonList: FC = () => (
  <>
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <FeedCardSkeleton key={index} />
    ))}
  </>
);

const SimulationReview: FC<SimulationReviewProps> = ({
  readFilter,
  sortBy,
  scenarioId,
  excludeOwn,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { track } = useAnalytics();
  const { user } = useUser();

  const [offset, setOffset] = useState(0);
  const [feedData, setFeedData] = useState<ReviewItem[]>([]);
  const [expandedViewMoreIds, setExpandedViewMoreIds] = useState<Set<string>>(new Set());

  const {
    data: simulationReviewsData,
    isFetching: isSimulationReviewsFetching,
    refetch: refetchSimulationReviews,
    error: simulationReviewsError,
  } = useGetReviewsQuery({
    limit: PAGE_SIZE,
    offset,
    sortBy,
    readFilter,
    languageCode: i18n.language,
    ...(scenarioId ? { scenarioId } : {}),
    ...(excludeOwn ? { excludeOwn: true } : {}),
  });

  useEffect(() => {
    setOffset(0);
    setFeedData([]);
  }, [readFilter, sortBy, i18n.language, scenarioId, excludeOwn]);

  useEffect(() => {
    if (!simulationReviewsData?.data) return;
    if (offset === 0) {
      setFeedData(simulationReviewsData.data);
    } else {
      setFeedData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = simulationReviewsData.data.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [simulationReviewsData, offset]);

  const hasMore = simulationReviewsData ? offset + PAGE_SIZE < simulationReviewsData.count : true;

  const handleLoadMore = () => {
    if (!hasMore || isSimulationReviewsFetching || feedData.length === 0) return;
    setOffset(prev => prev + PAGE_SIZE);
  };

  const handleTapViewMore = (cardId: string) => {
    setExpandedViewMoreIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const onReviewTranscript = (item: ReviewItem) => {
    track(ANALYTICS_EVENTS.REVIEW_CONVERSATION_OPENED, {
      [ANALYTICS_PROPS.REVIEW_ID]: item.id,
      [ANALYTICS_PROPS.SIMULATION_NAME]: item.scenario?.title,
      // `reviewer_name` is not on the inbox payload — the list only carries who
      // SHARED the session, not who reviewed it. Left off rather than filled
      // with the sharer's name, which would read as the reviewer in PostHog.
      // Same gap applies to actor_type below: `item` has no field for the
      // session's actual owner, only `createdBy` (who shared it), so a
      // share-on-someone-else's-behalf case is misclassified until the
      // payload carries the real owner id.
      [ANALYTICS_PROPS.ACTOR_TYPE]:
        user?.id === item.createdBy?.id ? REVIEW_ACTOR_TYPE.LEARNER : REVIEW_ACTOR_TYPE.REVIEWER,
    });
    navigate(ROUTES.SIMULATION_REVIEW_DETAILS?.replace(":reviewId", item.id));
  };

  const isInitialLoading = isSimulationReviewsFetching && feedData.length === 0;
  const isEmpty =
    !isSimulationReviewsFetching &&
    feedData.length === 0 &&
    simulationReviewsData?.data?.length === 0;
  const isLoadingMore = isSimulationReviewsFetching && feedData.length > 0;

  if (simulationReviewsError) {
    return (
      <div className="flex h-[80vh] sm:h-[90vh] items-center justify-center px-4 sm:px-6">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("review.error.title")}
          description={t("review.error.description")}
          button={{
            text: t("review.error.retry"),
            onClick: refetchSimulationReviews,
          }}
        />
      </div>
    );
  }

  if (isInitialLoading) return <SkeletonList />;
  if (isEmpty) return <EmptyState onRefresh={refetchSimulationReviews} />;

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
            onReviewTranscript={() => onReviewTranscript(item)}
            duration={item.scenarioSession?.duration}
            dateTime={item.scenarioSession?.createdAt}
            badgeBgColor="#ede4e8"
            badgeTextColor="#5a3f50"
            badgeText={t("common.simulation", "Simulation")}
            isEdited={item.isEdited}
            isReviewed={item.isReviewed}
            isViewMoreExpanded={expandedViewMoreIds.has(item.id)}
            onTapViewMore={() => handleTapViewMore(item.id)}
            note={item.note}
            audioUrl={item.scenarioSession?.audioUrl}
          />
        </motion.div>
      ))}
      {isLoadingMore && <FeedCardSkeleton />}
    </InfiniteScroll>
  );
};

export default SimulationReview;
