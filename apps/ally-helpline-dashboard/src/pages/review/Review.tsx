import { FC, useState, useEffect, useCallback, useRef } from "react";

import { motion } from "framer-motion";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { ReviewsEmptyState } from "@assets";
import { useGetReviewsQuery } from "@src/api";
import FeedCard from "@src/components/feed-card";
import ToggleButtonGroup from "@src/components/toggle-button-group/ToggleButtonGroup";
import { ReviewItem } from "@types";

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "LATEST", label: "Latest" },
  { value: "MOST_REVIEWED", label: "Most reviewed" },
  { value: "UNDISCOVERED", label: "Undiscovered" },
];

const PAGE_SIZE = 10;
const SKELETON_COUNT = 3;
const LOAD_MORE_DEBOUNCE_MS = 500;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface FilterState {
  data: ReviewItem[];
  offset: number;
  hasMore: boolean;
}

const initialFilterState: FilterState = {
  data: [],
  offset: 0,
  hasMore: true,
};

const createInitialFilterStates = (): Record<string, FilterState> =>
  FILTER_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.value]: { ...initialFilterState },
    }),
    {},
  );

const FeedCardSkeleton: FC = () => (
  <div className="w-full bg-white font-primary rounded-[16px] border-[0.5px] border-border flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 shadow-[2.13px_2.84px_7.81px_0px_rgba(160,158,158,0.1),8.52px_11.36px_14.2px_0px_rgba(160,158,158,0.09)] animate-pulse">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200" />
      <div className="flex flex-col gap-1">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-16 bg-gray-200 rounded" />
      </div>
    </div>
    <div className="w-full h-[0.5px] bg-gray-200" />
    <div className="flex flex-col gap-2">
      <div className="h-4 w-48 bg-gray-200 rounded" />
      <div className="h-3 w-64 bg-gray-200 rounded" />
      <div className="border rounded-[12px] overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
          <div className="flex-shrink-0 w-full sm:w-[200px] h-[120px] sm:h-[100px] rounded-[4px] bg-gray-200" />
          <div className="flex flex-col justify-start gap-1 sm:gap-2 flex-1">
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-2/3 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-center gap-2 py-2 px-3">
      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded" />
      <div className="h-4 w-28 bg-gray-200 rounded" />
    </div>
    <div className="w-full h-[0.5px] bg-gray-200" />
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="h-4 w-20 bg-gray-200 rounded" />
    </div>
  </div>
);

const SkeletonList: FC = () => (
  <>
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <FeedCardSkeleton key={index} />
    ))}
  </>
);

const EmptyState = ({ refetchReviews }: { refetchReviews: () => void }) => (
  <div className="flex flex-col flex-1 items-center justify-center w-full min-h-[50vh] gap-[14px]">
    <ReviewsEmptyState className="w-[240px] h-[240px]" />
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-secondary font-[350] text-2xl text-[#47464F] text-center">
        No shared sessions yet
      </h2>
      <p className="font-primary text-sm text-black/60 text-center max-w-[414px] leading-[1.3]">
        Shared user transcripts will be available here for review.
      </p>
      {refetchReviews && (
        <button
          onClick={refetchReviews}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Refresh Page
        </button>
      )}
    </div>
  </div>
);

export const Review: FC = () => {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [filterStates, setFilterStates] =
    useState<Record<string, FilterState>>(createInitialFilterStates);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTriggerTime = useRef<number>(0);

  const currentFilterState = filterStates[activeFilter] || initialFilterState;
  const { data: feedData, offset, hasMore } = currentFilterState;
  const {
    data: reviewsData,
    isFetching: isReviewsFetching,
    refetch: refetchReviews,
  } = useGetReviewsQuery({
    limit: PAGE_SIZE,
    offset,
    sortBy: activeFilter,
  });

  useEffect(() => {
    if (!reviewsData?.data) return;

    setFilterStates(prev => {
      const currentState = prev[activeFilter] || initialFilterState;
      const isFirstPage = currentState.offset === 0;
      const newData = isFirstPage ? reviewsData.data : [...currentState.data, ...reviewsData.data];

      return {
        ...prev,
        [activeFilter]: {
          ...currentState,
          data: newData,
          hasMore: currentState.offset + PAGE_SIZE < reviewsData.count,
        },
      };
    });
  }, [reviewsData, activeFilter]);

  const loadMore = useCallback(() => {
    if (isReviewsFetching || !hasMore) return;

    const now = Date.now();
    if (now - lastTriggerTime.current < LOAD_MORE_DEBOUNCE_MS) return;
    lastTriggerTime.current = now;

    setFilterStates(prev => ({
      ...prev,
      [activeFilter]: {
        ...prev[activeFilter],
        offset: prev[activeFilter].offset + PAGE_SIZE,
      },
    }));
  }, [isReviewsFetching, hasMore, activeFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isReviewsFetching) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [hasMore, isReviewsFetching, loadMore]);

  const isInitialLoading =
    (isReviewsFetching && feedData.length === 0) ||
    (feedData.length === 0 && offset === 0 && !reviewsData?.data);
  const isEmpty = !isReviewsFetching && feedData.length === 0 && reviewsData?.data?.length === 0;
  const isLoadingMore = isReviewsFetching && feedData.length > 0;

  const renderContent = () => {
    if (isInitialLoading) return <SkeletonList />;
    if (isEmpty) return <EmptyState refetchReviews={refetchReviews} />;

    return (
      <>
        {feedData.map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.05 }}
            className="w-full"
          >
            <FeedCard
              id={item.id}
              createdAt={item.createdAt}
              user={item.createdBy}
              scenario={item.scenario}
              reactions={item.reactions}
              commentsCount={item.commentsCount}
              comments={item.comments}
              onReviewTranscript={() => {}}
            />
          </motion.div>
        ))}
        {hasMore && <div ref={sentinelRef} className="w-full h-4" />}
        {isLoadingMore && <FeedCardSkeleton />}
      </>
    );
  };

  if (!FEATURE_FLAGS_MAP.PEER_REVIEW_FLAG) {
    return (
      <div className="flex items-center justify-center h-full">Peer review is not enabled</div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#FAFAFA]">
      <div className="sticky top-0 z-10 flex flex-col items-center bg-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center self-stretch gap-8 px-4 sm:px-8 py-5 bg-white"
        >
          <h1 className="font-secondary text-2xl text-[#0D0D0D]">Review</h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full max-w-4xl px-4 sm:px-6 lg:px-8"
        >
          <div className="py-4 sm:py-6 w-full">
            <ToggleButtonGroup
              className="w-full font-primary text-xs sm:text-sm leading-[1.5]"
              value={activeFilter}
              onValueChange={setActiveFilter}
              items={FILTER_OPTIONS}
              equalWidth
            />
          </div>
        </motion.div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex justify-center w-full">
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-4 w-full pb-8"
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
