import { FC, useEffect, useState } from "react";

import { Tooltip } from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetLogoUrlQuery } from "@api";
import { DockToRight, LogoutIllustration } from "@assets";
import { ConfirmationDialog, ProfileSettings, UserInfo } from "@components";
import { navBarOptions, TOOLTIP_LIGHT_PROPS, TabId } from "@constants";
import { useUser } from "@hooks";

import { NavSideBarProps, TabProps } from "./types";
import { ButtonVariant } from "../button";

const EXPANDED_WIDTH = 1200;

const defaultProfileUploadValues: {
  profileImageUrl: string;
} = {
  profileImageUrl: "",
};

const Tab: FC<TabProps> = ({ id, Icon, title, activeTab, isExpanded, onClick }) => (
  <div
    data-testid={`nav-tab-${id}`}
    className={`
          w-full h-12 rounded-md p-4 flex items-center gap-3 my-1 cursor-pointer
          ${activeTab === id ? "bg-[#F3F3F3] rounded-[2px]" : "hover:bg-[#F5F5F5]"}
          transition-all duration-300 group
        `}
    onClick={onClick}
  >
    <Icon
      className={`flex-shrink-0 ${activeTab === id ? "" : "opacity-60"} `}
      data-testid={`nav-tab-icon-${id}`}
    />

    {isExpanded && (
      <div
        data-testid={`nav-tab-title-${id}`}
        className={`${
          activeTab === id ? "text-typography-900 font-[500]" : "text-typography-800 font-[400]"
        } font-primary text-lg`}
      >
        {title}
      </div>
    )}
  </div>
);

const NavSideBar: FC<NavSideBarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const { permissions, user, logout, getProfileUrl, deleteProfile, uploadProfile, refetchUser } =
    useUser();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
  const permittedTabs = navBarOptions.filter(tab => {
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
    return (
      <div
        className="flex-1 flex-col gap-1 m-2 border-t border-t-[#E5E7EB] pt-3"
        data-testid="nav-sidebar-tabs"
      >
        {permittedTabs?.map(({ id, Icon, title, path }) => (
          <Tab
            key={id}
            id={id}
            Icon={Icon}
            title={title}
            activeTab={activeTab}
            isExpanded={isExpanded}
            onClick={() => onTabClick(path)}
          />
        ))}
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
        className={`bg-white h-screen flex flex-col justify-between border-r border-r-[#E5E7EB] transition-all duration-300 relative ${
          isExpanded ? "w-64" : "w-24"
        } p-[12px] font-primary`}
      >
        {/* Logo container */}
        <div
          className="relative flex items-center justify-between h-[72px]"
          data-testid="nav-sidebar-header"
        >
          {/* Logo */}

          <div className="relative w-14 h-14 border-[0.5px] group ml-2 rounded-md box-border overflow-hidden flex items-center justify-center">
            {/* Toggle button - covers logo when collapsed */}
            <Tooltip
              title={tenantData?.name}
              placement="right"
              arrow
              slotProps={TOOLTIP_LIGHT_PROPS}
            >
              <div className="w-14 h-14 border-[0.5px] group rounded-md box-border overflow-hidden flex items-center justify-center">
                <CustomImage
                  src={tenantData?.logoUrl}
                  alt="org-logo"
                  className={`object-cover w-full h-full transition-opacity duration-200 rounded-md ${
                    !isExpanded ? "group-hover:opacity-20" : ""
                  }`}
                  fallbackClassName="w-14 h-14 border-[0.5px] group rounded-md box-border overflow-hidden flex items-center justify-center bg-neutral-100"
                  fallbackText={tenantData?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
                />
              </div>
            </Tooltip>
            {!isExpanded && (
              <button
                data-testid="nav-sidebar-toggle"
                onClick={handleToggleSidebar}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-50 hover:rounded-md"
                title="Expand sidebar"
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
              title="Collapse sidebar"
            >
              <DockToRight />
            </button>
          )}
        </div>
        {renderTabs()}

        <div className="flex flex-col items-start gap-3 mx-4 my-3" data-testid="nav-sidebar-footer">
          <hr className="w-full border-t border-gray-200" data-testid="nav-sidebar-divider" />

          <UserInfo
            user={user}
            onLogout={handleLogout}
            isExpanded={isExpanded}
            onProfileSettings={handleSettingsClick}
            profileUrl={user.profileImageUrl}
          />
        </div>
      </div>
      <ConfirmationDialog
        title={{ normal: "Safeguard your ", italic: "account" }}
        isOpen={isLogoutDialogOpen}
        onClose={closeLogoutDialog}
        content="Are you sure you want to log out? You will need to enter secure OTP to login again."
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={handleConfirmLogout}
        buttonText="Logout & lock my Ally account"
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
