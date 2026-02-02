import { FC, useEffect, useMemo, useState } from "react";

import { MenuIcon } from "lucide-react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { NavSideBar } from "@components";
import { excludeNavBar, navBarOptions, TabId, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser, useAchievementBadgeModal } from "@hooks";
import { isPathExcluded } from "@utils";

import UploadProgressDialog from "./UploadProgressDialog";

// TODO: Rename to LayoutWrapper
const NavbarWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, checkAuth, isAuthenticated } = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const { BadgeModal } = useAchievementBadgeModal();

  const shouldShowBadgeModal =
    isAuthenticated &&
    FEATURE_FLAGS_MAP.BADGES_FLAG &&
    !isPathExcluded(pathname, [ROUTES.SIMULATION, ROUTES.CALLS]);

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
      )?.id ?? TabId.CALLS,
    [pathname],
  );
  const handleTabChange = (path: string) => {
    navigate(path);
  };
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen w-full overflow-y-hidden">
      {showNavbar && (
        <NavSideBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={toggleSidebar}
        />
      )}
      <div className={"flex-1 min-h-screen overflow-auto bg-white custom-scrollbar"}>
        <div className={`${showNavbar && "h-[100vh]"}`}>
          <button onClick={toggleSidebar} className="md:hidden p-4 fixed top-0 right-0 z-30">
            <MenuIcon />
          </button>
          {children}
          <UploadProgressDialog />
          {shouldShowBadgeModal && BadgeModal}
        </div>
      </div>
    </div>
  );
};

export default NavbarWrapper;
