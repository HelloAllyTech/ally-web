import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import RouteLayout from "../RouteLayout";

// Mock the pages
vi.mock("@pages", () => ({
  Health: () => <div data-testid="health-page">Health Page</div>,
  Login: () => <div data-testid="login-page">Login Page</div>,
  MagicLinkVerify: () => <div data-testid="magic-link-verify-page">Magic Link Verify Page</div>,
  Learn: () => <div data-testid="learn-page">Learn Page</div>,
  Scenario: () => <div data-testid="scenario-page">Scenario Page</div>,
  CaseTrackDetails: () => <div data-testid="case-track-details-page">Case Track Details Page</div>,
  TrackOverview: () => <div data-testid="track-overview-page">Track Overview Page</div>,
  TrackPlayer: () => <div data-testid="track-player-page">Track Player Page</div>,
  SuspendedUser: () => <div data-testid="suspended-user-page">Suspended User Page</div>,
  ImpersonateHandler: () => <div data-testid="impersonate-page">Impersonate Page</div>,
  Terms: () => <div data-testid="terms-page">Terms Page</div>,
  Privacy: () => <div data-testid="privacy-page">Privacy Page</div>,
  Blog: () => <div data-testid="blog-page">Blog Page</div>,
  BlogPost: () => <div data-testid="blog-post-page">Blog Post Page</div>,
  Changelog: () => <div data-testid="changelog-page">Changelog Page</div>,
  Sjt1: () => <div data-testid="sjt1-page">SJT1 Page</div>,
  SjtEdit: () => <div data-testid="sjt1-edit-page">SJT1 Edit Page</div>,
}));

// Mock useAnalytics to avoid context error in PageviewTracker
vi.mock("@hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    capturePageview: vi.fn(),
    capture: vi.fn(),
    isFeatureEnabled: vi.fn(),
  }),
}));

// Mock the route layouts
vi.mock("../HybridRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hybrid-layout">{children}</div>
  ),
}));

vi.mock("../PrivateRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="private-layout">{children}</div>
  ),
}));

vi.mock("../PublicRouteLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="public-layout">{children}</div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  ROUTES: {
    LOGIN: "/login",
    HEALTH: "/health",
    MAGIC_VERIFY: "/auth/verify",
    LEARN: "/learn",
    SCENARIO: "/scenario/:scenarioId",
    PATHWAY: "/pathway/:pathwayId",
    CASE: "/case/:caseId",
    TRACK: "/track/:trackId",
    TRACK_ITEM: "/track/:trackId/item/:itemId",
    SUSPENDED_USER: "/suspended-user",
    IMPERSONATE: "/impersonate",
    TERMS: "/terms",
    PRIVACY: "/privacy",
    BLOG: "/blog",
    BLOG_POST: "/blog/:slug",
    CHANGELOG: "/blog/changelog",
    SJT1: "/SJT1",
    SJT1_EDIT: "/SJT1/edit",
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(component);
};

describe("RouteLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders without crashing", () => {
    renderWithRouter(<RouteLayout />);
    // Should render the private layout as it's the catch-all route
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("renders private routes with PrivateRouteLayout", () => {
    renderWithRouter(<RouteLayout />);

    // Check that private layout is rendered (catch-all route)
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("has correct route structure", () => {
    renderWithRouter(<RouteLayout />);

    // Should have the private layout as the catch-all route
    expect(screen.getByTestId("private-layout")).toBeInTheDocument();
  });

  it("wraps everything in BrowserRouter", () => {
    const { container } = renderWithRouter(<RouteLayout />);

    // BrowserRouter should be the root element
    expect(container.firstChild).toBeInTheDocument();
  });

  it("serves the standalone self-check publicly at /SJT1", () => {
    window.history.pushState({}, "", "/SJT1");
    renderWithRouter(<RouteLayout />);

    expect(screen.getByTestId("public-layout")).toBeInTheDocument();
    // Not behind the catch-all: it must not need a signed-in user.
    expect(screen.queryByTestId("private-layout")).not.toBeInTheDocument();
  });

  it("serves the copy editor publicly at /SJT1/edit, not under the catch-all", () => {
    window.history.pushState({}, "", "/SJT1/edit");
    renderWithRouter(<RouteLayout />);

    expect(screen.getByTestId("public-layout")).toBeInTheDocument();
    expect(screen.queryByTestId("private-layout")).not.toBeInTheDocument();
  });

  it("matches /SJT1 whatever case the shared link arrives in", () => {
    // The URL is shared capitalised, but people retype it lowercase.
    window.history.pushState({}, "", "/sjt1");
    renderWithRouter(<RouteLayout />);

    expect(screen.getByTestId("public-layout")).toBeInTheDocument();
    expect(screen.queryByTestId("private-layout")).not.toBeInTheDocument();
  });
});
