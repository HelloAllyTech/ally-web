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
import { useUser, useAutoActiveCallRedirect, useCanViewAnalytics, SessionCheck } from "@hooks";
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
  CharacterLibrary,
  CharacterInterview,
  HelplineLayout,
  HelplineLobby,
  HelplineChatView,
  HelplineHistory,
  HelplineMonitor,
  HelplineQa,
  HelplineQaDetail,
  HelplineTeam,
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
  const { user, verifySession, permissions, isAuthenticated } = useUser();
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
    let cancelled = false;

    // Retries until the server answers. Only a definite "signed out" ends the
    // session: a failed request during an API outage used to exhaust these
    // retries and wipe the tokens, logging counsellors out mid-note and losing
    // what they had typed.
    const verifyAuth = async (attempt: number): Promise<void> => {
      let result: SessionCheck;
      try {
        result = await verifySession();
      } catch (error) {
        logger.info(`Authentication attempt ${attempt} failed: ${JSON.stringify(error)}`);
        result = { status: "unavailable" };
      }
      if (cancelled || result.status === "ok") return;

      if (result.status === "signed-out") {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        store.dispatch(unauthenticate());
        navigate(ROUTES.LOGIN);
        return;
      }

      // Unavailable: keep the persisted session and try again, backing off.
      const delay =
        attempt < AUTH_RETRY_CONFIG.MAX_ATTEMPTS
          ? AUTH_RETRY_CONFIG.RETRY_DELAY_MS
          : AUTH_RETRY_CONFIG.UNAVAILABLE_RETRY_DELAY_MS;
      await new Promise(resolve => setTimeout(resolve, delay));
      if (!cancelled) await verifyAuth(attempt + 1);
    };
    verifyAuth(1);

    return () => {
      cancelled = true;
    };
  }, []);

  const getLandingPageByRole = () => {
    if (hasLearnPermission(permissions)) return ROUTES.LEARN;
    if (hasCallPermission(permissions) || hasScribeLogsPermission(permissions))
      return ROUTES.SCRIBE_LOGS;
    if (hasRoleplayLogsPermission(permissions)) return ROUTES.ROLEPLAY_LOGS;
    if (canViewAnalytics) return ROUTES.ANALYTICS;
    if (hasReviewPermission(permissions)) return ROUTES.REVIEW;
    // A LISTENER-only or HELPLINE_SUPERVISOR-only account has nothing else in
    // the app. Permission alone decides the landing; the workspace itself
    // shows a plain "not turned on" state when the org toggle is off.
    if (
      hasPermissions(permissions, Permissions.VIEW_HELPLINE_LOBBY) ||
      hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR)
    ) {
      return ROUTES.HELPLINE;
    }
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
        {/* Access is enforced inside the page: view:scenario-character permission
            AND the tenant's CHARACTER_LIBRARY_ENABLED org toggle (see
            useCanViewCharacterLibrary) — not a plain permission array. */}
        <Route path={ROUTES.CHARACTER_LIBRARY} element={<CharacterLibrary />} />
        <Route path={ROUTES.CHARACTER_LIBRARY_INTERVIEW} element={<CharacterInterview />} />
        {/* Text helpline workspace. Access is enforced in HelplineLayout: a
            helpline permission AND the tenant's TEXT_HELPLINE_ENABLED toggle
            (useCanUseTextHelpline), for every child route. One layout so the
            staff socket survives moving between lobby and chats. */}
        <Route path={ROUTES.HELPLINE} element={<HelplineLayout />}>
          <Route index element={<HelplineLobby />} />
          <Route path={ROUTES.HELPLINE_CHAT} element={<HelplineChatView />} />
          <Route path={ROUTES.HELPLINE_HISTORY} element={<HelplineHistory />} />
          {/* Each page also checks its own permission (monitor / team), so a
              typed URL shows a plain "not for your role" state. */}
          <Route path={ROUTES.HELPLINE_MONITOR} element={<HelplineMonitor />} />
          <Route path={ROUTES.HELPLINE_QA} element={<HelplineQa />} />
          <Route path={ROUTES.HELPLINE_QA_DETAIL} element={<HelplineQaDetail />} />
          <Route path={ROUTES.HELPLINE_TEAM} element={<HelplineTeam />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavbarWrapper>
  );
};

export default PrivateRouteLayout;
