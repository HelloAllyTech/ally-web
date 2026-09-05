import { FC, useEffect, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { CustomImage, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useGetLogoUrlQuery, useGetUnreadReviewCountQuery } from "@api";
import { DockToRight, LogoutIllustration, RedirectIcon, WarningTriangle } from "@assets";
import {
  AppTooltip,
  ConfirmationDialog,
  ProfileSettings,
  ReportProblemModal,
  StreakPill,
  LevelIndicator,
  UserInfo,
} from "@components";
import {
  navBarOptions,
  TabId,
  Permissions,
  TooltipLocation,
  canViewOrganizationSettings,
  hasAllyAdminAccess,
  adminAppUrl,
} from "@constants";
import {
  useCanViewAnalytics,
  useCanViewCharacterLibrary,
  usePracticeStreakSummary,
  useProgressSummary,
  useUser,
} from "@hooks";

import { NavSideBarProps, TabProps } from "./types";
import { ButtonVariant } from "../button";
import LanguageSelector from "../language-selector/LanguageSelector";
import NotificationBadge from "../notification-badge/NotificationBadge";

const EXPANDED_WIDTH = 1200;

// Built lazily (inside the component) so `TabId`/`TooltipLocation` are not
// dereferenced at module load — keeps tests that mock @constants from breaking.
const getTabTooltipLocations = (): Partial<Record<string, TooltipLocation>> => ({
  [TabId.LEARN]: TooltipLocation.LEARN_TAB,
  [TabId.REVIEW]: TooltipLocation.REVIEW_TAB,
  [TabId.BADGES]: TooltipLocation.BADGES_TAB,
  [TabId.LEADERBOARD]: TooltipLocation.COMMUNITY_TAB,
  [TabId.SCRIBE_LOGS]: TooltipLocation.SESSIONS_TAB,
  [TabId.ANALYTICS]: TooltipLocation.STATISTICS_TAB,
  [TabId.SEARCH]: TooltipLocation.SEARCH_TAB,
});

const defaultProfileUploadValues: {
  profileImageUrl: string;
} = {
  profileImageUrl: "",
};

const Tab: FC<TabProps> = ({
  id,
  Icon,
  title,
  tKey,
  tagKey,
  activeTab,
  isExpanded,
  onClick,
  badgeCount,
  trailing,
  href,
}) => {
  const { t } = useTranslation();
  // Tabs that leave the app render as a real anchor, not a click-only div, so
  // they are keyboard-reachable, middle-clickable and preview the destination
  // on hover. In-app tabs keep the existing div (they route via onClick).
  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href, target: "_blank" as const, rel: "noopener noreferrer" } : {};
  return (
    <Wrapper
      data-testid={`nav-tab-${id}`}
      className={`
          w-full h-12 rounded-md p-4 flex items-center gap-3 my-1 cursor-pointer
          ${activeTab === id ? "bg-background-tertiary rounded-[2px]" : "hover:bg-background-secondary"}
          transition-all duration-300 group
        `}
      onClick={onClick}
      {...wrapperProps}
    >
      <div className="relative flex-shrink-0">
        <Icon
          className={`${activeTab === id ? "" : "opacity-60"} `}
          data-testid={`nav-tab-icon-${id}`}
        />
        {!isExpanded && badgeCount !== undefined && badgeCount > 0 && (
          <NotificationBadge count={badgeCount} />
        )}
        {!isExpanded && trailing && <span className="absolute -right-3 -top-2">{trailing}</span>}
      </div>

      {isExpanded && (
        <div className="flex items-center justify-between flex-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              data-testid={`nav-tab-title-${id}`}
              className={`${
                activeTab === id
                  ? "text-typography-900 font-[500]"
                  : "text-typography-800 font-[400]"
              } font-primary text-lg truncate`}
            >
              {tKey ? t(tKey) : title}
            </div>
            {tagKey && (
              <span
                data-testid={`nav-tab-tag-${id}`}
                className="flex-shrink-0 rounded-full bg-warning-50 px-2 py-[1px] text-[10px] font-semibold uppercase leading-none tracking-wide text-warning-700"
              >
                {t(tagKey)}
              </span>
            )}
          </div>
          {badgeCount !== undefined && badgeCount > 0 && (
            <NotificationBadge count={badgeCount} isExpanded />
          )}
          {trailing}
        </div>
      )}
    </Wrapper>
  );
};

