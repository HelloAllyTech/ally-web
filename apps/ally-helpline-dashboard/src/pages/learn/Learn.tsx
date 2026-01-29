import { FC, useCallback, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DropdownField, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useGetScenariosQuery,
  useGetScenarioPathwaysQuery,
  useUpdateUserPreferencesMutation,
} from "@api";
import { CreditsDisplay, ScenarioCard, TabGroup } from "@components";
import { Permissions } from "@constants";
import { useAchievementBadgeModal, useUser, useScenarioLanguages } from "@hooks";
import { LanguageOption, ScenarioStatus } from "@types";
import { hasPermissions } from "@utils";

import { learnPageContainerVariants, learnPageItemVariants } from "./constants";

enum TabId {
  SIMULATIONS = "simulations",
  TRACKS = "tracks",
}
const LEARN_TABS = [
  { id: TabId.SIMULATIONS, label: "Simulations" },
  { id: TabId.TRACKS, label: "Tracks" },
];

type LearnTabId = (typeof LEARN_TABS)[number]["id"];

export const Learn: FC = () => {
  const navigate = useNavigate();
  const { permissions, isAuthenticated } = useUser();
  const hasPathPermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { BadgeModal } = useAchievementBadgeModal();

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
    data: scenariosData,
    isLoading: isScenariosLoading,
    refetch: refetchScenarios,
  } = useGetScenariosQuery({ isPrivate: isAuthenticated });

  const scenarios = scenariosData?.data || [];

  const {
    data: pathwaysData,
    isLoading: isPathwaysLoading,
    refetch: refetchPathways,
  } = useGetScenarioPathwaysQuery({}, { skip: !hasPathPermissions });

  const handleTabChange = (newValue: LearnTabId) => {
    if (isValidTabId(newValue)) setSearchParams({ tab: newValue });
  };

  const shouldLoadLanguages = FEATURE_FLAGS_MAP.LANGUAGE_CAPABILITY_FLAG;
  const {
    languages: LANGUAGE_OPTIONS,
    defaultLanguage,
    isLoading: isLanguagesLoading,
  } = shouldLoadLanguages
    ? useScenarioLanguages()
    : { languages: [], defaultLanguage: null, isLoading: false };
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(null);
  const [updateUserPreferences, { isLoading: isUpdatingPreferences }] =
    useUpdateUserPreferencesMutation();

  // Set initial language when defaultLanguage is loaded
  useEffect(() => {
    const savedLanguage = localStorage.getItem("selectedLanguage");

    if (!shouldLoadLanguages) {
      if (savedLanguage) {
        localStorage.removeItem("selectedLanguage");
      }
      setSelectedLanguage(null);
      return;
    }

    if (savedLanguage) {
      const parsedLanguage = JSON.parse(savedLanguage);
      setSelectedLanguage(parsedLanguage);
    } else if (defaultLanguage) {
      setSelectedLanguage(defaultLanguage);
    }
  }, [defaultLanguage, shouldLoadLanguages]);

  const handleLanguageChange = useCallback(
    async (value: string) => {
      const selectedOption = LANGUAGE_OPTIONS.find(option => option.value === value) || null;
      if (!selectedOption?.language_id) return;

      const previousLanguage = selectedLanguage;
      setSelectedLanguage(selectedOption);

      // Save to localStorage
      localStorage.setItem("selectedLanguage", JSON.stringify(selectedOption));

      try {
        await updateUserPreferences({
          default_language_id: Number(selectedOption.language_id),
        }).unwrap();
      } catch {
        setSelectedLanguage(previousLanguage);
        // Remove from localStorage if update fails
        localStorage.removeItem("selectedLanguage");
      }
    },
    [LANGUAGE_OPTIONS, selectedLanguage, updateUserPreferences],
  );

  const handleLanguageDropdownChange = useCallback(
    async (label: string) => {
      const option = LANGUAGE_OPTIONS.find(opt => opt.label === label);
      if (option) {
        await handleLanguageChange(option.value);
      }
    },
    [LANGUAGE_OPTIONS, handleLanguageChange],
  );

  const onScenarioCardClick = (itemId: number, isPathway: boolean) => {
    navigate(isPathway ? `/pathway/${itemId}` : `/scenario/${itemId}`, {
      state: {
        languages: LANGUAGE_OPTIONS,
        defaultLanguage: defaultLanguage,
        selectedLanguage: selectedLanguage,
      },
    });
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
        {hasPathPermissions && (
          <div className="flex flex-row items-center justify-between gap-2 border-b border-typography-300">
            <TabGroup
              tabs={LEARN_TABS.map(tab => ({ label: tab.label, value: tab.id }))}
              value={activeTab}
              className="border-none max-w-[220px]"
              onChange={(_, newValue) => handleTabChange(newValue as LearnTabId)}
            />

            <div className="w-full flex justify-end">
              <div className="flex flex-col">
                {LANGUAGE_OPTIONS.length > 0 && FEATURE_FLAGS_MAP.LANGUAGE_CAPABILITY_FLAG && (
                  <div className="relative w-48">
                    <DropdownField
                      options={LANGUAGE_OPTIONS.map(option => option.label)}
                      value={selectedLanguage?.label || ""}
                      onChange={handleLanguageDropdownChange}
                      disabled={isUpdatingPreferences || isLanguagesLoading}
                      label=""
                      valueClassName="font-primary text-base text-typography-700"
                    />
                  </div>
                )}
              </div>
            </div>
            <CreditsDisplay />
          </div>
        )}
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
    const isPathwayTab = activeTab === TabId.TRACKS;
    const isLoading = isPathwayTab ? isPathwaysLoading : isScenariosLoading;
    const hasData = isPathwayTab ? pathwaysData?.data?.length > 0 : scenarios?.length > 0;
    const ariaLabel = isPathwayTab ? "Available pathways" : "Available scenarios";

    if (isLoading) return renderLoadingSkeleton();

    if (!hasData) return renderEmptyGrid(isPathwayTab);

    const items = isPathwayTab ? pathwaysData.data : getSortedScenarios();

    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[6px] sm:gap-[12px] mx-auto pb-10"
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
                triggerWarnings={isPathway ? undefined : item.triggerWarnings}
              />
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    const isPathwayTab = activeTab === TabId.TRACKS;
    const title = isPathwayTab ? "Track" : "Scenario";

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
      {BadgeModal}
    </div>
  );
};
