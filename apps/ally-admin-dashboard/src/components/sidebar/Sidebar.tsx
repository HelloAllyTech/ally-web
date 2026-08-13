import React, { useEffect, useRef, useState } from "react";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  BarChart3,
  Branch,
  Chat,
  Chemistry,
  Debug,
  MachineLearningModel,
  Roadmap,
  Close,
  Document,
  Flag,
  Info,
  Languages,
  List,
  Search,
  Settings,
  SkillLevel,
  Terminal,
} from "@icons";
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
  UserSpeaker,
  CharacterLibrary,
  FrameSource,
  Guardrails,
  Badge,
} from "@assets";
import { UserModal } from "@components";
import { SIDEBAR_ITEMS, ROUTES, en, profileSettings, USER_MODAL_FIELDS_IDS } from "@constants";
import { useClickOutside, useUser } from "@hooks";

import { SortableNavItem } from "./SortableNavItem";

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
    canReorder,
    reorderSidebar,
    getProfileUrl,
    deleteProfile,
    uploadProfileImage,
    refetchUser,
  } = useUser();

  // Press-and-drag: a click below the activation distance still navigates,
  // a press-and-move past it starts a reorder (and the trailing click is
  // suppressed by dnd-kit).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    // Reordering is disabled while filtering — the rendered list is a subset, so
    // drag indices wouldn't map back to the full order.
    if (navSearch.trim()) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = filteredNavigationItems.map(item => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    reorderSidebar(arrayMove(ids, oldIndex, newIndex));
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);
  const [navSearch, setNavSearch] = useState("");

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
      // Voices is TTS — the side that talks — so a persona with a speaker. The
      // microphone belongs to Speech Recognition, the side that listens.
      case SIDEBAR_ITEMS.SCENARIO_VOICES:
        return <UserSpeaker size={20} />;
      case SIDEBAR_ITEMS.STT_CONFIGS:
        return <Mic />;
      case SIDEBAR_ITEMS.LLM_MODEL_CATALOG:
        return <MachineLearningModel size={20} />;
      case SIDEBAR_ITEMS.SCENARIO_LANGUAGES:
        return <Globe />;
      case SIDEBAR_ITEMS.MANAGE_GUARDRAILS:
        return <Guardrails />;
      case SIDEBAR_ITEMS.PROMPTS:
        return <FrameSource />;
      case SIDEBAR_ITEMS.USER_BADGES:
        return <Badge />;
      case SIDEBAR_ITEMS.TRANSLATIONS:
        return <Languages size={20} />;
      case SIDEBAR_ITEMS.TOOLTIPS:
        return <Info size={20} />;
      case SIDEBAR_ITEMS.BLOG:
        return <Document size={20} />;
      case SIDEBAR_ITEMS.ANALYTICS:
        return <BarChart3 size={20} />;
      case SIDEBAR_ITEMS.AGENT_TEST_CASES:
        return <Flag size={20} />;
      case SIDEBAR_ITEMS.COMPETENCIES:
        return <SkillLevel size={20} />;
      case SIDEBAR_ITEMS.ROLEPLAY_SESSION_LOGS:
        return <List size={20} />;
      case SIDEBAR_ITEMS.AI_LAB:
        return <Chemistry size={20} />;
      case SIDEBAR_ITEMS.PRODUCT_ROADMAP:
        return <Roadmap size={20} />;
      case SIDEBAR_ITEMS.SETTINGS:
        return <Settings size={20} />;
      // Deliberately NOT the List icon that ROLEPLAY_SESSION_LOGS uses. These are raw CloudWatch
      // streams rather than a browsable list of sessions, and two log entries sharing one glyph are
      // indistinguishable once the sidebar is collapsed to icons.
      // Branching, not a book: the v2 studio authors a state machine, where SIMULATION_STUDIO
      // authors linear scenarios and already holds Book.
      case SIDEBAR_ITEMS.ROLEPLAY_STUDIO:
        return <Branch size={20} />;
      case SIDEBAR_ITEMS.LOGS:
        return <Terminal size={20} />;
      case SIDEBAR_ITEMS.WHATSAPP_BOT:
        return <Chat size={20} />;
      case SIDEBAR_ITEMS.BUG_HUNTER:
        return <Debug size={20} />;
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
      case ROUTES.MANAGE_STT_CONFIGS:
        return location.pathname.includes(ROUTES.MANAGE_STT_CONFIGS);
      case ROUTES.MANAGE_LLM_MODEL_CATALOG:
        return location.pathname.includes(ROUTES.MANAGE_LLM_MODEL_CATALOG);
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
      case ROUTES.BLOG:
        return location.pathname.includes(ROUTES.BLOG);
      case ROUTES.ANALYTICS:
        return location.pathname.includes(ROUTES.ANALYTICS);
      case ROUTES.ROLEPLAY_SESSION_LOGS:
        return location.pathname.includes(ROUTES.ROLEPLAY_SESSION_LOGS);
      case ROUTES.AI_LAB:
        return location.pathname.includes(ROUTES.AI_LAB);
      case ROUTES.PRODUCT_ROADMAP:
        return location.pathname.includes(ROUTES.PRODUCT_ROADMAP);
      case ROUTES.SETTINGS:
        return location.pathname.includes(ROUTES.SETTINGS);
      default:
        return false;
    }
  };

  const query = navSearch.trim().toLowerCase();
  const isSearching = query.length > 0;
  const displayedNavItems = isSearching
    ? filteredNavigationItems.filter(item => item.label.toLowerCase().includes(query))
    : filteredNavigationItems;

  const sidebarItems = (
    <div className="flex-1 min-h-0 flex flex-col pt-4">
      {/* Kept outside the scrollable nav below so it stays visible ("sticky") at any scroll position. */}
      {isExpanded && (
        <div className="relative flex items-center px-2 mb-3 flex-shrink-0">
          <span className="absolute left-5 flex items-center text-typography-600 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={navSearch}
            onChange={e => setNavSearch(e.target.value)}
            placeholder={en.common.searchMenu}
            aria-label={en.common.searchMenu}
            className="w-full rounded-lg border border-border-light bg-transparent pl-9 pr-8 py-2 text-sm text-typography-900 placeholder-typography-600 outline-none focus:border-primary-500"
          />
          {navSearch.length > 0 && (
            <button
              type="button"
              onClick={() => setNavSearch("")}
              aria-label={en.common.clearSearch}
              className="absolute right-4 flex items-center text-typography-600 hover:text-typography-900"
            >
              <Close size={16} />
            </button>
          )}
        </div>
      )}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={displayedNavItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {displayedNavItems.map(item => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  icon={renderIcon(item.id)}
                  isActive={isTabItemActive(item.path)}
                  isExpanded={isExpanded}
                  canReorder={canReorder && !isSearching}
                  onNavigate={handleNavigation}
                />
              ))}
            </ul>
            {isExpanded && isSearching && displayedNavItems.length === 0 && (
              <p className="px-3 py-2 text-sm text-typography-600">{en.common.noMenuResults}</p>
            )}
          </SortableContext>
        </DndContext>
      </nav>
    </div>
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
