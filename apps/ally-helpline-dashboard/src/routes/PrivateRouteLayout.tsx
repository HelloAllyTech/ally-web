import { useState, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { CallLogs, LiveCall, Dashboard, Calls } from "@/pages";
import { NavSideBar, LifelineHeader } from "@/components";
import { useUser } from "@/hooks";
import { TabId, TabLabel } from "@/constants/tabs";
import { ROUTES } from "@/constants/routes";
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

  const getActiveTab = () => {
    switch (pathname) {
      case ROUTES.LIVE_CALL:
        return TabId.LIVE_CALL;
      case ROUTES.CALL_LOGS:
        return TabId.CALL_LOGS;
      case ROUTES.DASHBOARD:
        return TabId.HOME;
      case ROUTES.HOME:
        return TabId.HOME;
      case ROUTES.CALLS:
        return TabId.CALLS;
      case ROUTES.CALENDER:
        return TabId.CALENDER;
      case ROUTES.LEARN:
        return TabId.LEARN;
      case ROUTES.ANALYTICS:
        return TabId.ANALYTICS;
      case ROUTES.STRESS_BUSTERS:
        return TabId.STRESS_BUSTERS;
      case ROUTES.SETTINGS:
        return TabId.SETTINGS;
      default:
        return TabId.CALLS;
    }
  };

  const handleTabChange = (tab: string) => {
    navigate(tab);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const getTabTitle = (tabId: TabId) => {
    if (tabId === TabId.HOME) {
      return isClient ? TabLabel[TabId.HOME] : TabLabel[TabId.DASHBOARD];
    }
    return TabLabel[tabId];
  };

  const excludeDefaultPageHeader = [ROUTES.LIVE_CALL] as string[];
  if (user)
    return (
      <div className="flex h-screen w-full ">
        {!isClient && (
          <NavSideBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        <div className="flex-1 min-h-screen overflow-auto bg-[#F9FAFB] custom-scrollbar">
          {!excludeDefaultPageHeader.includes(pathname) && !isClient && (
            <LifelineHeader />
          )}
          <Routes>
            <Route
              index
              element={
                isClient ? (
                  <Navigate to={ROUTES.CALLS} />
                ) : (
                  <Navigate to={ROUTES.DASHBOARD} />
                )
              }
            />
            <Route
              path={ROUTES.LIVE_CALL}
              element={<LiveCall handleLogout={handleLogout} />}
            />
            <Route path={ROUTES.AUDIO_CALL} element={<AudioCall />} />
            {!isClient && (
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            )}
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
