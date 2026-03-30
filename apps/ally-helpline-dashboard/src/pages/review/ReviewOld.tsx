import { FC, useState, useEffect } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import { useGetReviewsQuery } from "@api";
import { NoResults, ReviewsEmptyState } from "@assets";
import { FallbackUI, ToggleButtonGroup } from "@components";
import FeedCard from "@components/feed-card";
import { ROUTES } from "@constants";
import { ReviewItem } from "@types";

import FeedCardSkeleton from "./components/FeedCardSkeleton";

const FILTER_OPTIONS = (t: any) => [
  { value: "ALL", label: t("review.filter.all") },
  { value: "LATEST", label: t("review.filter.latest") },
  { value: "MOST_REVIEWED", label: t("review.filter.mostReviewed") },
  { value: "UNDISCOVERED", label: t("review.filter.undiscovered") },
];

const PAGE_SIZE = 10;
const SKELETON_COUNT = 3;

const containerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

const SkeletonList: FC = () => (
  <>
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <FeedCardSkeleton key={index} />
    ))}
  </>
);

interface EmptyStateProps {
  onRefresh: () => void;
}

const EmptyState: FC<EmptyStateProps> = ({ onRefresh }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full min-h-[40vh] sm:min-h-[50vh] gap-3 sm:gap-[14px] px-4">
      <ReviewsEmptyState className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[240px] md:h-[240px]" />
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <h2 className="font-secondary font-[350] text-xl sm:text-2xl text-[#47464F] text-center">
          {t("review.empty.title")}
        </h2>
        <p className="font-primary text-xs sm:text-sm text-black/60 text-center max-w-[300px] sm:max-w-[414px] leading-[1.3]">
          {t("review.empty.description")}
        </p>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {t("review.empty.refresh")}
        </button>
      </div>
    </div>
  );
};

export const Review: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const filterOptions = FILTER_OPTIONS(t);

  const filterFromUrl = searchParams.get("filter");
  const isValidFilter = filterOptions.some(option => option.value === filterFromUrl);
  const initialFilter = isValidFilter ? filterFromUrl : "ALL";

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [offset, setOffset] = useState(0);
  const [feedData, setFeedData] = useState<ReviewItem[]>([]);

  useEffect(() => {
    if (!filterFromUrl) {
      setSearchParams({ filter: "ALL" }, { replace: true });
    }
  }, [filterFromUrl, setSearchParams]);

  useEffect(() => {
    if (filterFromUrl && isValidFilter && filterFromUrl !== activeFilter) {
      setActiveFilter(filterFromUrl);
      setFeedData([]);
      setOffset(0);
    }
  }, [filterFromUrl, isValidFilter, activeFilter]);

  const handleFilterChange = (newFilter: string) => {
    if (newFilter !== activeFilter) {
      setFeedData([]);
      setOffset(0);
      setActiveFilter(newFilter);
      setSearchParams({ filter: newFilter }, { replace: true });
    }
  };

  const {
    data: reviewsData,
    isFetching: isReviewsFetching,
    refetch: refetchReviews,
    error: reviewsError,
  } = useGetReviewsQuery({
    limit: PAGE_SIZE,
    offset,
    sortBy: activeFilter,
  });

  // Append new data when API responds
  useEffect(() => {
    if (!reviewsData?.data) return;

    if (offset === 0) {
      setFeedData(reviewsData.data);
    } else {
      setFeedData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = reviewsData.data.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [reviewsData, offset]);

  const hasMore = reviewsData ? offset + PAGE_SIZE < reviewsData.count : true;

  const handleLoadMore = () => {
    if (!hasMore || isReviewsFetching || feedData.length === 0) return;
    setOffset(prev => prev + PAGE_SIZE);
  };

  const onReviewTranscript = (reviewId: string) => {
    navigate(ROUTES.SIMULATION_REVIEW_DETAILS?.replace(":reviewId", reviewId));
  };

  const isInitialLoading = isReviewsFetching && feedData.length === 0;
  const isEmpty = !isReviewsFetching && feedData.length === 0 && reviewsData?.data?.length === 0;
  const isLoadingMore = isReviewsFetching && feedData.length > 0;

  const renderContent = () => {
    if (isInitialLoading) return <SkeletonList />;
    if (isEmpty) return <EmptyState onRefresh={refetchReviews} />;

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
              note={item.note}
            />
          </motion.div>
        ))}
        {isLoadingMore && <FeedCardSkeleton />}
      </InfiniteScroll>
    );
  };

  if (reviewsError) {
    return (
      <div className="flex h-[80vh] sm:h-[90vh] items-center justify-center px-4 sm:px-6">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("review.error.title")}
          description={t("review.error.description")}
          button={{
            text: t("review.error.retry"),
            onClick: refetchReviews,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#FAFAFA]">
      <div className="sticky top-0 z-10 flex flex-col items-center bg-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center self-stretch gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 py-3 sm:py-5 bg-white"
        >
          <h1 className="font-secondary text-xl sm:text-2xl text-[#0D0D0D] cursor-default">
            {t("review.title")}
          </h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full max-w-4xl px-4 sm:px-6 lg:px-8"
        >
          <div className="py-3 sm:py-4 md:py-6 w-full">
            <ToggleButtonGroup
              className="w-full font-primary text-[10px] sm:text-xs md:text-sm leading-[1.5]"
              value={activeFilter}
              onValueChange={handleFilterChange}
              items={filterOptions}
              equalWidth
              inheritFontSize={true}
            />
          </div>
        </motion.div>
      </div>
      <div key={activeFilter} className="flex-1 overflow-auto">
        <div className="flex justify-center w-full">
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              animate="visible"
              className="flex flex-col items-center gap-3 sm:gap-4 w-full pb-6 sm:pb-8"
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
