import React, { lazy, Suspense } from "react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import {
  Permissions,
  ROLEPLAY_STUDIO_ALLOWED_EMAILS,
  ROUTES,
  SUPER_ADMIN_ROLES,
  SUPER_DUPER_ADMIN_ROLES,
} from "@constants";
import {
  CreateSimulation,
  Login,
  MagicLinkVerify,
  LiveSimulationPreview,
  SimulationStudio,
  UserManagement,
  OrganizationDetail,
  EventManagement,
  CharacterLibrary,
  CreatePath,
  CreateTrack,
  CreateCase,
  ScenarioVoices,
  ScenarioLanguages,
  GuardrailsManagement,
  PromptManagement,
  UserBadges,
  TranslationManagement,
  TooltipManagement,
  BlogManagement,
  Settings,
  AgentTestCases,
  Competencies,
  RoleplaySessionLogs,
  RoleplaySessionLogDetail,
  RoleplayLivePreview,
  RoleplayStudioList,
  RoleplayStudioWorkspace,
  Terms,
  Privacy,
} from "@pages";

import { DefaultRedirect } from "./DefaultRedirect";
import { PrivateLayout } from "./PrivateLayout";
import { PublicRoute } from "./PublicRoute";

// Lazy-loaded so IBM Carbon + Carbon Charts (+ d3) and the scoped Carbon
// stylesheet ship as their own chunk, loaded only when the Analytics tab opens.
const Analytics = lazy(() =>
  import("../pages/Analytics/Analytics").then(module => ({ default: module.Analytics })),
);

export const RouteLayout: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.MAGIC_VERIFY}
          element={
            <PublicRoute>
              <MagicLinkVerify />
            </PublicRoute>
          }
        />

        {/* Legal pages — fully public, accessible whether or not signed in */}
        <Route path={ROUTES.TERMS} element={<Terms />} />
        <Route path={ROUTES.PRIVACY} element={<Privacy />} />

        {/* Private Routes */}
        <Route
          path={ROUTES.SIMULATION_STUDIO}
          element={
            <PrivateLayout requiredPermissions={[Permissions.VIEW_ADMIN_SCENARIO]}>
              <SimulationStudio />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.USER_MANAGEMENT}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_USER, Permissions.VIEW_USERS]}>
              <UserManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ORGANIZATION_DETAIL(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_USER, Permissions.VIEW_USERS]}>
              <OrganizationDetail />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CREATE_SIMULATION}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_SCENARIO]}>
              <CreateSimulation />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.SIMULATION_PREVIEW(":id")}
          element={
            <PrivateLayout isPreview={true} requiredPermissions={[Permissions.VIEW_ADMIN_SCENARIO]}>
              <LiveSimulationPreview />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.EDIT_SIMULATION(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_SCENARIO]}>
              <CreateSimulation />
            </PrivateLayout>
          }
        />
        {/* Read-only View Details: same editor surface, but nothing is ever
            saved, so a published simulation stays published. View permission
            only — no edit:scenario required. */}
        <Route
          path={ROUTES.VIEW_SIMULATION(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.VIEW_ADMIN_SCENARIO]}>
              <CreateSimulation viewMode />
            </PrivateLayout>
          }
        />

        <Route
          path={ROUTES.MANAGE_EVENTS}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <EventManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.USER_BADGES}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <UserBadges />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CHARACTER_LIBRARY}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <CharacterLibrary />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_SCENARIO_VOICES}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_SCENARIO]}>
              <ScenarioVoices />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_SCENARIO_LANGUAGES}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <ScenarioLanguages />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_PROMPTS}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_PROMPT]}>
              <PromptManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CREATE_PATH}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreatePath />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.EDIT_PATH(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreatePath />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CREATE_TRACK}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreateTrack />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.EDIT_TRACK(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreateTrack />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CREATE_CASE}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreateCase />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.EDIT_CASE(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_EVENT]}>
              <CreateCase />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_GUARDRAILS}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <GuardrailsManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_TRANSLATIONS}
          element={
            <PrivateLayout requiredPermissions={[Permissions.VIEW_I18N_TRANSLATIONS]}>
              <TranslationManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.MANAGE_TOOLTIPS}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <TooltipManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.BLOG}
          element={
            <PrivateLayout requiredPermissions={[Permissions.VIEW_BLOGS]}>
              <BlogManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <PrivateLayout requiredRole={SUPER_ADMIN_ROLES}>
              <Suspense fallback={null}>
                <Analytics />
              </Suspense>
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <Settings />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.AGENT_TEST_CASES}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <AgentTestCases />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.COMPETENCIES}
          element={
            <PrivateLayout requiredRole={SUPER_ADMIN_ROLES}>
              <Competencies />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_SESSION_LOGS}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <RoleplaySessionLogs />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_SESSION_LOG_DETAIL(":id")}
          element={
            <PrivateLayout requiredRole={SUPER_DUPER_ADMIN_ROLES}>
              <RoleplaySessionLogDetail />
            </PrivateLayout>
          }
        />
        {/* Roleplay Studio v2 — permission + email-allowlist gated rollout */}
        <Route
          path={ROUTES.ROLEPLAY_STUDIO}
          element={
            <PrivateLayout
              requiredPermissions={[Permissions.VIEW_ROLEPLAY_SPECS]}
              allowedEmails={ROLEPLAY_STUDIO_ALLOWED_EMAILS}
            >
              <RoleplayStudioList />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_STUDIO_NEW}
          element={
            <PrivateLayout
              requiredPermissions={[Permissions.EDIT_ROLEPLAY_SPEC]}
              allowedEmails={ROLEPLAY_STUDIO_ALLOWED_EMAILS}
            >
              <RoleplayStudioWorkspace />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_STUDIO_PREVIEW(":id")}
          element={
            <PrivateLayout
              isPreview={true}
              requiredPermissions={[Permissions.VIEW_ROLEPLAY_SPECS]}
              allowedEmails={ROLEPLAY_STUDIO_ALLOWED_EMAILS}
            >
              <RoleplayLivePreview />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ROLEPLAY_STUDIO_SPEC(":specId")}
          element={
            <PrivateLayout
              requiredPermissions={[
                Permissions.VIEW_ROLEPLAY_SPECS,
                Permissions.EDIT_ROLEPLAY_SPEC,
              ]}
              allowedEmails={ROLEPLAY_STUDIO_ALLOWED_EMAILS}
            >
              <RoleplayStudioWorkspace />
            </PrivateLayout>
          }
        />

        <Route path="/" element={<DefaultRedirect />} />

        <Route path="*" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
