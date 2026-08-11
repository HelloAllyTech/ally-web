import { FC, useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useGetScenariosQuery,
  useGetScenarioPathwaysQuery,
  useGetScenarioCasesQuery,
  useGetLearnTracksQuery,
} from "@api";
import {
  ContinueLearningCard,
  CreditsDisplay,
  PracticeStreakHeatmap,
  ScenarioCard,
} from "@components";
import { Permissions, buildTrackRoute } from "@constants";
import { useUser } from "@hooks";
import { ScenarioStatus } from "@types";
import { hasPermissions } from "@utils";

import { learnPageContainerVariants, learnPageItemVariants } from "./constants";

enum TabId {
  SIMULATIONS = "simulations",
  TRACKS = "tracks",
  CASES = "cases",
  COURSES = "courses",
}

type LearnTabId = TabId;

export const Learn: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { permissions, isAuthenticated } = useUser();
  const hasPathPermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS);
  const hasCasePermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS); // TODO: remove this skip when the feature flag is enabled
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: tracksData,
    isLoading: isTracksLoading,
    refetch: refetchTracks,
  } = useGetLearnTracksQuery();
  const tracks = tracksData?.data ?? [];
  // Hide the Courses tab entirely when there are no tracks (and not loading).
  const showCoursesTab = isTracksLoading || tracks.length > 0;

  const tabs = [
    { id: TabId.SIMULATIONS, label: t("learn.tabs.simulations") },
    { id: TabId.TRACKS, label: t("learn.tabs.tracks") },
    { id: TabId.CASES, label: t("learn.tabs.cases") },
    ...(showCoursesTab ? [{ id: TabId.COURSES, label: t("learn.tabs.courses") }] : []),
  ] as Array<{ id: TabId; label: string }>;

  const isValidTabId = (tab: string | null): tab is LearnTabId => {
    return tabs.some(t => t.id === tab);
  };
  const tabFromUrl = searchParams.get("tab");
  const activeTab: LearnTabId = isValidTabId(tabFromUrl) ? tabFromUrl : tabs[0].id;

  useEffect(() => {
    if (!tabFromUrl || !isValidTabId(tabFromUrl)) {
      setSearchParams({ tab: tabs[0].id }, { replace: true });
    }
  }, [tabFromUrl, setSearchParams, tabs]);

  const {
    data: scenariosData,
    isLoading: isScenariosLoading,
    refetch: refetchScenarios,
  } = useGetScenariosQuery(
    {
      isPrivate: isAuthenticated,
      languageCode: i18n.language,
    },
    // The per-scenario `completion` count comes from `eventStatus = COMPLETED`,
    // which the agent writes asynchronously after a session ends — so the
    // endSimulation tag invalidation can fire before the write lands. Refetch
    // on mount so coming back to /learn always shows an up-to-date count.
    { refetchOnMountOrArgChange: true },
  );

  const scenarios = scenariosData?.data || [];

  const {
    data: pathwaysData,
    isLoading: isPathwaysLoading,
    refetch: refetchPathways,
  } = useGetScenarioPathwaysQuery({ languageCode: i18n.language }, { skip: !hasPathPermissions });

  const {
    data: casesData,
    isLoading: isCasesLoading,
    refetch: refetchCases,
  } = useGetScenarioCasesQuery({ languageCode: i18n.language }, { skip: !hasCasePermissions });

  const handleTabChange = (newValue: LearnTabId) => {
    if (isValidTabId(newValue)) setSearchParams({ tab: newValue });
  };

  const onScenarioCardClick = (itemId: number) => {
    const isPathway = activeTab === TabId.TRACKS;
    const isCase = activeTab === TabId.CASES;
    navigate(isPathway ? `/pathway/${itemId}` : isCase ? `/case/${itemId}` : `/scenario/${itemId}`);
  };

  const onTrackCardClick = (trackId: string) => navigate(buildTrackRoute(trackId));

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
            <Tabs
              items={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
              activeId={activeTab}
              onChange={id => handleTabChange(id as LearnTabId)}
              className="min-w-0 flex-1 border-none font-primary"
              showCount={false}
            />

            <CreditsDisplay />
          </div>
        )}
      </>
    );
  };

  const renderEmptyGrid = (type: "scenarios" | "pathways" | "cases" | "courses" = "scenarios") => {
    const refetchFunction =
      type === "pathways"
        ? refetchPathways
        : type === "cases"
          ? refetchCases
          : type === "courses"
            ? refetchTracks
            : refetchScenarios;

    return (
      <div className="flex flex-col items-center justify-center w-full py-8 min-h-[30vh]">
        <div className="text-typography-700 text-lg mb-4">{t(`learn.empty.${type}` as any)}</div>
        <button
          onClick={() => refetchFunction()}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
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

  /**
   * Streak-bar call to action. Deep-links to the first active scenario rather
   * than starting a simulation outright: starting one consumes a credit, which
   * should be a deliberate act, not a side effect of a page-header button. When
   * there is nothing to jump to, fall back to the simulations tab.
   */
  const onStartPractice = () => {
    const firstActive = getSortedScenarios()?.find(
      scenario => scenario.status === ScenarioStatus.ACTIVE,
    );
    if (firstActive) {
      navigate(`/scenario/${firstActive.id}`);
      return;
    }
    setSearchParams({ tab: TabId.SIMULATIONS });
  };

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[150px] sm:h-[200px] bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  const renderCoursesGrid = () => {
    if (isTracksLoading) return renderLoadingSkeleton();
    if (tracks.length === 0) return renderEmptyGrid("courses");

    return (
      <>
        <ContinueLearningCard tracks={tracks} />
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[6px] sm:gap-[12px] mx-auto pb-10"
          role="list"
          aria-label={t("learn.tabs.courses")}
        >
          {tracks.map(track => (
            <motion.div
              key={track.id}
              variants={learnPageItemVariants}
              role="listitem"
              className="h-full"
            >
              <ScenarioCard
                coverImage={track.coverImageUrl || ""}
                title={track.title || ""}
                description={track.description || ""}
                onClick={() => onTrackCardClick(track.id)}
                totalScenarios={track.totalItems}
                completedScenarios={track.completedItems}
              />
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  const renderContentGrid = () => {
    if (activeTab === TabId.COURSES) return renderCoursesGrid();

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

    const config = tabConfig[activeTab as keyof typeof tabConfig] ?? tabConfig[TabId.SIMULATIONS];
    const hasData = config.data && config.data.length > 0;

    if (config.isLoading) return renderLoadingSkeleton();
    if (!hasData) return renderEmptyGrid(config.emptyType);

    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[6px] sm:gap-[12px] mx-auto pb-10"
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
                attemptCount={isMultipleItems ? undefined : item.completion?.attemptCount}
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
    const isCoursesTab = activeTab === TabId.COURSES;
    const title = isCoursesTab
      ? t("learn.choose.course")
      : isCaseTab
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
          className="pt-4 px-[10px]"
        >
          {renderContentGrid()}
        </motion.div>
      </>
    );
  };

  return (
    <div className="flex flex-col w-full bg-white p-[10px] pl-0 sm:p-[24px] font-tertiary">
      <PracticeStreakHeatmap className="mb-[24px]" onStartPractice={onStartPractice} />
      {renderPageHeader()}
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
    </div>
  );
};
