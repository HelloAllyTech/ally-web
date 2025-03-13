import { useState, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { CallLogs, LiveCall, Calls } from "@/pages";
import { NavSideBar, LifelineHeader } from "@/components";
import { useUser } from "@/hooks";
import { TabId} from "@/constants/tabs";
import { navBarOptions, ROUTES } from "@/constants/routes";
import { UserRole } from "@/types/user";
import AudioCall from "@/pages/audio-call/AudioCall";

const PrivateRouteLayout = () => {
  const { user, logout, checkAuth } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isClient = user?.role === UserRole.CLIENT;
  const [activeTab, setActiveTab] = useState<TabId>(TabId.CALLS);

  useEffect(() => {
    const verifyAuth = async () => {
      const userData = await checkAuth();
      if (!userData) {
        navigate(ROUTES.LOGIN);
      }
    };
    verifyAuth();
  }, []);

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [pathname]);

  const getActiveTab = () => navBarOptions.find((option) => option.path === pathname)?.id ?? TabId.CALLS;

  const handleTabChange = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const excludeDefaultPageHeader = [
    ROUTES.LIVE_CALL,
    ROUTES.AUDIO_CALL,
  ] as string[];
  const excludeNavBar = [ROUTES.AUDIO_CALL] as string[];

  if (user)
    return (
      <div className="flex h-screen w-full ">
        {!isClient && !excludeNavBar.includes(pathname) && (
          <NavSideBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        <div className="flex-1 min-h-screen overflow-auto bg-[#F9FAFB] custom-scrollbar">
          {!excludeDefaultPageHeader.includes(pathname) && <LifelineHeader />}
          <Routes>
            <Route
              index
              element={
                isClient ? (
                  <Navigate to={ROUTES.CALL_LOGS} />
                ) : (
                  <Navigate to={ROUTES.CALLS} />
                )
              }
            />
            <Route
              path={ROUTES.LIVE_CALL}
              element={<LiveCall handleLogout={handleLogout} />}
            />
            <Route path={ROUTES.AUDIO_CALL} element={<AudioCall />} />
            <Route path={ROUTES.CALL_LOGS} element={<CallLogs />} />
            <Route path={ROUTES.CALLS} element={<Calls />} />
            <Route path={ROUTES.CALENDER} element={<Calls />} />
            <Route path={ROUTES.LEARN} element={<Calls />} />
            <Route path={ROUTES.STRESS_BUSTERS} element={<Calls />} />
            <Route path={ROUTES.ANALYTICS} element={<AudioCall />} />
            <Route path={ROUTES.SETTINGS} element={<Calls />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    );
  else return <></>;
};

export default PrivateRouteLayout;
