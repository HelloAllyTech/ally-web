import React, { useEffect, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { ArrowDown, Book, User, Users, Ally, DockToRight, Logout, HappyEmoji } from "@assets";
import { SIDEBAR_ITEMS, ROUTES, en } from "@constants";
import { useClickOutside, useUser } from "@hooks";

const EXPANDED_WIDTH = 1200;

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, filteredNavigationItems } = useUser();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsUserMenuOpen(false));

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

  const renderIcon = (id: string): React.ReactNode | undefined => {
    switch (id) {
      case SIDEBAR_ITEMS.SIMULATION_STUDIO:
        return <Book />;
      case SIDEBAR_ITEMS.USER_MANAGEMENT:
        return <Users />;
      case SIDEBAR_ITEMS.EVENT_MANAGEMENT:
        return <HappyEmoji />;
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
      default:
        return false;
    }
  };

  const sidebarItems = (
    <nav className="flex-1 px-2 py-4">
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
                  className={`${isExpanded ? "mr-3" : "mx-auto"} ${isActive ? "text-typography-800" : "text-typography-600"}`}
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
    <div ref={containerRef} className="border-t border-border-light py-4">
      {isExpanded ? (
        <div
          onClick={handleUserMenuToggle}
          className="flex flex-row justify-between items-center h-8 py-0 cursor-pointer"
        >
          <div className="flex flex-row items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2">
              <User />
            </div>
            <div className="flex-1 text-left w-full min-w-[100px]">
              <div className="text-lg text-typography-900 text-ellipsis overflow-hidden whitespace-nowrap">
                {user?.name}
              </div>
              <div className="text-xs mb-1 text-typography-800 text-ellipsis overflow-hidden whitespace-nowrap">
                {user?.email}
              </div>
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ml-3 ${isUserMenuOpen ? "rotate-[-90deg]" : ""}`}
          >
            <ArrowDown />
          </div>
        </div>
      ) : (
        <div onClick={handleUserMenuToggle} className="flex justify-center">
          <div className="w-8 flex items-center justify-center">
            <User />
          </div>
        </div>
      )}

      {/* User Menu Dropdown */}
      {isUserMenuOpen && (
        <div
          onBlur={handleUserMenuToggle}
          className={`absolute bottom-[10px] ${isExpanded ? "left-[230px]" : "left-[100px]"} min-w-[250px] z-[999] mb-2 bg-white border border-border-light rounded-lg shadow-lg`}
        >
          <div className="py-1">
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
