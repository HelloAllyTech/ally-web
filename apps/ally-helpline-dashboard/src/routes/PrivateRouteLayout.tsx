import { useState, useEffect } from "react";

import { useSelector } from "react-redux";
import { Route, Routes, Navigate, matchPath, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useAcceptCallMutation, useGetWaitingClientsQuery, useGetChatTypesQuery } from "@api";
import { MenuIcon } from "@assets";
import { AudioCallPopup, CallPicker, NavSideBar } from "@components";
import {
  TabId,
  CallType,
  LOCAL_STORAGE_KEYS,
  AUTH_RETRY_CONFIG,
  Permissions,
  ROUTES,
  navBarOptions,
} from "@constants";
import { useUser } from "@hooks";
import {
  Calls,
  Calendar,
  Settings,
  Analytics,
  AudioCall,
  StressBusters,
  PostCallSummary,
  ClientInterface,
  Search,
  Learn,
  Scenario,
  SimulationSummary,
} from "@pages";
import { setUserStatus, setAvailableChatTypes, unauthenticate } from "@reducer";
import { RootState, store } from "@store";
import { UserRole, UserStatus, WaitingClient } from "@types";

import PermissionGuardedRoute from "./PermissionGuardedRoute";

// TODO: Remove all un used pages
// TODO: Restrict client access to pages

