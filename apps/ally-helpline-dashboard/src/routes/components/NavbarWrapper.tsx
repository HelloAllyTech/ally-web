import { FC, useEffect, useMemo, useState } from "react";

import { MenuIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

import { NavSideBar } from "@components";
import { excludeNavBar, navBarOptions, TabId, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser, useAchievementBadgeModal } from "@hooks";
import { isPathExcluded } from "@utils";

import UploadProgressDialog from "./UploadProgressDialog";

// TODO: Rename to LayoutWrapper
const NavbarWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user, checkAuth, isAuthenticated } = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const { BadgeModal } = useAchievementBadgeModal();

  const shouldShowBadgeModal =
    isAuthenticated && !isPathExcluded(pathname, [ROUTES.SIMULATION_SUMMARY_FULL]);

  useEffect(() => {
    // checkAuth only for logged in users
    // TODO: try to optimize this
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      checkAuth();
    }
  }, []);

  const showNavbar = user && !isPathExcluded(pathname, excludeNavBar);

  const activeTab = useMemo(
    () =>
      navBarOptions.find(
        option =>
          option.path === pathname || option.activePages.some(page => matchPath(page, pathname)),
      )?.id ?? TabId.SCRIBE_LOGS,
    [pathname],
  );
  const handleTabChange = (path: string) => {
    navigate(path);
  };
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-dvh w-full overflow-y-hidden">
      {showNavbar && (
        <NavSideBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={toggleSidebar}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-white custom-scrollbar">
        {showNavbar && (
          <div className="sticky top-0 z-30 flex shrink-0 items-center justify-end border-b border-border-light bg-white p-2 md:hidden">
            <button
              onClick={toggleSidebar}
              aria-label={t("nav.sidebar.expand")}
              data-testid="nav-sidebar-hamburger"
            >
              <MenuIcon />
            </button>
          </div>
        )}
        {/* flex-1 min-h-0 (not a calc(100dvh-Npx) guess) gives this region a
            real, always-correct height in both branches — whatever's left
            after the optional toolbar row above — which pages below can then
            rely on via h-full instead of each re-deriving the viewport. */}
        <div className="min-h-0 flex-1" data-testid="navbar-content-region">
          {children}
          <UploadProgressDialog />
          {shouldShowBadgeModal && BadgeModal}
        </div>
      </div>
    </div>
  );
};

export default NavbarWrapper;
