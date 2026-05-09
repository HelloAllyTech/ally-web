import React, { useEffect, useRef, useState } from "react";

import { Info, Languages } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import {
  ArrowDown,
  Book,
  User,
  Users,
  Ally,
  DockToRight,
  Logout,
  HappyEmoji,
  ManageAccounts,
  Globe,
  Mic,
  CharacterLibrary,
  FrameSource,
  Guardrails,
  Badge,
} from "@assets";
import { UserModal } from "@components";
import { SIDEBAR_ITEMS, ROUTES, en, profileSettings, USER_MODAL_FIELDS_IDS } from "@constants";
import { useClickOutside, useUser } from "@hooks";

const EXPANDED_WIDTH = 1200;

const defaultProfileUploadValues: {
  profileImageUrl: string;
} = {
  profileImageUrl: "",
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    logout,
    filteredNavigationItems,
    getProfileUrl,
    deleteProfile,
    uploadProfileImage,
    refetchUser,
  } = useUser();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsUserMenuOpen(false));

  const profileSettingsForm = useForm({
    defaultValues: defaultProfileUploadValues,
    mode: "onChange",
  });

  const imageUploaded = profileSettingsForm.watch("profileImageUrl");

  useEffect(() => {
    if (
      location.pathname.includes(ROUTES.CREATE_SIMULATION) ||
      location.pathname.includes(ROUTES.CREATE_PATH)
    ) {
      setIsExpanded(false);
    }
  }, [location.pathname]);

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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleToggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };
  const handleProfileSettingClick = () => {
    setIsUserMenuOpen(false);
    setOpenSettings(true);
  };

  const uploadProfile = async () => {
    const existingProfileUrl = user.profileImageUrl;
    await uploadProfileImage({ profileImageUrl: imageUploaded });

    if (existingProfileUrl) await deleteProfile({ profileImageUrl: existingProfileUrl });
    await refetchUser();

    setOpenSettings(false);
  };

  const renderIcon = (id: string): React.ReactNode | undefined => {
    switch (id) {
      case SIDEBAR_ITEMS.SIMULATION_STUDIO:
        return <Book />;
      case SIDEBAR_ITEMS.USERS:
        return <Users />;
      case SIDEBAR_ITEMS.EVENTS:
        return <HappyEmoji />;
      case SIDEBAR_ITEMS.CHARACTER_LIBRARY:
        return <CharacterLibrary />;
      case SIDEBAR_ITEMS.SCENARIO_VOICES:
        return <Mic />;
      case SIDEBAR_ITEMS.SCENARIO_LANGUAGES:
        return <Globe />;
      case SIDEBAR_ITEMS.MANAGE_GUARDRAILS:
        return <Guardrails />;
      case SIDEBAR_ITEMS.PROMPTS:
        return <FrameSource />;
      case SIDEBAR_ITEMS.USER_BADGES:
        return <Badge />;
      case SIDEBAR_ITEMS.TRANSLATIONS:
        return <Languages size={20} strokeWidth={1.8} />;
      case SIDEBAR_ITEMS.TOOLTIPS:
        return <Info size={20} strokeWidth={1.8} />;
      default:
        return null;
    }
  };

  const isTabItemActive = (path: string) => {
    switch (path) {
      case ROUTES.SIMULATION_STUDIO:
        return (
          location.pathname.includes(ROUTES.SIMULATION_STUDIO) ||
          location.pathname.includes(ROUTES.CREATE_SIMULATION)
        );
      case ROUTES.USER_MANAGEMENT:
        return location.pathname.includes(ROUTES.USER_MANAGEMENT);
      case ROUTES.MANAGE_EVENTS:
        return location.pathname.includes(ROUTES.MANAGE_EVENTS);
      case ROUTES.CHARACTER_LIBRARY:
        return location.pathname.includes(ROUTES.CHARACTER_LIBRARY);
      case ROUTES.MANAGE_SCENARIO_LANGUAGES:
        return location.pathname.includes(ROUTES.MANAGE_SCENARIO_LANGUAGES);
      case ROUTES.MANAGE_SCENARIO_VOICES:
        return location.pathname.includes(ROUTES.MANAGE_SCENARIO_VOICES);
      case ROUTES.MANAGE_PROMPTS:
        return location.pathname.includes(ROUTES.MANAGE_PROMPTS);
      case ROUTES.MANAGE_GUARDRAILS:
        return location.pathname.includes(ROUTES.MANAGE_GUARDRAILS);
      case ROUTES.USER_BADGES:
        return location.pathname.includes(ROUTES.USER_BADGES);
      case ROUTES.MANAGE_TRANSLATIONS:
        return location.pathname.includes(ROUTES.MANAGE_TRANSLATIONS);
      case ROUTES.MANAGE_TOOLTIPS:
        return location.pathname.includes(ROUTES.MANAGE_TOOLTIPS);
      default:
        return false;
    }
  };

  const sidebarItems = (
    <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4">
      <ul className="space-y-1">
        {filteredNavigationItems.map(item => {
          const isActive = isTabItemActive(item.path);
          return (
            <li key={item.id}>
              <button
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center px-3 py-3 mb-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-neutral-100 text-typography-900 font-medium "
                    : "text-typography-800 hover:bg-background-secondary hover:text-typography-900"
                }`}
                title={!isExpanded ? item.label : ""}
              >
                <span
                  className={`w-6 flex items-center justify-center ${isExpanded ? "mr-3" : "mx-auto"} ${isActive ? "text-typography-800" : "text-typography-600"}`}
                >
                  {renderIcon(item.id)}
                </span>
                {isExpanded && (
                  <span className="text-base text-ellipsis overflow-hidden whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const profileSection = (
    <>
      <div ref={containerRef} className="flex-shrink-0 border-t border-border-light py-4">
        <div
          onClick={handleUserMenuToggle}
          className="flex flex-row justify-between items-center h-8 py-0 cursor-pointer"
        >
          <div className="flex gap-2 items-center w-full justify-center object-cover">
            <div className="w-[40px] h-[40px] rounded-full overflow-hidden flex items-center justify-center">
              {user?.profileImageUrl ? (
                <CustomImage
                  src={user?.profileImageUrl}
                  alt="profile"
                  containerClassName="w-full h-full"
                  fallbackClassName="flex items-center justify-center text-typography-600 bg-neutral-100 rounded-full object-cover w-full h-full"
                  fallbackText="NA"
                />
              ) : (
                <User />
              )}
            </div>

            {isExpanded && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-lg text-typography-900 truncate">{user?.name}</div>
                <div className="text-xs mb-1 text-typography-800 truncate">{user?.email}</div>
              </div>
            )}
          </div>
          {isExpanded && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isUserMenuOpen ? "rotate-[-90deg]" : ""}`}
            >
              <ArrowDown />
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <div
            onBlur={handleUserMenuToggle}
            className={`absolute bottom-[10px] ${isExpanded ? "left-[230px]" : "left-[100px]"} min-w-[250px] z-[999] mb-2 bg-white border border-border-light rounded-lg shadow-lg`}
          >
            <div className="py-1">
              <button
                onClick={handleProfileSettingClick}
                className="flex flex-row items-center w-full px-4 py-2 gap-2 text-left text-sm text-typography-900 hover:bg-background-secondary"
              >
                <ManageAccounts />
                <span>{en.auth.profileSettings}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex flex-row items-center w-full px-4 py-2 gap-2 text-left text-sm text-typography-900 hover:bg-background-secondary transition-colors"
              >
                <Logout />
                <span>{en.auth.logout}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <UserModal
        isOpen={openSettings}
        onClose={() => setOpenSettings(false)}
        title={en.auth.profileSettings}
        imageUpload
        fields={profileSettings}
        details={user}
        uploadTitle={en.auth.profileImage}
        handleClick={uploadProfile}
        formMethods={profileSettingsForm}
        uploadId={USER_MODAL_FIELDS_IDS.PROFILE}
        uploadButtonName={imageUploaded ? en.userManagement.changeImage : en.auth.uploadImage}
        uploadImageUrl={getProfileUrl}
      />
    </>
  );

  return (
    <div
      className={`flex flex-col h-screen bg-white border-r border-border-light transition-all duration-300 relative ${
        isExpanded ? "w-64" : "w-24"
      } p-[12px] font-primary`}
    >
      <div className="flex justify-between border-b border-border-light relative">
        <div className={`px-2 pr-5 py-4  flex items-center justify-between`}>
          <Ally />
        </div>
        <button
          onClick={handleToggleSidebar}
          className={`${isExpanded ? "px-5 mx-2" : "absolute z-10 top-0 bg-white mx-2 px-[20px] py-[15px] opacity-0 hover:opacity-100"} hover:bg-background-secondary hover:rounded-md my-2`}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <DockToRight />
        </button>
      </div>

      {sidebarItems}
      {profileSection}
    </div>
  );
};
