import React from "react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Permissions, ROUTES } from "@constants";
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
  CreateCase,
  ScenarioVoices,
  ScenarioLanguages,
  GuardrailsManagement,
  PromptManagement,
  UserBadges,
} from "@pages";

import { PrivateLayout } from "./PrivateLayout";
import { PublicRoute } from "./PublicRoute";

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
            <PrivateLayout requiredPermissions={[Permissions.EDIT_USER]}>
              <UserManagement />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.ORGANIZATION_DETAIL(":id")}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_USER]}>
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
            <PrivateLayout requiredPermissions={[Permissions.VIEW_ADMIN_BADGE]}>
              <UserBadges />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.CHARACTER_LIBRARY}
          element={
            <PrivateLayout requiredPermissions={[Permissions.EDIT_CHARACTER_LIBRARY]}>
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
            <PrivateLayout requiredPermissions={[Permissions.EDIT_SCENARIO]}>
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
            <PrivateLayout requiredPermissions={[Permissions.EDIT_SCENARIO]}>
              <GuardrailsManagement />
            </PrivateLayout>
          }
        />
        <Route path="/" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />

        <Route path="*" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
