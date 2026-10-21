import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PlatformAdminDetail } from "../PlatformAdminDetail";

const mockSetUserFeatureToggles = vi.fn();
const mockOnBack = vi.fn();

const admin = {
  id: 1,
  name: "Test Admin",
  email: "test@helloally.ai",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
  roleGrantedAt: "2026-07-15T00:00:00Z",
};

// Labels deliberately differ from their section names ("Analytics" /
// "Platform Config") so assertions on one can't accidentally match the other.
const toggles = [
  {
    key: "analytics",
    label: "View Analytics",
    description: "View analytics dashboards",
    enabled: true,
    platformOnly: true,
  },
  {
    key: "settings",
    label: "Manage Settings",
    description: "Manage platform settings",
    enabled: false,
    platformOnly: false,
  },
];

// The organizations the opened admin is restricted to; none = unrestricted.
let adminTenantCount = 0;

vi.mock("@components", () => ({
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
  },
  Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
    />
  ),
  AssignedOrganizations: () => (
    <div data-testid="assigned-organizations">Assigned Organizations</div>
  ),
}));

vi.mock("@assets", () => ({
  ArrowDown: () => <svg data-testid="arrow-down" />,
}));

vi.mock("@api", () => ({
  useGetUserFeatureTogglesQuery: () => ({ data: toggles, isLoading: false }),
  useSetUserFeatureTogglesMutation: () => [mockSetUserFeatureToggles],
  useGetAdminTenantsQuery: () => ({ data: { data: [], count: adminTenantCount } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("PlatformAdminDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const resolved = { unwrap: () => Promise.resolve({ success: true }) };
    mockSetUserFeatureToggles.mockReturnValue(resolved);
    adminTenantCount = 0;
  });

  it("renders the admin's name and the toggles, grouped into sections", () => {
    render(<PlatformAdminDetail admin={admin} onBack={mockOnBack} />);

    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText(/Feature access for/)).toBeInTheDocument();

    // Section headers ("Analytics", "Platform Config") plus each toggle's own label.
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Platform Config")).toBeInTheDocument();
    expect(screen.getByText("View Analytics")).toBeInTheDocument();
    expect(screen.getByText("Manage Settings")).toBeInTheDocument();
    expect(screen.getByTestId("assigned-organizations")).toBeInTheDocument();
  });

  it("flips a toggle immediately with an optimistic update", () => {
    render(<PlatformAdminDetail admin={admin} onBack={mockOnBack} />);

    const settingsSwitch = screen.getByRole("switch", { name: "Manage Settings" });
    expect(settingsSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(settingsSwitch);

    expect(mockSetUserFeatureToggles).toHaveBeenCalledWith({
      userId: 1,
      toggles: [{ featureKey: "settings", enabled: true }],
    });
  });

  it("says a platform-only toggle is off while the admin is restricted to organizations", () => {
    adminTenantCount = 1;
    render(<PlatformAdminDetail admin={admin} onBack={mockOnBack} />);

    // Once, on the platform-only "View Analytics" row — not on "Manage Settings".
    expect(screen.getAllByText(/Off while this admin is restricted/)).toHaveLength(1);
  });

  it("shows no such note for an unrestricted admin", () => {
    adminTenantCount = 0;
    render(<PlatformAdminDetail admin={admin} onBack={mockOnBack} />);

    expect(screen.queryByText(/Off while this admin is restricted/)).not.toBeInTheDocument();
  });

  it("calls the onBack handler when the back button is clicked", () => {
    render(<PlatformAdminDetail admin={admin} onBack={mockOnBack} />);
    fireEvent.click(screen.getAllByText("Back to platform admins")[0]);
    expect(mockOnBack).toHaveBeenCalled();
  });
});
