import { FC, useEffect } from "react";

import { Route, Routes, Navigate, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { useGetChatTypesQuery } from "@api";
import { LOCAL_STORAGE_KEYS, AUTH_RETRY_CONFIG, Permissions, ROUTES } from "@constants";
import { useUser, useAutoActiveCallRedirect } from "@hooks";
import {
  Calls,
  Analytics,
  AudioCall,
  PostCallSummary,
  ClientInterface,
  Search,
  StressBuster,
  Simulation,
  PostSimulationSummary,
} from "@pages";
import { setUserStatus, setAvailableChatTypes, unauthenticate } from "@reducer";
import { store } from "@store";
import { UserRole, UserStatus } from "@types";

import { ClientCallPicker, NavbarWrapper, PermissionGuardedRoute } from "./components";

// TODO: Remove all un used pages
// TODO: Restrict client access to pages

const PrivateRouteLayout: FC = () => {
  const { user, checkAuth, updateUserStatus } = useUser();
  const navigate = useNavigate();
  useAutoActiveCallRedirect();

  const { data: chatTypes } = useGetChatTypesQuery();

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

  // TODO: Update it in a way that it uses permissions rather than role
  const getLandingPageByRole = () => {
    switch (user?.role) {
      case UserRole.CLIENT:
        return ROUTES.CLIENT;
      case UserRole.ADMIN:
        return ROUTES.ANALYTICS;
      case UserRole.LEARNER:
        return ROUTES.LEARN;
      case UserRole.COUNSELLOR:
        return ROUTES.CALLS;
      default:
        return ROUTES.LOGIN;
    }
  };

  if (!user) return <></>;
  return (
    <NavbarWrapper>
      <Routes>
        <Route index element={<Navigate to={getLandingPageByRole()} />} />
        <Route
          path={ROUTES.AUDIO_CALL}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_START_CALL_PAGE]}
              element={<AudioCall />}
            />
          }
        />
        <Route
          path={ROUTES.CLIENT}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_START_CALL_PAGE]}
              element={<ClientInterface />}
            />
          }
        />
        <Route
          path={ROUTES.CALLS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_NAVBAR_CALLS]}
              element={<Calls />}
            />
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_NAVBAR_ANALYTICS]}
              element={<Analytics />}
            />
          }
        />
        <Route
          path={ROUTES.STRESS_BUSTER}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_NAVBAR_STRESS_BUSTER]}
              element={<StressBuster />}
            />
          }
        />
        <Route
          path={ROUTES.SUMMARY}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.EDIT_SUMMARY]}
              element={<PostCallSummary />}
            />
          }
        />
        <Route
          path={ROUTES.SEARCH}
          element={
            <PermissionGuardedRoute
              // TODO: Add correct permission for Search once BE implementation is done
              permission={[Permissions.VIEW_START_CALL_PAGE]}
              element={<Search />}
            />
          }
        />
        <Route
          path={ROUTES.SIMULATION}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_NAVBAR_LEARN]}
              element={<Simulation />}
            />
          }
        />
        <Route
          path={ROUTES.SIMULATION_SUMMARY_FULL}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_SCENARIO_SESSION_SUMMARY]}
              element={<PostSimulationSummary />}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ClientCallPicker />
    </NavbarWrapper>
  );
};

export default PrivateRouteLayout;
