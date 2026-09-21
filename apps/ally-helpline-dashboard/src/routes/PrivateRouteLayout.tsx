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
import { useUser, useAutoActiveCallRedirect, useCanViewAnalytics } from "@hooks";
import {
  Calls,
  Archives,
  Analytics,
  AudioCall,
  CompleteProfile,
  PostCallSummary,
  Search,
  StressBuster,
  Simulation,
  PostSimulationSummary,
  Leaderboard,
  Review,
  AchievementsViewAll,
  Progress,
  OrganizationSettings,
  CharacterLibrary,
  CharacterInterview,
} from "@pages";
import { ReviewDetails } from "@pages/review-details/ReviewDetails";
import { setAvailableChatTypes, unauthenticate } from "@reducer";
import { store } from "@store";
import { SessionType } from "@types";
import {
  hasCallPermission,
  hasLearnPermission,
  hasPermissions,
  hasScribeLogsPermission,
  hasRoleplayLogsPermission,
  hasReviewPermission,
} from "@utils";

import { NavbarWrapper, PermissionGuardedRoute } from "./components";

const PrivateRouteLayout: FC = () => {
  const { user, checkAuth, permissions, isAuthenticated } = useUser();
  const navigate = useNavigate();
  useAutoActiveCallRedirect(isAuthenticated);

  // Same gate the Statistics nav tab uses: holding the permission isn't enough,
  // the tenant has to have something to show — otherwise this would land an
  // analytics-only user on a page that is empty and has no tab to leave by.
  const { canView: canViewAnalytics } = useCanViewAnalytics();

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
    if (hasCallPermission(permissions) || hasScribeLogsPermission(permissions))
      return ROUTES.SCRIBE_LOGS;
    if (hasRoleplayLogsPermission(permissions)) return ROUTES.ROLEPLAY_LOGS;
    if (canViewAnalytics) return ROUTES.ANALYTICS;
    if (hasReviewPermission(permissions)) return ROUTES.REVIEW;
    // Fallback: ROUTES.HOME ("/") has no page of its own and only redirects to
    // itself (blank screen). Send unmatched users to Learn, which always
    // renders and defaults to the Simulations tab.
    return ROUTES.LEARN;
  };

  if (!user) return <></>;
  // Bulk-created accounts must finish their profile before entering the app.
  if (user.profileCompleted === false) return <CompleteProfile />;
  return (
    <NavbarWrapper>
      <Routes>
        <Route index element={<Navigate to={getLandingPageByRole()} />} />
        <Route
          path={ROUTES.AUDIO_CALL}
          element={<PermissionGuardedRoute permission={CALL_PERMISSIONS} element={<AudioCall />} />}
        />
        <Route
          path={ROUTES.SCRIBE_LOGS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_CALL_LOGS, Permissions.VIEW_CONSOLIDATED_LOGS]}
              element={<Calls sessionType={SessionType.CALL} />}
            />
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_LOGS}
          element={
            <PermissionGuardedRoute
              permission={[
                Permissions.VIEW_SCENARIO_SESSION,
                Permissions.VIEW_ADMIN_SCENARIO_SESSION,
              ]}
              element={<Calls sessionType={SessionType.SIMULATION} />}
            />
          }
        />
        {/* Legacy /calls links now resolve to the Scribe Logs tab */}
        <Route path="/calls" element={<Navigate to={ROUTES.SCRIBE_LOGS} replace />} />
        <Route
          path={ROUTES.ARCHIVES}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_CALL_LOGS, Permissions.VIEW_CONSOLIDATED_LOGS]}
              element={<Archives />}
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
              permission={[Permissions.VIEW_SIMULATION_REVIEWS, Permissions.VIEW_SCRIBE_REVIEWS]}
              element={<Review />}
            />
          }
        />
        <Route
          path={ROUTES.SIMULATION_REVIEW_DETAILS}
          element={
            <PermissionGuardedRoute
              permission={[
                Permissions.VIEW_SIMULATION_REVIEWS,
                Permissions.VIEW_SCRIBE_REVIEWS,
                Permissions.VIEW_SIMULATION_REVIEW,
              ]}
              element={<ReviewDetails />}
            />
          }
        />
        <Route
          path={ROUTES.SCRIBE_REVIEW_DETAILS}
          element={
            <PermissionGuardedRoute
              permission={[
                Permissions.VIEW_SCRIBE_REVIEWS,
                Permissions.VIEW_SIMULATION_REVIEWS,
                Permissions.VIEW_SCRIBE_REVIEW,
              ]}
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
          path={ROUTES.COMMUNITY_LEADERBOARD}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_LEADERBOARD]}
              element={<Leaderboard />}
            />
          }
        />
        <Route
          path={ROUTES.REVIEW}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_SIMULATION_REVIEWS, Permissions.VIEW_SCRIBE_REVIEWS]}
              element={<Review />}
            />
          }
        />
        {/* Gated on VIEW_USER_RANK, which every learner holds; the real gate is the
            tenant's PROGRESS_DASHBOARD_ENABLED org toggle, enforced by the API and
            checked again in the page so a direct URL cannot bypass the nav. */}
        <Route
          path={ROUTES.PROGRESS}
          element={
            <PermissionGuardedRoute
              permission={[Permissions.VIEW_USER_RANK]}
              element={<Progress />}
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
        {/* Access is enforced inside the page (ADMIN role + temporary allowlist). */}
        <Route path={ROUTES.ORGANIZATION_SETTINGS} element={<OrganizationSettings />} />
        {/* Access is enforced inside the page: view:scenario-character permission
            AND the tenant's CHARACTER_LIBRARY_ENABLED org toggle (see
            useCanViewCharacterLibrary) — not a plain permission array. */}
        <Route path={ROUTES.CHARACTER_LIBRARY} element={<CharacterLibrary />} />
        <Route path={ROUTES.CHARACTER_LIBRARY_INTERVIEW} element={<CharacterInterview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavbarWrapper>
  );
};

export default PrivateRouteLayout;
