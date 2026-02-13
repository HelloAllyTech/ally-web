// File: apps/ally-helpline-dashboard/src/pages/learn/Learn.tsx
import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DropdownField, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useGetScenariosQuery,
  useGetScenarioPathwaysQuery,
  useGetScenarioCasesQuery,
  useUpdateUserPreferencesMutation,
} from "@api";
import { CreditsDisplay, ScenarioCard, TabGroup } from "@components";
import { Permissions } from "@constants";
import { useUser, useScenarioLanguages } from "@hooks";
import { LanguageOption, ScenarioStatus } from "@types";
import { hasPermissions } from "@utils";

import { learnPageContainerVariants, learnPageItemVariants } from "./constants";

enum TabId {
  SIMULATIONS = "simulations",
  TRACKS = "tracks",
  CASES = "cases",
}
const LEARN_TABS = [
  { id: TabId.SIMULATIONS, labelKey: "learn.tabs.simulations" },
  { id: TabId.TRACKS, labelKey: "learn.tabs.tracks" },
  FEATURE_FLAGS_MAP.SIMULATION_CASES_FLAG && { id: TabId.CASES, labelKey: "learn.tabs.cases" }, // TODO: remove this when the feature flag is enabled
];

type LearnTabId = (typeof LEARN_TABS)[number]["id"];

export const Learn: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permissions, isAuthenticated } = useUser();
  const hasPathPermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS);
  const hasCasePermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS); // TODO: remove this skip when the feature flag is enabled
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

  const {
    data: casesData,
    isLoading: isCasesLoading,
    refetch: refetchCases,
  } = useGetScenarioCasesQuery(
    {},
    { skip: !hasCasePermissions || !FEATURE_FLAGS_MAP.SIMULATION_CASES_FLAG },
  ); // TODO: remove this skip when the feature flag is enabled

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

  const onScenarioCardClick = (itemId: number) => {
    const isPathway = activeTab === TabId.TRACKS;
    const isCase = activeTab === TabId.CASES;
    navigate(
      isPathway ? `/pathway/${itemId}` : isCase ? `/case/${itemId}` : `/scenario/${itemId}`,
      {
        state: {
          languages: LANGUAGE_OPTIONS,
          defaultLanguage: defaultLanguage,
          selectedLanguage: selectedLanguage,
        },
      },
    );
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
          <span>{t("learn.header.prefix")} </span>
          <span className={emphasisStyles}>{t("learn.header.emphasis1")} </span>
          {t("learn.header.middle")}
          <span className={emphasisStyles}> {t("learn.header.emphasis2")} </span>
          {t("learn.header.suffix")}
        </motion.div>
        {hasPathPermissions && (
          <div className="flex flex-row items-center justify-between gap-2 border-b border-typography-300">
            <TabGroup
              tabs={LEARN_TABS.map(tab => ({ label: t(tab!.labelKey as string), value: tab!.id }))}
              value={activeTab}
              className="border-none max-w-[330px]"
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

  const renderEmptyGrid = (type: "scenarios" | "pathways" | "cases" = "scenarios") => {
    const typeLabel = type === "pathways" ? "pathways" : type === "cases" ? "cases" : "scenarios";
    const refetchFunction =
      type === "pathways" ? refetchPathways : type === "cases" ? refetchCases : refetchScenarios;

    return (
      <div className="flex flex-col items-center justify-center w-full py-8 min-h-[30vh]">
        <div className="text-typography-700 text-lg mb-4">{t(`learn.empty.${typeLabel}`)}</div>
        <button
          onClick={() => refetchFunction()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {t("learn.empty.refresh")}
        </button>
      </div>
    );
  };

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
    const tabConfig = {
      [TabId.CASES]: {
        isLoading: isCasesLoading,
        data: casesData?.data,
        ariaLabel: t("learn.aria.availableCases"),
        emptyType: "cases" as const,
      },
      [TabId.TRACKS]: {
        isLoading: isPathwaysLoading,
        data: pathwaysData?.data,
        ariaLabel: t("learn.aria.availablePathways"),
        emptyType: "pathways" as const,
      },
      [TabId.SIMULATIONS]: {
        isLoading: isScenariosLoading,
        data: getSortedScenarios(),
        ariaLabel: t("learn.aria.availableScenarios"),
        emptyType: "scenarios" as const,
      },
    };

    const config = tabConfig[activeTab];
    const hasData = config.data && config.data.length > 0;

    if (config.isLoading) return renderLoadingSkeleton();
    if (!hasData) return renderEmptyGrid(config.emptyType);

    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[6px] sm:gap-[12px] mx-auto pb-10"
        role="list"
        aria-label={config.ariaLabel}
      >
        {config.data.map(item => {
          const isMultipleItems = "totalScenarios" in item;
          const itemId = item.id;

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
                description={isMultipleItems ? "" : item.description || ""}
                onClick={() => onScenarioCardClick(itemId)}
                isComingSoon={!isMultipleItems && item.status === ScenarioStatus.COMING_SOON}
                totalScenarios={isMultipleItems ? item.totalScenarios : undefined}
                completedScenarios={isMultipleItems ? item.completedScenarios : undefined}
                triggerWarnings={isMultipleItems ? undefined : item.triggerWarnings}
              />
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    const isCaseTab = activeTab === TabId.CASES;
    const isPathwayTab = activeTab === TabId.TRACKS;
    const title = isCaseTab
      ? t("learn.choose.case")
      : isPathwayTab
        ? t("learn.choose.track")
        : t("learn.choose.scenario");

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
            <span className="font-[350]">{t("learn.choose.prefix")}</span>
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