const PrivateRouteLayout = () => {
  const { user, checkAuth, updateUserStatus } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isClient = user?.role === UserRole.CLIENT;
  const isAdmin = user?.role === UserRole.ADMIN;
  const [activeTab, setActiveTab] = useState<TabId>(TabId.CALLS);
  const [showAlertCall, setShowAlertCall] = useState<boolean>(true);
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const excludeNavBar = [ROUTES.AUDIO_CALL, ROUTES.SUMMARY] as string[];
  const excludeCallPicker = [ROUTES.AUDIO_CALL, ROUTES.SUMMARY] as string[];
  const isAvailable = userStatus === UserStatus.AVAILABLE;

  const { data: chatTypes } = useGetChatTypesQuery();
  const { data: getWaitingClientsData, isSuccess: isWaitingClientsSuccess } =
    useGetWaitingClientsQuery(undefined, {
      skip:
        user?.role !== UserRole.COUNSELLOR ||
        !isAvailable ||
        !chatTypes?.includes(CallType.WEBRTC_CHAT),
      pollingInterval: 5000,
    });
  const [acceptCall] = useAcceptCallMutation();

  useEffect(() => {
    store.dispatch(setAvailableChatTypes(chatTypes || []));
  }, [chatTypes]);

  useEffect(() => {
    const userStatusLocalStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_STATUS);
    if (userStatusLocalStorage) {
      store.dispatch(setUserStatus(userStatusLocalStorage as UserStatus));
    } else {
      updateUserStatus(UserStatus.AVAILABLE);
    }
    const verifyAuth = async () => {
      const attemptAuthentication = async (attempt: number): Promise<any> => {
        try {
          const data = await checkAuth();

          if (data) {
            return data;
          }

          // If this is not the last attempt, wait before retrying
          if (attempt < AUTH_RETRY_CONFIG.MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_CONFIG.RETRY_DELAY_MS));
            return attemptAuthentication(attempt + 1);
          }

          return null;
        } catch (error) {
          logger.info(`Authentication attempt ${attempt} failed: ${JSON.stringify(error)}`);

          // If this is not the last attempt, wait before retrying
          if (attempt < AUTH_RETRY_CONFIG.MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_CONFIG.RETRY_DELAY_MS));
            return attemptAuthentication(attempt + 1);
          }

          return null;
        }
      };

      const userData = await attemptAuthentication(1);
      if (!userData) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        store.dispatch(unauthenticate());
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
    navBarOptions.find(option => option.path === pathname)?.id ?? TabId.CALLS;

  const handleTabChange = (path: string) => {
    navigate(path);
  };

  const isPathExcluded = (currentPath: string, excludedPaths: string[]) => {
    return excludedPaths.some(path => matchPath(path, currentPath));
  };

  const onAcceptCall = async () => {
    try {
      await acceptCall({ chatId: waitingClients[0]?.chat?.chatId });
      updateUserStatus(UserStatus.OFFLINE);

      // Clearing waitingClients to prevent call pop-up after the call due to outdated waitingClients
      setWaitingClients([]);
      navigate(ROUTES.AUDIO_CALL);
    } catch (error) {
      toast.error(error?.response?.data?.detail ?? "Something went wrong. Please try again later!");
      logger.info(`Error accepting chat: ${error}`);
    }
  };

  const showNavbar = !isClient && !isPathExcluded(pathname, excludeNavBar);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  if (user)
    return (
      <div className="flex h-screen w-full ">
        {showNavbar && (
          <NavSideBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
          />
        )}
        <div className={"flex-1 min-h-screen overflow-auto bg-white custom-scrollbar"}>
          <div className={`${showNavbar && "md:ml-72 h-[100vh]"}`}>
            {!isClient && (
              <button onClick={toggleSidebar} className="md:hidden p-4 fixed top-0 right-0 z-30">
                <MenuIcon />
              </button>
            )}
            <Routes>
              <Route
                index
                element={
                  isClient ? (
                    <Navigate to={ROUTES.CLIENT} />
                  ) : isAdmin ? (
                    <Navigate to={ROUTES.ANALYTICS} />
                  ) : (
                    <Navigate to={ROUTES.CALLS} />
                  )
                }
              />
              <Route path={ROUTES.AUDIO_CALL} element={<AudioCall />} />
              <Route
                path={ROUTES.CLIENT}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_START_CALL_PAGE}
                    element={<ClientInterface />}
                  />
                }
              />
              <Route
                path={ROUTES.CALLS}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_NAVBAR_CALLS}
                    element={<Calls />}
                  />
                }
              />
              <Route
                path={ROUTES.CALENDER}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_NAVBAR_CALENDAR}
                    element={<Calendar />}
                  />
                }
              />
              <Route
                path={ROUTES.ANALYTICS}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_NAVBAR_ANALYTICS}
                    element={<Analytics />}
                  />
                }
              />
              <Route
                path={ROUTES.SETTINGS}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_NAVBAR_SETTINGS}
                    element={<Settings />}
                  />
                }
              />
              <Route
                path={ROUTES.STRESS_BUSTERS}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.VIEW_NAVBAR_STRESS_BUSTER}
                    element={<StressBusters />}
                  />
                }
              />
              <Route
                path={ROUTES.SUMMARY}
                element={
                  <PermissionGuardedRoute
                    permission={Permissions.EDIT_SUMMARY}
                    element={<PostCallSummary />}
                  />
                }
              />
              <Route
                path={ROUTES.SEARCH}
                element={
                  <PermissionGuardedRoute
                    // TODO: Add correct permission for Search once BE implementation is done
                    permission={Permissions.VIEW_START_CALL_PAGE}
                    element={<Search />}
                  />
                }
              />
              <Route
                path={ROUTES.LEARN}
                element={
                  <PermissionGuardedRoute
                    // TODO: Add correct permission for Learn once BE implementation is done
                    permission={Permissions.VIEW_NAVBAR_LEARN}
                    element={<Learn />}
                  />
                }
              />
              <Route path={ROUTES.SCENARIO} element={<Scenario />} />
              <Route
                path={ROUTES.SIMULATION_SUMMARY}
                element={
                  <PermissionGuardedRoute
                    // TODO: Add correct permission for Summary once BE implementation is done
                    permission={Permissions.VIEW_NAVBAR_LEARN}
                    element={<SimulationSummary />}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        {showAlertCall &&
          waitingClients.length > 0 &&
          isAvailable &&
          !isPathExcluded(pathname, excludeCallPicker) && (
            <CallPicker onAccept={onAcceptCall} onDecline={() => setShowAlertCall(false)} />
          )}
        <AudioCallPopup />
      </div>
    );
  else return <></>;
};

export default PrivateRouteLayout;
