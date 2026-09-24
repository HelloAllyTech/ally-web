import { FC, useEffect, useRef } from "react";

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
import {
  ANALYTICS_EVENTS,
  ANALYTICS_PROPS,
  ROLEPLAY_ENTRY_POINT,
  Permissions,
  buildTrackRoute,
} from "@constants";
import { useAnalytics, useUser } from "@hooks";
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

// PostHog reports the product-facing tab names: internally `tracks`, but the
// tab (and the analytics spec) calls it the Learning Pathway.
const ANALYTICS_TAB: Record<TabId, string> = {
  [TabId.SIMULATIONS]: "simulations",
  [TabId.CASES]: "cases",
  [TabId.TRACKS]: "learning_pathway",
  [TabId.COURSES]: "courses",
};

export const Learn: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { permissions, isAuthenticated } = useUser();
  const { track } = useAnalytics();
  const hasPathPermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS);
  const hasCasePermissions = hasPermissions(permissions, Permissions.VIEW_SCENARIO_PATHS); // TODO: remove this skip when the feature flag is enabled
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: tracksData,
    isLoading: isTracksLoading,
    refetch: refetchTracks,
  } = useGetLearnTracksQuery({ languageCode: i18n.language });
  const tracks = tracksData?.data ?? [];

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

  // Hide a tab entirely once its query has resolved with no data; a tab stays
  // visible while loading so it doesn't flash-hide before the query settles.
  const showCoursesTab = isTracksLoading || tracks.length > 0;
  const showCasesTab = hasCasePermissions && (isCasesLoading || (casesData?.data?.length ?? 0) > 0);
  const showSimulationsTab = isScenariosLoading || scenarios.length > 0;
  const showPathwaysTab =
    hasPathPermissions && (isPathwaysLoading || (pathwaysData?.data?.length ?? 0) > 0);

  const tabs = [
    ...(showCoursesTab ? [{ id: TabId.COURSES, label: t("learn.tabs.courses") }] : []),
    ...(showCasesTab ? [{ id: TabId.CASES, label: t("learn.tabs.cases") }] : []),
    ...(showSimulationsTab ? [{ id: TabId.SIMULATIONS, label: t("learn.tabs.simulations") }] : []),
    ...(showPathwaysTab ? [{ id: TabId.TRACKS, label: t("learn.tabs.tracks") }] : []),
  ] as Array<{ id: TabId; label: string }>;

  const isValidTabId = (tab: string | null): tab is LearnTabId => {
    return tabs.some(t => t.id === tab);
  };
  const tabFromUrl = searchParams.get("tab");
  // Every tab can now hide itself when empty, so `tabs` may briefly be empty
  // (e.g. a tenant with nothing in any category yet) — fall back to
  // Simulations rather than reading tabs[0] off an empty array.
  const activeTab: LearnTabId = isValidTabId(tabFromUrl)
    ? tabFromUrl
    : (tabs[0]?.id ?? TabId.SIMULATIONS);

  useEffect(() => {
    if (tabs.length > 0 && (!tabFromUrl || !isValidTabId(tabFromUrl))) {
      setSearchParams({ tab: tabs[0].id }, { replace: true });
    }
  }, [tabFromUrl, setSearchParams, tabs, isValidTabId]);

  // `initial_tab` must be the tab the learner actually lands on, and which tabs
  // exist depends on all four queries — so wait for them to settle rather than
  // firing on mount, when `activeTab` is still the Simulations fallback. The ref
  // keeps it to one event per visit: tab switches change `activeTab`, not this.
  const isAnyTabLoading =
    isTracksLoading || isCasesLoading || isScenariosLoading || isPathwaysLoading;
  const hasTrackedPageView = useRef(false);
  useEffect(() => {
    if (hasTrackedPageView.current || isAnyTabLoading) return;
    hasTrackedPageView.current = true;
    track(ANALYTICS_EVENTS.LEARN_PAGE_VIEWED, {
      [ANALYTICS_PROPS.INITIAL_TAB]: ANALYTICS_TAB[activeTab],
    });
  }, [isAnyTabLoading, activeTab, track]);

  const handleTabChange = (newValue: LearnTabId) => {
    if (!isValidTabId(newValue)) return;
    // Tabs fires onChange for the active tab too — that is not a switch.
    if (newValue !== activeTab) {
      track(ANALYTICS_EVENTS.LEARN_TAB_SWITCHED, {
        [ANALYTICS_PROPS.TAB]: ANALYTICS_TAB[newValue],
      });
    }
    setSearchParams({ tab: newValue });
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
        {/* The tab strip stacks above the credits badge until sm. As one row at
            every width the two split a phone screen between them: the strip was
            left with 194px of 375 and showed under two of its four tabs, with
            the rest behind a horizontal scroll nobody looks for inside a tab
            bar. */}
        {hasPathPermissions && (
          <div className="flex flex-col items-stretch gap-1 border-b border-typography-300 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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
    // The tap is the intent, so it reports even on the fallback below — which
    // has no scenario to name, and so sends no item.
    track(ANALYTICS_EVENTS.ROLEPLAY_START_CLICKED, {
      [ANALYTICS_PROPS.ENTRY_POINT]: ROLEPLAY_ENTRY_POINT.STREAK_WIDGET,
      ...(firstActive && {
        [ANALYTICS_PROPS.ITEM_ID]: String(firstActive.id),
        [ANALYTICS_PROPS.ITEM_NAME]: firstActive.title,
      }),
    });
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
                isPathway
                totalScenarios={track.totalItems}
                completedScenarios={track.completedItems}
                simulationCount={track.simulationsCount}
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
                isPathway={isMultipleItems}
                totalScenarios={isMultipleItems ? item.totalScenarios : undefined}
                completedScenarios={isMultipleItems ? item.completedScenarios : undefined}
                simulationCount={isMultipleItems ? item.totalScenarios : undefined}
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
