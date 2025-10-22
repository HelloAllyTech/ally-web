import React, { useEffect, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { ArrowDown, Book, User, Users, Ally, DockToRight, Logout } from "@assets";
import { NAVIGATION_ITEM_IDS, ROUTES, en } from "@constants";
import { useUser } from "@hooks/useUser";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, filteredNavigationItems } = useUser();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      case NAVIGATION_ITEM_IDS.SIMULATION_STUDIO:
        return <Book />;
      case NAVIGATION_ITEM_IDS.USER_MANAGEMENT:
        return <Users />;
      default:
        return null;
    }
  };

  const renderSidebarItems = () => {
    return (
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {filteredNavigationItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center px-3 py-3 mb-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                  title={!isExpanded ? item.label : ""}
                >
                  <span
                    className={`${isExpanded ? "mr-3" : "mx-auto"} ${isActive ? "text-gray-600" : "text-gray-400"}`}
                  >
                    {renderIcon(item.id)}
                  </span>
                  {isExpanded && (
                    <span className="font-medium text-[14px] text-ellipsis overflow-hidden whitespace-nowrap">
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
  };

  const renderProfileSection = () => {
    return (
      <div className="border-t border-gray-200 py-4">
        {isExpanded ? (
          <div
            onClick={handleUserMenuToggle}
            className="flex flex-row items-center p-3 h-8 py-0 cursor-pointer"
          >
            <div className="w-8 flex items-center justify-center mr-3">
              <User />
            </div>
            <div className="flex-1 text-left min-w-[100px]">
              <div className="text-[16px] font-medium text-gray-700 text-ellipsis overflow-hidden whitespace-nowrap">
                {user?.name}
              </div>
              <div className="text-[12px] mb-1 text-gray-500 text-ellipsis overflow-hidden whitespace-nowrap">
                {user?.email}
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <User />
            </div>
          </div>
        )}

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <div
            ref={containerRef}
            onBlur={handleUserMenuToggle}
            className={`absolute bottom-[10px] ${isExpanded ? "left-[230px]" : "left-[100px]"} min-w-[250px] z-[999] mb-2 bg-white border border-gray-200 rounded-lg shadow-lg`}
          >
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="flex flex-row items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Logout />
                <span className="ml-2">{en.auth.logout}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 relative ${
        isExpanded ? "w-64" : "w-24"
      } p-[12px] font-['IBM_Plex_Serif']`}
    >
      <div className="flex justify-between border-b border-gray-200 relative">
        <div className={`px-2 pr-5 py-4  flex items-center justify-between`}>
          <Ally />
        </div>
        <button
          onClick={handleToggleSidebar}
          className={`${isExpanded ? "px-5 mx-2" : "absolute z-10 top-0 bg-white mx-2 px-[20px] py-[15px] opacity-0 hover:opacity-100"} hover:bg-gray-50 hover:rounded-md my-2`}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <DockToRight />
        </button>
      </div>

      {renderSidebarItems()}
      {renderProfileSection()}
    </div>
  );
};
