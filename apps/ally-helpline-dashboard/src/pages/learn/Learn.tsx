import { FC, useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useGetScenariosQuery, useGetScenarioPathwaysQuery } from "@api";
import { CreditsDisplay, ScenarioCard, TabGroup } from "@components";
import { ScenarioStatus } from "@types";

import { learnPageContainerVariants, learnPageItemVariants } from "./constants";

enum TabId {
  SIMULATIONS = "simulations",
  PATHWAYS = "pathways",
}

const LEARN_TABS = [
  { id: TabId.SIMULATIONS, label: "Simulations" },
  { id: TabId.PATHWAYS, label: "Path way" },
];

type LearnTabId = (typeof LEARN_TABS)[number]["id"];

export const Learn: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isValidTabId = (tab: string | null): tab is LearnTabId => {
    return LEARN_TABS.some(t => t.id === tab);
  };
  const tabFromUrl = searchParams.get("tab");
  const activeTab: LearnTabId = isValidTabId(tabFromUrl) ? tabFromUrl : LEARN_TABS[0].id;

  useEffect(() => {
    if (!tabFromUrl || !isValidTabId(tabFromUrl)) {
      setSearchParams({ tab: LEARN_TABS[0].id }, { replace: true });
    }
  }, [tabFromUrl, setSearchParams]);

  const {
    data: scenarios,
    isLoading: isScenariosLoading,
    refetch: refetchScenarios,
  } = useGetScenariosQuery();

  const {
    data: pathwaysData,
    isLoading: isPathwaysLoading,
    refetch: refetchPathways,
  } = useGetScenarioPathwaysQuery({});

  const handleTabChange = (newValue: LearnTabId) => {
    if (isValidTabId(newValue)) setSearchParams({ tab: newValue });
  };

  const onScenarioCardClick = (itemId: number, isPathway: boolean) => {
    navigate(isPathway ? `/pathway/${itemId}` : `/scenario/${itemId}`);
  };

  const renderPageHeader = () => {
    const emphasisStyles = "font-bold text-primary-500";
    return (
      <>
        <motion.div
          variants={learnPageItemVariants}
          initial="hidden"
          animate="visible"
          className="w-full font-secondary text-3xl text-typography-900 sm:mb-[30px] mb-[48px] sm:leading-[40px] leading-[28px] pt-[30px]"
        >
          <span>Use </span>
          <span className={emphasisStyles}>AI-voice based </span>
          hyper realistic training
          <span className={emphasisStyles}> role plays </span>
          to build mental healthcare skills.
        </motion.div>
        <div className="flex flex-row items-center justify-between gap-2 border-b border-typography-300">
          <TabGroup
            tabs={LEARN_TABS.map(tab => ({ label: tab.label, value: tab.id }))}
            value={activeTab}
            className="border-none max-w-[200px]"
            onChange={(_, newValue) => handleTabChange(newValue as LearnTabId)}
          />
          <CreditsDisplay />
        </div>
      </>
    );
  };

  const renderEmptyGrid = (isPathway = false) => (
    <div className="flex flex-col items-center justify-center w-full py-8 min-h-[30vh]">
      <div className="text-typography-700 text-lg mb-4">
        No {isPathway ? "pathways" : "scenarios"} available at the moment
      </div>
      <button
        onClick={() => (isPathway ? refetchPathways() : refetchScenarios())}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );

  const getSortedScenarios = () =>
    scenarios?.slice().sort((a, b) => {
      const aActive = a.status === ScenarioStatus.ACTIVE;
      const bActive = b.status === ScenarioStatus.ACTIVE;
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[150px] sm:h-[200px] bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  const renderContentGrid = () => {
    const isPathwayTab = activeTab === TabId.PATHWAYS;
    const isLoading = isPathwayTab ? isPathwaysLoading : isScenariosLoading;
    const hasData = isPathwayTab ? pathwaysData?.data?.length > 0 : scenarios?.length > 0;
    const ariaLabel = isPathwayTab ? "Available pathways" : "Available scenarios";

    if (isLoading) return renderLoadingSkeleton();

    if (!hasData) return renderEmptyGrid(isPathwayTab);

    const items = isPathwayTab ? pathwaysData.data : getSortedScenarios();

    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mx-auto pb-10"
        role="list"
        aria-label={ariaLabel}
      >
        {items.map(item => {
          const isPathway = "totalScenarios" in item;
          const itemId = isPathway ? item.id : item.id;

          return (
            <motion.div
              key={itemId}
              variants={learnPageItemVariants}
              role="listitem"
              className="h-full"
            >
              <ScenarioCard
                coverImage={item.coverImageUrl || ""}
                title={item.title || ""}
                description={isPathway ? "" : item.description || ""}
                onClick={() => onScenarioCardClick(itemId, isPathway)}
                isComingSoon={!isPathway && item.status === ScenarioStatus.COMING_SOON}
                totalScenarios={isPathway ? item.totalScenarios : undefined}
                completedScenarios={isPathway ? item.completedScenarios : undefined}
              />
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    const isPathwayTab = activeTab === TabId.PATHWAYS;
    const title = isPathwayTab ? "Path" : "Scenario";

    return (
      <>
        <motion.div
          variants={learnPageItemVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mb-[14px]"
        >
          <h1 className="text-2xl sm:text-4xl text-typography-900 font-secondary pt-[30px] pl-[10px]">
            <span className="font-[350]">Choose your</span>
            <span className="font-[700] italic"> {title}</span>
          </h1>
        </motion.div>
        <motion.div
          variants={learnPageContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="max-h-[calc(100vh-200px)] pt-4 overflow-y-scroll px-[10px] custom-scrollbar"
        >
          {renderContentGrid()}
        </motion.div>
      </>
    );
  };

  return (
    <div className="flex flex-col w-full bg-white max-h-screen overflow-y-hidden p-[10px] pl-0 sm:p-[24px] justify-center font-tertiary">
      {renderPageHeader()}
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
    </div>
  );
};
