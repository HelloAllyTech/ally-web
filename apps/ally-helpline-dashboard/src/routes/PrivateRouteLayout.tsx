import { FC, useEffect } from "react";

import { Route, Routes, Navigate, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { useGetChatTypesQuery } from "@api";
import {
  LOCAL_STORAGE_KEYS,
  AUTH_RETRY_CONFIG,
  Permissions,
  ROUTES,
  CALL_PERMISSIONS,
} from "@constants";
import { useUser, useAutoActiveCallRedirect } from "@hooks";
import {
  Calls,
  Analytics,
  AudioCall,
  PostCallSummary,
  Search,
  StressBuster,
  Simulation,
  PostSimulationSummary,
  Leaderboard,
  Review,
  AchievementsViewAll,
} from "@pages";
import { ReviewDetails } from "@pages/review-details/ReviewDetails";
import { setAvailableChatTypes, unauthenticate } from "@reducer";
import { store } from "@store";
import {
  hasAnalyticsPermission,
  hasCallPermission,
  hasLearnPermission,
  hasPermissions,
  hasSessionLogsPermission,
} from "@utils";

import { NavbarWrapper, PermissionGuardedRoute } from "./components";

const PrivateRouteLayout: FC = () => {
  const { user, checkAuth, permissions, isAuthenticated } = useUser();
  const navigate = useNavigate();
  useAutoActiveCallRedirect(isAuthenticated);

  const hasChatTypePermissions = hasPermissions(permissions, Permissions.VIEW_CHAT_TYPES);
  const { data: chatTypes } = useGetChatTypesQuery(undefined, {
    skip: !hasChatTypePermissions,
  });

  useEffect(() => {
    store.dispatch(setAvailableChatTypes(chatTypes || []));
  }, [chatTypes]);

  useEffect(() => {
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

  const getLandingPageByRole = () => {
    if (hasLearnPermission(permissions)) return ROUTES.LEARN;
    if (hasCallPermission(permissions) || hasSessionLogsPermission(permissions))
      return ROUTES.CALLS;
    if (hasAnalyticsPermission(permissions)) return ROUTES.ANALYTICS;
    return ROUTES.HOME;
  };

  if (!user) return <></>;
  return (
    <NavbarWrapper>
      <Routes>
        <Route index element={<Navigate to={getLandingPageByRole()} />} />
        <Route
          path={ROUTES.AUDIO_CALL}
          element={<PermissionGuardedRoute permission={CALL_PERMISSIONS} element={<AudioCall />} />}
        />
        <Route
          path={ROUTES.CALLS}
          element={
            <PermissionGuardedRoute
              permission={[
                Permissions.VIEW_CALL_LOGS,
                Permissions.VIEW_CONSOLIDATED_LOGS,
                Permissions.VIEW_SCENARIO_SESSION,
                Permissions.VIEW_ADMIN_SCENARIO_SESSION,
              ]}
              element={<Calls />}
            />
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_ANALYTICS_DASHBOARD]}
              element={<Analytics />}
            />
          }
        />
        <Route
          path={ROUTES.STRESS_BUSTER}
          element={
            <PermissionGuardedRoute permission={CALL_PERMISSIONS} element={<StressBuster />} />
          }
        />

        <Route
          path={ROUTES.REVIEW}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.REVIEWER_ACCESS]}
              element={<Review />}
            />
          }
        />
        <Route
          path={ROUTES.REVIEW_DETAILS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_REVIEW]}
              element={<ReviewDetails />}
            />
          }
        />
        <Route
          path={ROUTES.SUMMARY}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_CHAT_DETAILS]}
              element={<PostCallSummary />}
            />
          }
        />
        <Route
          path={ROUTES.SEARCH}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_REFERNCE_DOCUMENT]}
              element={<Search />}
            />
          }
        />
        <Route
          path={ROUTES.SIMULATION}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.EDIT_SCENARIO_SESSION]}
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
        <Route
          path={ROUTES.LEADERBOARD}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_LEADERBOARD]}
              element={<Leaderboard />}
            />
          }
        />
        {/* TODO: Add permission for review */}
        <Route
          path={ROUTES.REVIEW}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.REVIEWER_ACCESS]}
              element={<Review />}
            />
          }
        />
        <Route
          path={ROUTES.ACHIEVEMENTS_VIEW_ALL}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_BADGES]}
              element={<AchievementsViewAll />}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavbarWrapper>
  );
};

export default PrivateRouteLayout;
