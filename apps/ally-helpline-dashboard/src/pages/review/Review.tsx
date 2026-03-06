import { FC, useState, useEffect } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { FEATURE_FLAGS_MAP, Tabs } from "@ally-ui-mono/ui-shared";
import { useGetReviewsQuery, useGetReviewThreadsQuery, useGetScribeReviewsQuery } from "@api";
import { NoResults, ReviewsEmptyState } from "@assets";
import { FallbackUI, ToggleButtonGroup } from "@components";
import { ROUTES } from "@constants";
import ScribeReview from "@pages/review/components/ScribeReview";
import {
  FILTER_OPTIONS,
  PAGE_SIZE,
  ReviewTab,
  SKELETON_COUNT,
  TABS,
  containerVariants,
} from "@pages/review/constants";
import { ReviewItem } from "@types";

import FeedCardSkeleton from "./components/FeedCardSkeleton";
import SimulationReview from "./components/SimulationReview";
import { Review as ReviewLegacy } from "./ReviewOld";

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
  if (!FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG) {
    return <ReviewLegacy />;
  }
  return <ReviewWithTabs />;
};

const ReviewWithTabs: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const filterOptions = FILTER_OPTIONS(t);

  const tabFromUrl = searchParams.get("tab");
  const filterFromUrl = searchParams.get("filter");
  const isValidTab = (tab: string | null) =>
    tab === ReviewTab.SCRIBE || tab === ReviewTab.SIMULATION;
  const isValidFilter = (f: string | null) => f && filterOptions.some(option => option.value === f);
  const initialTab = isValidTab(tabFromUrl) ? tabFromUrl : TABS[0].value;
  const initialFilterFromUrl = isValidFilter(filterFromUrl) ? filterFromUrl! : "ALL";

  const [simulationFilter, setSimulationFilter] = useState(
    initialTab === ReviewTab.SIMULATION ? initialFilterFromUrl : "ALL",
  );
  const [scribeFilter, setScribeFilter] = useState(
    initialTab === ReviewTab.SCRIBE ? initialFilterFromUrl : "ALL",
  );
  const [simulationOffset, setSimulationOffset] = useState(0);
  const [scribeOffset, setScribeOffset] = useState(0);
  const [simulationFeedData, setSimulationFeedData] = useState<ReviewItem[]>([]);
  const [scribeFeedData, setScribeFeedData] = useState<ReviewItem[]>([]);
  const [selectedSimulationReviewId, setSelectedSimulationReviewId] = useState<string | null>(null);
  const [selectedScribeReviewId, setSelectedScribeReviewId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const currentTabFilter = activeTab === ReviewTab.SIMULATION ? simulationFilter : scribeFilter;
  useEffect(() => {
    setSearchParams({ tab: activeTab, filter: currentTabFilter }, { replace: true });
  }, [activeTab, currentTabFilter, setSearchParams]);

  const handleFilterChange = (newFilter: string) => {
    if (activeTab === ReviewTab.SIMULATION) {
      if (newFilter !== simulationFilter) {
        setSimulationFeedData([]);
        setSimulationOffset(0);
        setSimulationFilter(newFilter);
      }
    } else {
      if (newFilter !== scribeFilter) {
        setScribeFeedData([]);
        setScribeOffset(0);
        setScribeFilter(newFilter);
      }
    }
  };

  const {
    data: simulationReviewsData,
    isFetching: isSimulationReviewsFetching,
    refetch: refetchSimulationReviews,
    error: simulationReviewsError,
  } = useGetReviewsQuery({
    limit: PAGE_SIZE,
    offset: simulationOffset,
    sortBy: simulationFilter,
  });

  const {
    data: scribeReviewsData,
    isFetching: isScribeReviewsFetching,
    refetch: refetchScribeReviews,
    error: scribeReviewsError,
  } = useGetScribeReviewsQuery(
    {
      limit: PAGE_SIZE,
      offset: scribeOffset,
      sortBy: scribeFilter,
    },
    {
      skip: !FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG,
    },
  );

  const { data: simulationReviewThreadsData, isLoading: isSimulationReviewThreadsLoading } =
    useGetReviewThreadsQuery(
      { id: selectedSimulationReviewId! },
      { skip: !selectedSimulationReviewId },
    );

  const { data: scribeReviewThreadsData, isLoading: isScribeReviewThreadsLoading } =
    useGetReviewThreadsQuery({ id: selectedScribeReviewId! }, { skip: !selectedScribeReviewId });

  // Append new data when API responds
  useEffect(() => {
    if (!simulationReviewsData?.data) return;

    if (simulationOffset === 0) {
      setSimulationFeedData(simulationReviewsData.data);
    } else {
      setSimulationFeedData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = simulationReviewsData.data.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [simulationReviewsData, simulationOffset]);

  useEffect(() => {
    if (!scribeReviewsData?.data) return;

    if (scribeOffset === 0) {
      setScribeFeedData(scribeReviewsData.data);
    } else {
      setScribeFeedData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = scribeReviewsData.data.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [scribeReviewsData, scribeOffset]);

  const simulationHasMore = simulationReviewsData
    ? simulationOffset + PAGE_SIZE < simulationReviewsData.count
    : true;
  const scribeHasMore = scribeReviewsData
    ? scribeOffset + PAGE_SIZE < scribeReviewsData.count
    : true;

  const handleSimulationReviewLoadMore = () => {
    if (!simulationHasMore || isSimulationReviewsFetching || simulationFeedData.length === 0)
      return;
    setSimulationOffset(prev => prev + PAGE_SIZE);
  };

  const handleScribeReviewLoadMore = () => {
    if (!scribeHasMore || isScribeReviewsFetching || scribeFeedData.length === 0) return;
    setScribeOffset(prev => prev + PAGE_SIZE);
  };

  const handleTabSwitch = (newValue: string) => {
    setActiveTab(newValue);
  };

  const handleReviewTranscript = (reviewId: string) => {
    navigate(ROUTES.REVIEW_DETAILS.replace(":reviewId", reviewId));
  };

  const handleScribeReviewCommentsClick = (reviewId: string) => {
    setSelectedScribeReviewId(prev => (prev === reviewId ? null : reviewId));
  };

  const handleSimulationReviewCommentsClick = (reviewId: string) => {
    setSelectedSimulationReviewId(prev => (prev === reviewId ? null : reviewId));
  };

  const handleScribeReviewTranscript = (reviewId: string) => {
    navigate(ROUTES.REVIEW_DETAILS.replace(":reviewId", reviewId));
  };

  const content = () => {
    switch (activeTab) {
      case ReviewTab.SCRIBE:
        return (
          <ScribeReview
            handleLoadMore={handleScribeReviewLoadMore}
            isLoadingMore={isScribeLoadingMore}
            feedData={scribeFeedData}
            selectedReviewId={selectedScribeReviewId}
            reviewThreadsData={scribeReviewThreadsData}
            onReviewTranscript={handleScribeReviewTranscript}
            onCommentsClick={handleScribeReviewCommentsClick}
            isReviewThreadsLoading={isScribeReviewThreadsLoading}
          />
        );
      case ReviewTab.SIMULATION:
        return (
          <SimulationReview
            handleLoadMore={handleSimulationReviewLoadMore}
            isLoadingMore={isSimulationLoadingMore}
            feedData={simulationFeedData}
            selectedReviewId={selectedSimulationReviewId}
            reviewThreadsData={simulationReviewThreadsData}
            onReviewTranscript={handleReviewTranscript}
            onCommentsClick={handleSimulationReviewCommentsClick}
            isReviewThreadsLoading={isSimulationReviewThreadsLoading}
          />
        );
      default:
        return null;
    }
  };

  const isSimulationInitialLoading = isSimulationReviewsFetching && simulationFeedData.length === 0;
  const isSimulationDataEmpty =
    !isSimulationReviewsFetching &&
    simulationFeedData.length === 0 &&
    simulationReviewsData?.data?.length === 0;
  const isSimulationLoadingMore = isSimulationReviewsFetching && simulationFeedData.length > 0;

  const isScribeInitialLoading = isScribeReviewsFetching && scribeFeedData.length === 0;
  const isScribeDataEmpty =
    !isScribeReviewsFetching &&
    scribeFeedData.length === 0 &&
    scribeReviewsData?.data?.length === 0;
  const isScribeLoadingMore = isScribeReviewsFetching && scribeFeedData.length > 0;

  const renderContent = () => {
    if (activeTab === ReviewTab.SIMULATION) {
      if (isSimulationInitialLoading) return <SkeletonList />;
      if (isSimulationDataEmpty) return <EmptyState onRefresh={refetchSimulationReviews} />;

      return content();
    } else {
      if (isScribeInitialLoading) return <SkeletonList />;
      if (isScribeDataEmpty) return <EmptyState onRefresh={refetchScribeReviews} />;

      return content();
    }
  };

  if (activeTab === ReviewTab.SIMULATION && simulationReviewsError) {
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

  if (activeTab === ReviewTab.SCRIBE && scribeReviewsError) {
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
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 pt-3">
          <div className="flex flex-row items-center justify-between gap-2 border-b border-typography-300">
            <Tabs
              items={TABS.map(tab => ({ id: tab.value, label: tab.label }))}
              activeId={activeTab}
              onChange={handleTabSwitch}
              className="border-none max-w-[330px] text-base font-primary"
              showCount={false}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full max-w-4xl px-4 sm:px-6 lg:px-8"
        >
          <div className="py-3 sm:py-4 md:py-6 w-full">
            <ToggleButtonGroup
              className="w-full font-primary text-[10px] sm:text-xs md:text-sm leading-[1.5]"
              value={activeTab === ReviewTab.SIMULATION ? simulationFilter : scribeFilter}
              onValueChange={handleFilterChange}
              items={filterOptions}
              equalWidth
              inheritFontSize={true}
            />
          </div>
        </motion.div>
      </div>
      <div
        key={`${activeTab}-${activeTab === ReviewTab.SIMULATION ? simulationFilter : scribeFilter}`}
        className="flex-1 overflow-auto"
      >
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
