import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Permissions } from "@constants";
import { UserRole } from "@types";

import PermissionGuardedRoute from "../components/PermissionGuardedRoute";

// Mock the useUser hook
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
}));

// Mock the AccessDenied page
vi.mock("@pages", () => ({
  AccessDenied: () => <div data-testid="access-denied">Access Denied</div>,
}));

// Mock constants
vi.mock("@constants", () => ({
  Permissions: {
    VIEW_CALL_LOGS: "view:navbar:calls",
    VIEW_ANALYTICS_DASHBOARD: "view:analytics:dashboard",
    EDIT_SCENARIO_SESSION: "edit:scenario-session",
  },
}));

// Mock types
vi.mock("@types", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    COUNSELLOR: "COUNSELOR",
    LEARNER: "LEARNER",
  },
}));

const TestElement = () => <div data-testid="test-element">Test Element</div>;

describe("PermissionGuardedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders element when user has required permissions", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: [Permissions.VIEW_CALL_LOGS, Permissions.VIEW_ANALYTICS_DASHBOARD],
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("test-element")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("renders AccessDenied when user lacks required permissions", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.LEARNER },
      permissions: [Permissions.VIEW_ANALYTICS_DASHBOARD],
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("test-element")).not.toBeInTheDocument();
  });

  it("renders element when user has any of the required permissions", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: [Permissions.VIEW_ANALYTICS_DASHBOARD],
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS, Permissions.VIEW_ANALYTICS_DASHBOARD]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("test-element")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("renders AccessDenied when user has none of the required permissions", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.LEARNER },
      permissions: [Permissions.EDIT_SCENARIO_SESSION],
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS, Permissions.VIEW_ANALYTICS_DASHBOARD]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("test-element")).not.toBeInTheDocument();
  });

  it("returns null when user is not present", () => {
    mockUseUser.mockReturnValue({
      user: null,
      permissions: [],
    });

    const { container } = render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS]}
        element={<TestElement />}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders element when permission array is empty", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: [],
    });

    render(<PermissionGuardedRoute permission={[]} element={<TestElement />} />);

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("test-element")).not.toBeInTheDocument();
  });

  it("renders element when permission is undefined", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: [],
    });

    render(<PermissionGuardedRoute permission={undefined as any} element={<TestElement />} />);

    expect(screen.getByTestId("test-element")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("handles multiple permissions correctly", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: [Permissions.VIEW_CALL_LOGS, Permissions.EDIT_SCENARIO_SESSION],
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS, Permissions.EDIT_SCENARIO_SESSION]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("test-element")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("handles case when permissions array is null", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      permissions: null,
    });

    render(
      <PermissionGuardedRoute
        permission={[Permissions.VIEW_CALL_LOGS]}
        element={<TestElement />}
      />,
    );

    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("test-element")).not.toBeInTheDocument();
  });
});
