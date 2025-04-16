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
  LiveCall,
  Calls,
  PostCallSummary,
  StressBusters,
  Learn,
  Calendar,
  Analytics,
  Settings,
  ClientInterface,
} from "@/pages";
import { RootState, store } from "@/store/store";
import { CallPicker, NavSideBar, LifelineHeader } from "@/components";
import { useUser } from "@/hooks";
import { TabId } from "@/constants/tabs";
import { navBarOptions, ROUTES } from "@/constants/routes";
import { UserRole, UserStatus } from "@/types/user";
import { WaitingClient } from "@/types/message";
import AudioCall from "@/pages/audio-call/AudioCall";
import { setUserStatus } from "@/reducer/userReducer";
import { useAcceptCallMutation, useGetWaitingClientsQuery } from "@/api/audioCall";

// TODO: Remove all un used pages
// TODO: Restrict client access to pages

const PrivateRouteLayout = () => {
  const { user, logout, checkAuth } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isClient = user?.role === UserRole.CLIENT;
  const [activeTab, setActiveTab] = useState<TabId>(TabId.CALLS);
  const [alertCall, setAlertCall] = useState(true);
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const excludeDefaultPageHeader = [
    ROUTES.LIVE_CALL,
    ROUTES.AUDIO_CALL,
  ] as string[];
  const excludeNavBar = [ROUTES.AUDIO_CALL, ROUTES.SUMMARY] as string[];
  const excludeCallPicker = [ROUTES.LIVE_CALL, ROUTES.AUDIO_CALL, ROUTES.SUMMARY] as string[];
  const isAvailable = userStatus === UserStatus.AVAILABLE;

  const { data: getWaitingClientsData, isSuccess: isWaitingClientsSuccess } = useGetWaitingClientsQuery(undefined, {
    skip: user?.role !== UserRole.COUNSELOR || !isAvailable,
    pollingInterval: 5000,
  });
  const [acceptCall] = useAcceptCallMutation();

  useEffect(() => {
    const userStatusLocalStorage = localStorage.getItem("userStatus");
    if (userStatusLocalStorage) {
      store.dispatch(setUserStatus(userStatusLocalStorage as UserStatus));
    }
    const verifyAuth = async () => {
      const userData = await checkAuth();
      if (!userData) {
        navigate(ROUTES.LOGIN);
      }
    };
    verifyAuth();
  }, []);

  useEffect(() => {
    if (isWaitingClientsSuccess) {
      setWaitingClients(getWaitingClientsData?.clients || []);
    }
  }, [isWaitingClientsSuccess, getWaitingClientsData]);

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [pathname]);

  const getActiveTab = () =>
    navBarOptions.find((option) => option.path === pathname)?.id ?? TabId.CALLS;

  const handleTabChange = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const isPathExcluded = (currentPath: string, excludedPaths: string[]) => {
    return excludedPaths.some((path) => matchPath(path, currentPath));
  };

  const onAcceptCall = async () => {
    try {
      await acceptCall({ chatId: waitingClients[0]?.chat?.chatId });
      store.dispatch(setUserStatus(UserStatus.OFFLINE));
      localStorage.setItem("userStatus", UserStatus.OFFLINE);

      // Clearing waitingClients to prevent call pop-up after the call due to outdated waitingClients
      setWaitingClients([]);
      navigate(ROUTES.AUDIO_CALL);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ??
          "Something went wrong. Please try again later!"
      );
      console.error("Error accepting chat:", error);
    }
  };

  const showNavbar = !isClient && !isPathExcluded(pathname, excludeNavBar);
  const showLifelineHeader = !isPathExcluded(pathname, excludeDefaultPageHeader);

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
                    <Navigate to={ROUTES.CLIENT} />
                  ) : (
                    <Navigate to={ROUTES.CALLS} />
                  )
                }
              />
              <Route
                path={ROUTES.LIVE_CALL}
                element={<LiveCall handleLogout={handleLogout} />}
              />
              <Route path={ROUTES.CLIENT} element={<ClientInterface />} />
              <Route path={ROUTES.AUDIO_CALL} element={<AudioCall />} />
              <Route path={ROUTES.CALLS} element={<Calls />} />
              <Route path={ROUTES.CALENDER} element={<Calendar />} />
              <Route path={ROUTES.LEARN} element={<Learn />} />
              <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />
              <Route path={ROUTES.SUMMARY} element={<PostCallSummary />} />
              <Route path={ROUTES.STRESS_BUSTERS} element={<StressBusters />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        {alertCall && waitingClients.length > 0 && isAvailable && !isPathExcluded(pathname, excludeCallPicker) && (
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
