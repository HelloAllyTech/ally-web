import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ROUTES } from "@constants";

import { RouteLayout } from "../RouteLayout";

// Pass-through wrappers for layouts
vi.mock("../PrivateLayout", () => ({
  PrivateLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../PublicRoute", () => ({
  PublicRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Stub DefaultRedirect (it depends on RTK Query/store); its own behavior is
// covered by DefaultRedirect.test.tsx.
vi.mock("../DefaultRedirect", () => ({
  DefaultRedirect: () => <div>DefaultRedirectPage</div>,
}));

// Stub out pages referenced by the router
vi.mock("@pages", () => ({
  CreateSimulation: () => <div>CreateSimulationPage</div>,
  LanguageGlossary: () => <div>LanguageGlossaryPage</div>,
  CreatePath: () => <div>CreatePathPage</div>,
  CreateTrack: () => <div>CreateTrackPage</div>,
  CreateCase: () => <div>CreateCasePage</div>,
  BlogManagement: () => <div>BlogManagementPage</div>,
  Login: () => <div>LoginPage</div>,
  MagicLinkVerify: () => <div>MagicLinkVerifyPage</div>,
  LiveSimulationPreview: () => <div>LiveSimulationPreviewPage</div>,
  SimulationStudio: () => <div>RolePlaysPage</div>,
  UserManagement: () => <div>UserManagementPage</div>,
  OrganizationDetail: () => <div>OrganizationDetailPage</div>,
  EventManagement: () => <div>EventManagementPage</div>,
  CharacterLibrary: () => <div>CharacterLibraryPage</div>,
  CharacterInterview: () => <div>CharacterInterviewPage</div>,
  ScenarioVoices: () => <div>ScenarioVoicesPage</div>,
  SttConfigs: () => <div>SttConfigsPage</div>,
  LlmConfigs: () => <div>LlmConfigsPage</div>,
  LlmModelCatalog: () => <div>LlmModelCatalogPage</div>,
  ScenarioLanguages: () => <div>ScenarioLanguagesPage</div>,
  PromptManagement: () => <div>PromptManagementPage</div>,
  UserBadges: () => <div>UserBadgesPage</div>,
  GuardrailsManagement: () => <div>GuardrailsManagementPage</div>,
  TranslationManagement: () => <div>TranslationManagementPage</div>,
  TooltipManagement: () => <div>TooltipManagementPage</div>,
  AgentTestCases: () => <div>AgentTestCasesPage</div>,
  Competencies: () => <div>CompetenciesPage</div>,
  RoleplaySessionLogs: () => <div>RoleplaySessionLogsPage</div>,
  RoleplaySessionLogDetail: () => <div>RoleplaySessionLogDetailPage</div>,
  Settings: () => <div>SettingsPage</div>,
  Logs: () => <div>LogsPage</div>,
  MobileReleases: () => <div>MobileReleasesPage</div>,
  WhatsAppBot: () => <div>WhatsAppBotPage</div>,
  Terms: () => <div>TermsPage</div>,
  Privacy: () => <div>PrivacyPage</div>,
  AILab: () => <div>AILabPage</div>,
  ProductRoadmap: () => <div>ProductRoadmapPage</div>,
  EvaluateLogin: () => <div>EvaluateLoginPage</div>,
  EvaluateRecords: () => <div>EvaluateRecordsPage</div>,
  EvaluateRecordDetail: () => <div>EvaluateRecordDetailPage</div>,
  BugHunter: () => <div>BugHunterPage</div>,
  Builder: () => <div>BuilderPage</div>,
  BuilderSession: () => <div>BuilderSessionPage</div>,
  BuilderSettings: () => <div>BuilderSettingsPage</div>,
  BuilderScoreboard: () => <div>BuilderScoreboardPage</div>,
  BuilderKnowledge: () => <div>BuilderKnowledgePage</div>,
}));

describe("RouteLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Login route", () => {
    window.history.pushState({}, "", ROUTES.LOGIN);
    render(<RouteLayout />);
    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  it("renders MagicLinkVerify route", () => {
    window.history.pushState({}, "", ROUTES.MAGIC_VERIFY);
    render(<RouteLayout />);
    expect(screen.getByText("MagicLinkVerifyPage")).toBeInTheDocument();
  });

  it("renders Simulation Studio route", () => {
    window.history.pushState({}, "", ROUTES.SIMULATION_STUDIO);
    render(<RouteLayout />);
    expect(screen.getByText("RolePlaysPage")).toBeInTheDocument();
  });

  it("renders Builder route", () => {
    window.history.pushState({}, "", ROUTES.BUILDER);
    render(<RouteLayout />);
    expect(screen.getByText("BuilderPage")).toBeInTheDocument();
  });

  // The session route is a separate assertion from the list route because the
  // two differ only by a path param — a mistyped param pattern would leave the
  // list route passing while every session link 404s.
  it("renders Builder session route with id", () => {
    window.history.pushState({}, "", ROUTES.BUILDER_SESSION("abc-123"));
    render(<RouteLayout />);
    expect(screen.getByText("BuilderSessionPage")).toBeInTheDocument();
  });

  it("renders Builder settings route", () => {
    window.history.pushState({}, "", ROUTES.BUILDER_SETTINGS);
    render(<RouteLayout />);
    expect(screen.getByText("BuilderSettingsPage")).toBeInTheDocument();
  });

  it("renders Builder scoreboard route", () => {
    window.history.pushState({}, "", ROUTES.BUILDER_SCOREBOARD);
    render(<RouteLayout />);
    expect(screen.getByText("BuilderScoreboardPage")).toBeInTheDocument();
  });

  it("renders Builder knowledge route", () => {
    window.history.pushState({}, "", ROUTES.BUILDER_KNOWLEDGE);
    render(<RouteLayout />);
    expect(screen.getByText("BuilderKnowledgePage")).toBeInTheDocument();
  });

  it("renders User Management route", () => {
    window.history.pushState({}, "", ROUTES.USER_MANAGEMENT);
    render(<RouteLayout />);
    expect(screen.getByText("UserManagementPage")).toBeInTheDocument();
  });

  it("renders Organization Detail route with id", () => {
    const path = ROUTES.ORGANIZATION_DETAIL("123");
    window.history.pushState({}, "", path);
    render(<RouteLayout />);
    expect(screen.getByText("OrganizationDetailPage")).toBeInTheDocument();
  });

  it("renders Create Simulation route", () => {
    window.history.pushState({}, "", ROUTES.CREATE_SIMULATION);
    render(<RouteLayout />);
    expect(screen.getByText("CreateSimulationPage")).toBeInTheDocument();
  });

  it("renders Simulation Preview route with id", () => {
    const path = ROUTES.SIMULATION_PREVIEW("123");
    window.history.pushState({}, "", path);
    render(<RouteLayout />);
    expect(screen.getByText("LiveSimulationPreviewPage")).toBeInTheDocument();
  });

  it("renders Edit Simulation route with id", () => {
    const path = ROUTES.EDIT_SIMULATION("999");
    window.history.pushState({}, "", path);
    render(<RouteLayout />);
    expect(screen.getByText("CreateSimulationPage")).toBeInTheDocument();
  });

  it("renders Event Management route", () => {
    window.history.pushState({}, "", ROUTES.MANAGE_EVENTS);
    render(<RouteLayout />);
    expect(screen.getByText("EventManagementPage")).toBeInTheDocument();
  });

  it("renders Scenario Voices route", () => {
    window.history.pushState({}, "", ROUTES.MANAGE_SCENARIO_VOICES);
    render(<RouteLayout />);
    expect(screen.getByText("ScenarioVoicesPage")).toBeInTheDocument();
  });

  it("renders Manage Prompts route", () => {
    window.history.pushState({}, "", ROUTES.MANAGE_PROMPTS);
    render(<RouteLayout />);
    expect(screen.getByText("PromptManagementPage")).toBeInTheDocument();
  });

  it("renders DefaultRedirect at the root route", () => {
    window.history.pushState({}, "", "/");
    render(<RouteLayout />);
    expect(screen.getByText("DefaultRedirectPage")).toBeInTheDocument();
  });

  it("redirects unknown route to Simulation Studio", () => {
    window.history.pushState({}, "", "/unknown-path");
    render(<RouteLayout />);
    expect(screen.getByText("RolePlaysPage")).toBeInTheDocument();
  });
});
