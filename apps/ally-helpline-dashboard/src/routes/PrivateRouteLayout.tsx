import { useState, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
  matchPath,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  CallLogs,
  LiveCall,
  Calls,
  PostCallSummary,
  StressBusters,
  Learn,
  Calendar,
  Analytics,
} from "@/pages";
import { RootState, store } from "@/store/store";
import { CallPicker, NavSideBar, LifelineHeader } from "@/components";
import { useCounsellorChat, useUser, useWaitingClients } from "@/hooks";
import { TabId } from "@/constants/tabs";
import { navBarOptions, ROUTES } from "@/constants/routes";
import { UserRole } from "@/types/user";
import AudioCall from "@/pages/audio-call/AudioCall";
import { WaitingClient } from "@/hooks/useWaitingClients";
import { setIsOnline } from "@/reducer/userReducer";

// TODO: Remove all un used pages
// TODO: Restrict client access to pages

const PrivateRouteLayout = () => {
  const { user, logout, checkAuth } = useUser();
  const { getWaitingClients } = useWaitingClients();
  const { acceptChat } = useCounsellorChat();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isClient = user?.role === UserRole.CLIENT;
  const [activeTab, setActiveTab] = useState<TabId>(TabId.CALLS);
  const [alertCall, setAlertCall] = useState(true);
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);

  const { isOnline } = useSelector((state: RootState) => state.user);

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

  useEffect(() => {
    if (user?.role === UserRole.COUNSELOR && isOnline) {
      const fetchWaitingClients = async () => {
        try {
          const response = await getWaitingClients();
          setWaitingClients(response.clients);
        } catch (error) {
          console.error("Error fetching waiting clients:", error);
        }
      };
      fetchWaitingClients();
      // Poll for new clients every 5 seconds
      const interval = setInterval(fetchWaitingClients, 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline, user]);

  const getActiveTab = () =>
    navBarOptions.find((option) => option.path === pathname)?.id ?? TabId.CALLS;

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
  const excludeNavBar = [ROUTES.AUDIO_CALL, ROUTES.SUMMARY] as string[];

  const isPathExcluded = (currentPath: string) => {
    return excludeNavBar.some((path) => matchPath(path, currentPath));
  };

  const onAcceptCall = async () => {
    try {
      await acceptChat(waitingClients[0]?.chat?.chatId);
      store.dispatch(setIsOnline(false));
      navigate(ROUTES.AUDIO_CALL);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ??
          "Something went wrong. Please try again later!"
      );
      console.error("Error accepting chat:", error);
    }
  };

  const showNavbar = !isClient && !isPathExcluded(pathname);
  const showLifelineHeader = !excludeDefaultPageHeader.includes(pathname);

  if (user)
    return (
      <div className="flex h-screen w-full ">
        {showNavbar && (
          <NavSideBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        <div
          className={
            "flex-1 min-h-screen overflow-auto bg-[#F9FAFB] custom-scrollbar"
          }
        >
          {showLifelineHeader && <LifelineHeader />}
          <div className={`${showNavbar && "ml-72"}`}>
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
              <Route path={ROUTES.CALENDER} element={<Calendar />} />
              <Route path={ROUTES.LEARN} element={<Learn />} />
              <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
              <Route path={ROUTES.SETTINGS} element={<Calls />} />
              <Route path={ROUTES.SUMMARY} element={<PostCallSummary />} />
              <Route path={ROUTES.STRESS_BUSTERS} element={<StressBusters />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        {alertCall && waitingClients.length > 0 && isOnline && (
          <CallPicker
            onAccept={onAcceptCall}
            onDecline={() => setAlertCall(false)}
          />
        )}
      </div>
    );
  else return <></>;
};

export default PrivateRouteLayout;
