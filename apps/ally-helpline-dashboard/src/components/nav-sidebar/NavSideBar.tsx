import { FC, useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { CustomImage, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useGetLogoUrlQuery, useGetUnreadReviewCountQuery } from "@api";
import { DockToRight, LogoutIllustration } from "@assets";
import { AppTooltip, ConfirmationDialog, ProfileSettings, UserInfo } from "@components";
import {
  navBarOptions,
  TabId,
  Permissions,
  TooltipLocation,
  canViewOrganizationSettings,
} from "@constants";
import { useUser } from "@hooks";

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
}) => {
  const { t } = useTranslation();
  return (
    <div
      data-testid={`nav-tab-${id}`}
      className={`
          w-full h-12 rounded-md p-4 flex items-center gap-3 my-1 cursor-pointer
          ${activeTab === id ? "bg-background-tertiary rounded-[2px]" : "hover:bg-background-secondary"}
          transition-all duration-300 group
        `}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <Icon
          className={`${activeTab === id ? "" : "opacity-60"} `}
          data-testid={`nav-tab-icon-${id}`}
        />
        {!isExpanded && badgeCount !== undefined && badgeCount > 0 && (
          <NotificationBadge count={badgeCount} />
        )}
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
              } font-primary text-lg`}
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
        </div>
      )}
    </div>
  );
};

const NavSideBar: FC<NavSideBarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { permissions, user, logout, getProfileUrl, deleteProfile, uploadProfile, refetchUser } =
    useUser();

  const { data: unreadData } = useGetUnreadReviewCountQuery(
    { isScribe: false },
    { skip: !permissions.includes(Permissions.VIEW_SIMULATION_REVIEWS) },
  );

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
  const permittedTabs = navBarOptions.filter(tab => {
    // Organization Settings is gated by ADMIN role + a temporary email
    // allowlist, not by a permission (see canViewOrganizationSettings).
    if (tab.id === TabId.ORGANIZATION_SETTINGS) {
      return canViewOrganizationSettings(user);
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

  const navigate = useNavigate();
  const { data: tenantData } = useGetLogoUrlQuery();

  const [isExpanded, setIsExpanded] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);

  const profileSettingsForm = useForm({
    defaultValues: defaultProfileUploadValues,
    mode: "onChange",
  });

  const profileUrl = profileSettingsForm.watch("profileImageUrl");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < EXPANDED_WIDTH) {
        setIsExpanded(false);
      }
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

  const renderTabs = () => {
    const tabTooltipLocations = getTabTooltipLocations();
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
        className={`bg-background h-screen flex flex-col justify-between border-r border-r-border-light transition-all duration-300 relative ${
          isExpanded ? "w-64" : "w-24"
        } p-[12px] font-primary`}
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
    </>
  );
};

export default NavSideBar;
