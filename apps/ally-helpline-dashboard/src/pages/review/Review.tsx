import { FC, useState, useEffect, useMemo } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { ToggleButtonGroup } from "@components";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

import ScribeReview from "./components/ScribeReview";
import SimulationReview from "./components/SimulationReview";
import { FILTER_OPTIONS, ReviewTab, TABS, containerVariants } from "./constants";

export const Review: FC = () => {
  return <ReviewWithTabs />;
};

const ReviewWithTabs: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { permissions } = useUser();

  const visibleTabs = useMemo(
    () => TABS.filter(tab => hasPermissions(permissions, tab.permission)),
    [permissions],
  );

  const filterOptions = FILTER_OPTIONS(t);

  const tabFromUrl = searchParams.get("tab");
  const filterFromUrl = searchParams.get("filter");
  const isValidTab = (tab: string | null) =>
    tab === ReviewTab.SCRIBE || tab === ReviewTab.SIMULATION;
  const isVisibleTab = (tab: string | null) => visibleTabs.some(t => t.value === tab);
  const isValidFilter = (f: string | null) => f && filterOptions.some(option => option.value === f);
  const initialTab =
    isValidTab(tabFromUrl) && isVisibleTab(tabFromUrl)
      ? tabFromUrl
      : (visibleTabs[0]?.value ?? TABS[0].value);
  const initialFilterFromUrl = isValidFilter(filterFromUrl) ? filterFromUrl! : "ALL";

  const [simulationFilter, setSimulationFilter] = useState(
    initialTab === ReviewTab.SIMULATION ? initialFilterFromUrl : "ALL",
  );
  const [scribeFilter, setScribeFilter] = useState(
    initialTab === ReviewTab.SCRIBE ? initialFilterFromUrl : "ALL",
  );
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const showTabUI = visibleTabs.length > 1;

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.value === activeTab)) {
      setActiveTab(visibleTabs[0].value);
    }
  }, [visibleTabs, activeTab]);

  const currentTabFilter = activeTab === ReviewTab.SIMULATION ? simulationFilter : scribeFilter;
  useEffect(() => {
    setSearchParams({ tab: activeTab, filter: currentTabFilter }, { replace: true });
  }, [activeTab, currentTabFilter, setSearchParams]);

  const handleFilterChange = (newFilter: string) => {
    if (activeTab === ReviewTab.SIMULATION) {
      if (newFilter !== simulationFilter) setSimulationFilter(newFilter);
    } else {
      if (newFilter !== scribeFilter) setScribeFilter(newFilter);
    }
  };

  const handleTabSwitch = (newValue: string) => {
    setActiveTab(newValue);
  };

  const content = () => {
    switch (activeTab) {
      case ReviewTab.SCRIBE:
        return <ScribeReview filter={scribeFilter} />;
      case ReviewTab.SIMULATION:
        return <SimulationReview filter={simulationFilter} />;
      default:
        return null;
    }
  };

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
        {showTabUI && (
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 pt-3">
            <div className="flex flex-row items-center justify-between gap-2 border-b border-typography-300">
              <Tabs
                items={visibleTabs.map(tab => ({ id: tab.value, label: tab.label }))}
                activeId={activeTab}
                onChange={handleTabSwitch}
                className="border-none max-w-[330px] text-base font-primary"
                showCount={false}
              />
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`w-full max-w-4xl px-4 sm:px-6 lg:px-8 ${!showTabUI ? "pt-3" : ""}`}
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
              {content()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
