import React, { useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { ArrowDown, Book, User, Users } from "@assets";
import { ROUTES } from "@constants";
import { useUser } from "@hooks/useUser";

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    id: "simulation-studio",
    label: "Simulation Studio",
    path: ROUTES.SIMULATION_STUDIO,
    icon: <Book />,
  },
  {
    id: "user-management",
    label: "User management",
    path: ROUTES.USER_MANAGEMENT,
    icon: <Users />,
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const renderSidebarItems = () => {
    return (
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navigationItems.map(item => {
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
                    {item.icon}
                  </span>
                  {isExpanded && <span className="font-medium text-[14px]">{item.label}</span>}
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
      <div className="relative border-t border-gray-200 py-4">
        {isExpanded ? (
          <div
            onClick={handleUserMenuToggle}
            className="flex flex-row items-center p-3 h-8 py-0 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3">
              <User />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[16px] font-medium text-gray-700">{user?.name}</div>
              <div className="text-[12px] text-gray-500">{user?.email}</div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center ml-3">
              <ArrowDown />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <User />
            </div>
          </div>
        )}

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <div
            onBlur={handleUserMenuToggle}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        <button
          onClick={handleToggleSidebar}
          className="absolute top-[-64px] right-[-22px] shadow-md w-6 h-6 rounded-[50%] flex justify-center items-center bg-white hover:bg-gray-100 rounded-lg transition-colors"
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <div className={`${isExpanded ? "rotate-90" : "rotate-[270deg]"}`}>
            <ArrowDown />
          </div>
        </button>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        isExpanded ? "w-64" : "w-24"
      } p-[12px] font-['IBM_Plex_Serif']`}
    >
      <div
        className={`${isExpanded ? "px-6" : "px-3"} py-4 border-b border-gray-200 flex items-center justify-between`}
      >
        <h1 className="text-2xl text-blue-900">Ally</h1>
      </div>

      {renderSidebarItems()}
      {renderProfileSection()}
    </div>
  );
};
