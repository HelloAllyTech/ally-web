import React from "react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Permissions, ROUTES } from "@constants";
import {
  CreateSimulation,
  Login,
  LiveSimulationPreview,
  SimulationStudio,
  UserManagement,
  EventManagement,
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

        <Route path="/" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />

        <Route path="*" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
