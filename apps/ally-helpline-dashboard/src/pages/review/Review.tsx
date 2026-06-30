import { FC, useState, useEffect, useMemo } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { DropdownField, Tabs } from "@ally-ui-mono/ui-shared";
import { ToggleButtonGroup } from "@components";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

import ScribeReview from "./components/ScribeReview";
import SimulationReview from "./components/SimulationReview";
import {
  FILTER_OPTIONS,
  READ_FILTER_OPTIONS,
  SORT_OPTIONS,
  ReviewTab,
  TABS,
  containerVariants,
} from "./constants";

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
  const readFilterOptions = READ_FILTER_OPTIONS(t);
  const sortOptions = SORT_OPTIONS(t);

  const tabFromUrl = searchParams.get("tab");
  const filterFromUrl = searchParams.get("filter");
  const sortFromUrl = searchParams.get("sort");

  const isValidTab = (tab: string | null) =>
    tab === ReviewTab.SCRIBE || tab === ReviewTab.SIMULATION;
  const isVisibleTab = (tab: string | null) => visibleTabs.some(t => t.value === tab);
  const isValidReadFilter = (f: string | null) =>
    f && readFilterOptions.some(option => option.value === f);
  const isValidScribeFilter = (f: string | null) =>
    f && filterOptions.some(option => option.value === f);
  const isValidSort = (s: string | null) => s && sortOptions.some(option => option.value === s);

  const initialTab =
    isValidTab(tabFromUrl) && isVisibleTab(tabFromUrl)
      ? tabFromUrl
      : (visibleTabs[0]?.value ?? TABS[0].value);

  const [simulationReadFilter, setSimulationReadFilter] = useState(
    initialTab === ReviewTab.SIMULATION && isValidReadFilter(filterFromUrl)
      ? filterFromUrl!
      : "ALL",
  );
  const [simulationSortBy, setSimulationSortBy] = useState(
    initialTab === ReviewTab.SIMULATION && isValidSort(sortFromUrl) ? sortFromUrl! : "LATEST",
  );
  const [scribeFilter, setScribeFilter] = useState(
    initialTab === ReviewTab.SCRIBE && isValidScribeFilter(filterFromUrl) ? filterFromUrl! : "ALL",
  );
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const showTabUI = visibleTabs.length > 1;

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.value === activeTab)) {
      setActiveTab(visibleTabs[0].value);
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (activeTab === ReviewTab.SIMULATION) {
      setSearchParams(
        { tab: activeTab, filter: simulationReadFilter, sort: simulationSortBy },
        { replace: true },
      );
    } else {
      setSearchParams({ tab: activeTab, filter: scribeFilter }, { replace: true });
    }
  }, [activeTab, simulationReadFilter, simulationSortBy, scribeFilter, setSearchParams]);

  const handleTabSwitch = (newValue: string) => {
    setActiveTab(newValue);
  };

  const content = () => {
    switch (activeTab) {
      case ReviewTab.SCRIBE:
        return <ScribeReview filter={scribeFilter} />;
      case ReviewTab.SIMULATION:
        return <SimulationReview readFilter={simulationReadFilter} sortBy={simulationSortBy} />;
      default:
        return null;
    }
  };

  const renderSimulationControls = () => (
    <div className="py-3 sm:py-4 md:py-6 w-full flex flex-col gap-3">
      <ToggleButtonGroup
        className="w-full font-primary text-[10px] sm:text-xs md:text-sm leading-[1.5]"
        value={simulationReadFilter}
        onValueChange={newFilter => {
          if (newFilter !== simulationReadFilter) setSimulationReadFilter(newFilter);
        }}
        items={readFilterOptions}
        equalWidth
        inheritFontSize={true}
      />
      <div className="flex items-center gap-2">
        <span className="font-primary text-xs text-typography-600 whitespace-nowrap">
          {t("review.sort.label")}
        </span>
        <div className="w-fit">
          <DropdownField
            value={
              sortOptions.find(o => o.value === simulationSortBy)?.label ?? sortOptions[0].label
            }
            options={sortOptions.map(o => o.label)}
            onChange={label => {
              const opt = sortOptions.find(o => o.label === label);
              if (opt && opt.value !== simulationSortBy) setSimulationSortBy(opt.value);
            }}
            valueClassName="font-primary text-xs text-typography-800"
            hideSearch
          />
        </div>
      </div>
    </div>
  );

  const renderScribeControls = () => (
    <div className="py-3 sm:py-4 md:py-6 w-full">
      <ToggleButtonGroup
        className="w-full font-primary text-[10px] sm:text-xs md:text-sm leading-[1.5]"
        value={scribeFilter}
        onValueChange={newFilter => {
          if (newFilter !== scribeFilter) setScribeFilter(newFilter);
        }}
        items={filterOptions}
        equalWidth
        inheritFontSize={true}
      />
    </div>
  );

  const contentKey =
    activeTab === ReviewTab.SIMULATION
      ? `${activeTab}-${simulationReadFilter}-${simulationSortBy}`
      : `${activeTab}-${scribeFilter}`;

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
                items={visibleTabs.map(tab => ({ id: tab.value, label: t(tab.labelKey) }))}
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
          {activeTab === ReviewTab.SIMULATION ? renderSimulationControls() : renderScribeControls()}
        </motion.div>
      </div>
      <div key={contentKey} className="flex-1 overflow-auto">
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
