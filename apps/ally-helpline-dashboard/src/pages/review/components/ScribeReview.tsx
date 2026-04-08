import { FC, useState, useEffect } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { useGetScribeReviewsQuery } from "@api";
import { NoResults } from "@assets";
import { FallbackUI, FeedCard } from "@components";
import { ROUTES } from "@constants";
import { ReviewItem } from "@types";

import { PAGE_SIZE, SKELETON_COUNT } from "../constants";
import { itemVariants } from "../constants";
import EmptyState from "./EmptyState";
import FeedCardSkeleton from "./FeedCardSkeleton";
import { ScribeReviewProps } from "../types";

const SkeletonList: FC = () => (
  <>
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <FeedCardSkeleton key={index} />
    ))}
  </>
);

const ScribeReview: FC<ScribeReviewProps> = ({ filter }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [offset, setOffset] = useState(0);
  const [feedData, setFeedData] = useState<ReviewItem[]>([]);
  const [expandedViewMoreIds, setExpandedViewMoreIds] = useState<Set<string>>(new Set());

  const {
    data: scribeReviewsData,
    isFetching: isScribeReviewsFetching,
    refetch: refetchScribeReviews,
    error: scribeReviewsError,
  } = useGetScribeReviewsQuery({
    limit: PAGE_SIZE,
    offset,
    sortBy: filter,
    languageCode: i18n.language,
  });

  useEffect(() => {
    setOffset(0);
    setFeedData([]);
  }, [filter, i18n.language]);

  useEffect(() => {
    if (!scribeReviewsData?.data) return;
    if (offset === 0) {
      setFeedData(scribeReviewsData.data);
    } else {
      setFeedData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = scribeReviewsData.data.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [scribeReviewsData, offset]);

  const hasMore = scribeReviewsData ? offset + PAGE_SIZE < scribeReviewsData.count : true;

  const handleLoadMore = () => {
    if (!hasMore || isScribeReviewsFetching || feedData.length === 0) return;
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

  const onReviewTranscript = (reviewId: string) => {
    navigate(ROUTES.SCRIBE_REVIEW_DETAILS?.replace(":reviewId", reviewId));
  };

  const isInitialLoading = isScribeReviewsFetching && feedData.length === 0;
  const isEmpty =
    !isScribeReviewsFetching && feedData.length === 0 && scribeReviewsData?.data?.length === 0;
  const isLoadingMore = isScribeReviewsFetching && feedData.length > 0;

  if (scribeReviewsError) {
    return (
      <div className="flex h-[80vh] sm:h-[90vh] items-center justify-center px-4 sm:px-6">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("review.error.title")}
          description={t("review.error.description")}
          button={{
            text: t("review.error.retry"),
            onClick: refetchScribeReviews,
          }}
        />
      </div>
    );
  }

  if (isInitialLoading) return <SkeletonList />;
  if (isEmpty) return <EmptyState onRefresh={refetchScribeReviews} />;

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
            reactions={item.reactions}
            commentsCount={item.commentsCount}
            onReviewTranscript={() => onReviewTranscript(item.id)}
            duration={item.scribeSession?.duration}
            dateTime={item.scribeSession?.createdAt}
            badgeBgColor="#FFF3E0"
            badgeTextColor="#E65100"
            badgeText={t("common.scribe", "Scribe")}
            isViewMoreExpanded={expandedViewMoreIds.has(item.id)}
            onTapViewMore={() => handleTapViewMore(item.id)}
            note={item.note}
            isScribeReview={true}
            scribeSummaryName={item.scribeSession?.summaryName}
          />
        </motion.div>
      ))}
      {isLoadingMore && <FeedCardSkeleton />}
    </InfiniteScroll>
  );
};

export default ScribeReview;