const NavSideBar: FC<NavSideBarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { permissions, user, logout, getProfileUrl, deleteProfile, uploadProfile, refetchUser } =
    useUser();
  // Shared with the /learn bar via a single void-arg cache entry, so the pill
  // and the bar are always the same number.
  const { summary: streakSummary } = usePracticeStreakSummary();
  const { summary: progressSummary, canViewProgress } = useProgressSummary();

  const { data: unreadData } = useGetUnreadReviewCountQuery(
    { isScribe: false },
    { skip: !permissions.includes(Permissions.VIEW_SIMULATION_REVIEWS) },
  );

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
  const [openReportProblem, setOpenReportProblem] = useState<boolean>(false);
  const { canView: canViewCharacterLibrary } = useCanViewCharacterLibrary();
  const { canView: canViewAnalytics } = useCanViewAnalytics();
  const permittedTabs = navBarOptions.filter(tab => {
    // Organization Settings is gated by ADMIN role + a temporary email
    // allowlist, not by a permission (see canViewOrganizationSettings).
    if (tab.id === TabId.ORGANIZATION_SETTINGS) {
      return canViewOrganizationSettings(user);
    }

    // Character Library needs the view:scenario-character permission AND the
    // tenant's CHARACTER_LIBRARY_ENABLED org toggle — see useCanViewCharacterLibrary.
    if (tab.id === TabId.CHARACTER_LIBRARY) {
      return canViewCharacterLibrary;
    }

    // Progress needs VIEW_USER_RANK AND the tenant's PROGRESS_DASHBOARD_ENABLED org
    // toggle — see useProgressSummary. Every learner holds the permission, so a
    // permission-only check would show the tab to orgs that never opted in.
    if (tab.id === TabId.PROGRESS) {
      return canViewProgress;
    }

    // Statistics needs VIEW_ANALYTICS_DASHBOARD AND something for the page to
    // render — a registered dashboard, or the native Organization Metrics view.
    // See useCanViewAnalytics: the permission alone put an empty tab in front of
    // every tenant that has no dashboards configured.
    if (tab.id === TabId.ANALYTICS) {
      return canViewAnalytics;
    }

    // Check if user has permission for this tab
    const hasPermission =
      !tab.permissions || permissions?.some(permission => tab.permissions.includes(permission));
    if (!hasPermission) return false;

    // If this is the Badges tab, check if Leaderboard is also permitted
    if (tab.id === TabId.BADGES) {
      const hasLeaderboardPermission = navBarOptions.some(
        t =>
          t.id === TabId.LEADERBOARD &&
          (!t.permissions || permissions?.some(permission => t.permissions.includes(permission))),
      );
      return !hasLeaderboardPermission;
    }

    return true;
  });

  const showAllyAdminLink = hasAllyAdminAccess(user) && !!adminAppUrl;

  const navigate = useNavigate();
  const { data: tenantData } = useGetLogoUrlQuery();

  const [isExpanded, setIsExpanded] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);

  const profileSettingsForm = useForm({
    defaultValues: defaultProfileUploadValues,
    mode: "onChange",
  });

  const profileUrl = profileSettingsForm.watch("profileImageUrl");

  // Tracks whether the user has manually toggled the sidebar — once they have,
  // their choice sticks and auto-resize stops overriding it.
  const userToggledRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      if (userToggledRef.current) return;
      setIsExpanded(window.innerWidth >= EXPANDED_WIDTH);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onTabClick = (path: string) => {
    onTabChange(path);
    onClose();
  };

  const handleToggleSidebar = () => {
    userToggledRef.current = true;
    setIsExpanded(!isExpanded);
  };

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const closeLogoutDialog = () => {
    setIsLogoutDialogOpen(false);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSettingsClose = () => {
    setOpenSettings(false);
  };

  const handleReportProblemClick = () => {
    setOpenReportProblem(true);
  };

  const closeReportProblem = () => {
    setOpenReportProblem(false);
  };

  const renderTabs = () => {
    const tabTooltipLocations = getTabTooltipLocations();

    /**
     * Persistent streak marker on the Learn tab.
     *
     * Reads from the shared summary hook, which takes no query argument — so
     * this and the /learn bar resolve to the same RTK Query cache entry and a
     * single request, and can never show different numbers.
     *
     * No tooltip: the Learn tab is already wrapped in AppTooltip, and
     * NavbarWrapper's `overflow-y-hidden` computes overflow-x to `auto`, making
     * it a clipping ancestor on both axes for the non-portaled Carbon tooltip —
     * the failure already documented further down this file. The meaning lives
     * in the pill's aria-label instead.
     */
    const renderStreakPill = () => {
      if (!streakSummary || streakSummary.currentStreak <= 0) return null;

      const labelKey = streakSummary.atRisk
        ? "practiceStreak.nav.atRisk"
        : "practiceStreak.nav.value";

      return (
        <StreakPill
          days={streakSummary.currentStreak}
          atRisk={streakSummary.atRisk}
          ariaLabel={t(labelKey, { count: streakSummary.currentStreak })}
        />
      );
    };

    /**
     * Persistent level ring on the Progress tab.
     *
     * Shares the void-argument summary query with the Progress page, so the rail and the
     * page it links to resolve to one RTK Query cache entry and cannot disagree.
     *
     * Level 1 with no XP still renders: unlike a streak, which is genuinely absent until
     * earned, every learner has a level, and hiding it until level 2 would make the tab
     * look broken on day one.
     */
    const renderLevelIndicator = () => {
      if (!progressSummary) return null;

      return (
        <LevelIndicator
          level={progressSummary.level}
          progress={progressSummary.progress}
          isMaxLevel={progressSummary.isMaxLevel}
          // Collapsed, the trailing slot is a small corner overlay on an 18px icon, so
          // the ring is swapped for the pill the streak marker already uses there.
          variant={isExpanded ? "ring" : "pill"}
          ariaLabel={t("progress.a11y.navLevel", {
            level: progressSummary.level,
          })}
        />
      );
    };

    return (
      <div
        className="flex-1 flex-col gap-1 m-2 border-t border-t-border-light pt-3"
        data-testid="nav-sidebar-tabs"
      >
        {permittedTabs?.map(({ id, Icon, title, path, key: translationKey, tagKey }: any) => {
          const tab = (
            <Tab
              id={id}
              Icon={Icon}
              title={title}
              tKey={translationKey}
              tagKey={tagKey}
              activeTab={activeTab}
              isExpanded={isExpanded}
              onClick={() => onTabClick(path)}
              badgeCount={id === TabId.REVIEW ? unreadData?.count : undefined}
              trailing={
                id === TabId.LEARN
                  ? renderStreakPill()
                  : id === TabId.PROGRESS
                    ? renderLevelIndicator()
                    : undefined
              }
            />
          );

          const tooltipLocation = tabTooltipLocations[id];

          return tooltipLocation ? (
            <AppTooltip key={id} location={tooltipLocation}>
              {tab}
            </AppTooltip>
          ) : (
            <div key={id}>{tab}</div>
          );
        })}

        {/* Report a problem is deliberately not in navBarOptions: it opens the
            modal in place rather than routing anywhere, so activeTab can never
            match it (never highlighted, same as Ally Admin below). Always
            visible — not permission-gated — and closes the mobile drawer
            first so the modal isn't left rendering behind it. */}
        <Tab
          id={TabId.REPORT_PROBLEM}
          Icon={WarningTriangle}
          title="Report a problem"
          tKey="user.reportProblem"
          activeTab={activeTab}
          isExpanded={isExpanded}
          onClick={() => {
            handleReportProblemClick();
            onClose();
          }}
        />

        {/* Ally Admin is deliberately not in navBarOptions: it routes nowhere in
            this app, can never be the active tab, and would force routes.ts to
            import an icon (which breaks every test that mocks @assets — see the
            note in that file). It is gated on the roles the admin console admits
            at login rather than on a permission, and on there being somewhere to
            send them, so an unset VITE_ADMIN_APP_URL hides it rather than
            opening a dead tab. Kept below the tabs, separated, because it leaves
            the app. */}
        {showAllyAdminLink && (
          <div className="mt-1 border-t border-t-border-light pt-1">
            <Tab
              id={TabId.ALLY_ADMIN}
              Icon={RedirectIcon}
              title="Ally Admin"
              tKey="nav.tabs.allyAdmin"
              activeTab={activeTab}
              isExpanded={isExpanded}
              href={adminAppUrl}
              // The anchor does the navigating; this only dismisses the mobile
              // drawer left open behind the new tab.
              onClick={onClose}
            />
          </div>
        )}
      </div>
    );
  };

  const handleSettingsClick = () => {
    setOpenSettings(true);
  };

  const handleProfileUpload = async () => {
    const existingProfileUrl = user.profileImageUrl;

    await uploadProfile({ profileImageUrl: profileUrl });
    if (existingProfileUrl) await deleteProfile({ profileImageUrl: existingProfileUrl });
    await refetchUser();
    setOpenSettings(false);
  };

  return (
    <>
      <div
        data-testid="nav-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-20 bg-background h-dvh flex flex-col justify-between border-r border-r-border-light transition-all duration-300 ${
          isExpanded ? "w-64" : "w-24"
        } p-[12px] font-primary ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo container */}
        <div
          className="relative flex items-center justify-between h-[72px]"
          data-testid="nav-sidebar-header"
        >
          {/* Logo */}

          {/* No `overflow-hidden` here: the org-name Tooltip renders its bubble
              inline (Carbon Tooltip is not portaled), so an overflow-hidden
              ancestor would clip it off-screen. The logo image is still clipped
              to the rounded box by the inner wrapper's own overflow-hidden. */}
          <div className="relative w-14 h-14 border-[0.5px] group ml-2 rounded-md box-border flex items-center justify-center">
            {/* Toggle button - covers logo when collapsed */}
            <Tooltip label={tenantData?.name ?? ""} align="right">
              <div className="w-14 h-14  group rounded-md box-border overflow-hidden flex items-center justify-center">
                <CustomImage
                  src={tenantData?.logoUrl}
                  alt="org-logo"
                  className={`object-cover w-full h-full transition-opacity duration-200 rounded-md ${
                    !isExpanded ? "group-hover:opacity-20" : ""
                  }`}
                  fallbackClassName="w-14 h-14  group rounded-md box-border overflow-hidden flex items-center justify-center bg-neutral-100"
                  fallbackText={tenantData?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
                />
              </div>
            </Tooltip>
            {!isExpanded && (
              <button
                data-testid="nav-sidebar-toggle"
                onClick={handleToggleSidebar}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-50 hover:rounded-md"
                title={t("nav.sidebar.expand")}
              >
                <DockToRight />
              </button>
            )}
          </div>

          {isExpanded && (
            <button
              data-testid="nav-sidebar-toggle"
              onClick={handleToggleSidebar}
              className="p-3 transition-all duration-200 hover:bg-gray-50 hover:rounded-md"
              title={t("nav.sidebar.collapse")}
            >
              <DockToRight />
            </button>
          )}
        </div>
        {renderTabs()}

        <div className="flex flex-col items-start gap-3 mx-4 my-3" data-testid="nav-sidebar-footer">
          <hr className="w-full border-t border-gray-200" data-testid="nav-sidebar-divider" />

          {isExpanded && FEATURE_FLAGS_MAP.LANGUAGE_SELECTOR_FLAG && (
            <AppTooltip location={TooltipLocation.LANGUAGE_SELECTOR}>
              <div className="w-full" data-testid="nav-sidebar-language-selector">
                <LanguageSelector label={t("nav.language.label")} />
              </div>
            </AppTooltip>
          )}

          <UserInfo
            user={user}
            onLogout={handleLogout}
            isExpanded={isExpanded}
            onProfileSettings={handleSettingsClick}
            profileUrl={user.profileImageUrl}
            name={user.name}
          />
        </div>
      </div>
      <ConfirmationDialog
        title={{
          normal: t("nav.logout.title.normal"),
          italic: t("nav.logout.title.italic"),
        }}
        isOpen={isLogoutDialogOpen}
        onClose={closeLogoutDialog}
        content={t("nav.logout.content")}
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={handleConfirmLogout}
        buttonText={t("nav.logout.button")}
        icon={LogoutIllustration}
      />
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-10 md:hidden"
          onClick={onClose}
          data-testid="nav-sidebar-overlay"
        ></div>
      )}
      <ProfileSettings
        isOpen={openSettings}
        onClose={handleSettingsClose}
        userData={user}
        formMethods={profileSettingsForm}
        onButtonClick={handleProfileUpload}
        getProfileUrl={getProfileUrl}
      />
      <ReportProblemModal open={openReportProblem} onClose={closeReportProblem} />
    </>
  );
};

export default NavSideBar;
