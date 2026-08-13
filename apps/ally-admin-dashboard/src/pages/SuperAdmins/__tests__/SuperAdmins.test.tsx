import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SuperAdmins } from "../SuperAdmins";

const mockAssignPlatformAdmin = vi.fn();
const mockRemovePlatformAdmin = vi.fn();
const mockSetUserFeatureToggles = vi.fn();

const platformAdmins = [
  {
    id: 1,
    name: "Current Admin",
    email: "me@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Other Admin",
    email: "other@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const candidates = [
  {
    id: 5,
    name: "Eligible User",
    email: "eligible@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

// Labels deliberately differ from their section names ("Analytics" /
// "Platform Config") so assertions on one can't accidentally match the other.
const toggles = [
  { key: "analytics", label: "View Analytics", description: "View analytics dashboards", enabled: true },
  { key: "settings", label: "Manage Settings", description: "Manage platform settings", enabled: false },
];

// Mocking @components (with cellTypes) sidesteps the @constants ↔ @components
// circular import that breaks under vitest, same as UserManagement.test.tsx.
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
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ListToolbar: ({ searchValue, onSearchChange, action }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search"
      />
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  StatusBadge: ({ status }: any) => <span>{status}</span>,
  ActionConfirmationPopup: ({ isOpen, title, description, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
        {secondaryButton && (
          <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
        )}
      </div>
    ) : null,
  // Matches the real component: `label` is an accessible name (aria-label),
  // not visible text — visible text lives in the row's own <p>, and rendering
  // it twice would make text queries ambiguous.
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button role="switch" aria-checked={enabled} aria-label={label} onClick={() => onChange(!enabled)} />
  ),
  AssignedOrganizations: () => (
    <div data-testid="assigned-organizations">Assigned Organizations</div>
  ),
}));

vi.mock("@assets", () => ({
  ArrowDown: () => <svg data-testid="arrow-down" />,
}));

vi.mock("@api", () => ({
  useListPlatformAdminsQuery: () => ({ data: { data: platformAdmins, count: 2 }, isLoading: false }),
  useListEligiblePlatformAdminsQuery: () => ({
    data: { data: candidates, count: 1 },
    isFetching: false,
  }),
  useAssignPlatformAdminMutation: () => [mockAssignPlatformAdmin],
  useRemovePlatformAdminMutation: () => [mockRemovePlatformAdmin],
  useGetUserFeatureTogglesQuery: () => ({ data: toggles, isLoading: false }),
  useSetUserFeatureTogglesMutation: () => [mockSetUserFeatureToggles],
  useGetTenantsQuery: () => ({ data: { data: [], count: 0 } }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: any) => selector({ user: { user: { id: 1 } } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SuperAdmins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const resolved = { unwrap: () => Promise.resolve({ success: true }) };
    mockAssignPlatformAdmin.mockReturnValue(resolved);
    mockRemovePlatformAdmin.mockReturnValue(resolved);
    mockSetUserFeatureToggles.mockReturnValue(resolved);
  });

  it("renders the platform admins list", () => {
    render(<SuperAdmins />);
    expect(screen.getAllByTestId("sa-row")).toHaveLength(2);
    expect(screen.getByText("Current Admin")).toBeInTheDocument();
    expect(screen.getByText("Other Admin")).toBeInTheDocument();
  });

  it("removes a platform admin after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.getByText("Remove platform admin?")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(mockRemovePlatformAdmin).toHaveBeenCalledWith(1);
  });

  it("adds a new platform admin from the candidate panel after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Add platform admin" }));
    expect(screen.getByText("Eligible User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio"));
    const addButtons = screen.getAllByRole("button", { name: "Add platform admin" });
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(screen.getByText("Add platform admin?")).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Add platform admin" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    expect(mockAssignPlatformAdmin).toHaveBeenCalledWith({ userId: 5 });
  });

  it("disables the add button until a candidate is selected", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Add platform admin" }));
    const addButtons = screen.getAllByRole("button", { name: "Add platform admin" });
    expect(addButtons[addButtons.length - 1]).toBeDisabled();
  });

  it("opens the toggle detail view on row click, grouped with sections", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByText("Current Admin"));

    // Section headers ("Analytics", "Platform Config") plus each toggle's own label.
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Platform Config")).toBeInTheDocument();
    expect(screen.getByText("View Analytics")).toBeInTheDocument();
    expect(screen.getByText("Manage Settings")).toBeInTheDocument();
    expect(screen.getByTestId("assigned-organizations")).toBeInTheDocument();
  });

  it("flips a toggle immediately with an optimistic update", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByText("Current Admin"));

    const settingsSwitch = screen.getByRole("switch", { name: "Manage Settings" });
    expect(settingsSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(settingsSwitch);

    expect(mockSetUserFeatureToggles).toHaveBeenCalledWith({
      userId: 1,
      toggles: [{ featureKey: "settings", enabled: true }],
    });
  });

  it("returns to the list view from the detail view", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByText("Current Admin"));
    expect(screen.getByText("View Analytics")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Back to platform admins")[0]);
    expect(screen.getAllByTestId("sa-row")).toHaveLength(2);
  });
});
