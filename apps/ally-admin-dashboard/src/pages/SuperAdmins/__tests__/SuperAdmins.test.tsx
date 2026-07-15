import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SuperAdmins } from "../SuperAdmins";

const mockPromoteSuperAdmin = vi.fn();
const mockPromoteSuperDuperAdmin = vi.fn();
const mockDemote = vi.fn();
const mockRemove = vi.fn();

const superDuperAdmins = [
  {
    id: 1,
    name: "Current Admin",
    email: "me@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Other Duper Admin",
    email: "other@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const superAdmins = [
  {
    id: 4,
    name: "Plain Super Admin",
    email: "sa@helloally.ai",
    status: "ACTIVE",
    createdAt: "2026-03-01T00:00:00Z",
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
}));

vi.mock("@api", () => ({
  useGetSuperDuperAdminsQuery: () => ({
    data: { data: superDuperAdmins, count: 2 },
    isLoading: false,
  }),
  useGetSuperAdminsQuery: () => ({ data: { data: superAdmins, count: 1 }, isLoading: false }),
  useGetSuperAdminCandidatesQuery: () => ({
    data: { data: candidates, count: 1 },
    isFetching: false,
  }),
  usePromoteSuperAdminMutation: () => [mockPromoteSuperAdmin],
  usePromoteSuperDuperAdminMutation: () => [mockPromoteSuperDuperAdmin],
  useDemoteSuperDuperAdminMutation: () => [mockDemote],
  useRemoveSuperAdminMutation: () => [mockRemove],
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
    mockPromoteSuperAdmin.mockReturnValue(resolved);
    mockPromoteSuperDuperAdmin.mockReturnValue(resolved);
    mockDemote.mockReturnValue(resolved);
    mockRemove.mockReturnValue(resolved);
  });

  it("renders both tiers in one table with tier badges", () => {
    render(<SuperAdmins />);
    expect(screen.getAllByTestId("sa-row")).toHaveLength(3);
    expect(screen.getAllByText("Super duper admin")).toHaveLength(2);
    expect(screen.getAllByText("Super admin")).toHaveLength(1);
  });

  it("marks the current user and offers them no actions", () => {
    render(<SuperAdmins />);
    expect(screen.getByText("(You)")).toBeInTheDocument();
    // Demote only on the other SDA row; Promote/Remove only on the SA row.
    expect(screen.getAllByRole("button", { name: "Demote" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Promote" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("promotes a super admin to super duper admin after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Promote" }));
    expect(screen.getByText("Promote to super duper admin?")).toBeInTheDocument();
    const promoteButtons = screen.getAllByRole("button", { name: "Promote" });
    fireEvent.click(promoteButtons[promoteButtons.length - 1]);
    expect(mockPromoteSuperDuperAdmin).toHaveBeenCalledWith({ userId: 4 });
  });

  it("removes a super admin after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText("Remove super admin?")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(mockRemove).toHaveBeenCalledWith(4);
  });

  it("demotes another super duper admin after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Demote" }));
    expect(screen.getByText("Demote super duper admin?")).toBeInTheDocument();
    const demoteButtons = screen.getAllByRole("button", { name: "Demote" });
    fireEvent.click(demoteButtons[demoteButtons.length - 1]);
    expect(mockDemote).toHaveBeenCalledWith(2);
  });

  it("adds a new super admin from the candidate panel after confirmation", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Add super admin" }));
    expect(screen.getByText("Eligible User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio"));
    // Panel's primary button repeats the "Add super admin" label.
    const addButtons = screen.getAllByRole("button", { name: "Add super admin" });
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(screen.getByText("Add super admin?")).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Add super admin" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    expect(mockPromoteSuperAdmin).toHaveBeenCalledWith({ userId: 5 });
  });

  it("disables the add button until a candidate is selected", () => {
    render(<SuperAdmins />);
    fireEvent.click(screen.getByRole("button", { name: "Add super admin" }));
    const addButtons = screen.getAllByRole("button", { name: "Add super admin" });
    expect(addButtons[addButtons.length - 1]).toBeDisabled();
  });
});
