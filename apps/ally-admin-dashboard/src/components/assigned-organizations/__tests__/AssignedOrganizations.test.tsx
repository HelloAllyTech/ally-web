import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { AssignedOrganizations } from "../AssignedOrganizations";

// Mock API hooks
vi.mock("@api", () => ({
  useGetAdminTenantsQuery: vi.fn(),
  useAssignAdminTenantsMutation: vi.fn(),
  useRemoveAdminTenantsMutation: vi.fn(),
}));

// Mock @ally-ui-mono/ui-shared
vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ fallbackText, alt }: any) => (
    <div data-testid="custom-image" title={alt}>
      {fallbackText}
    </div>
  ),
}));

// Mock the shared Button (avoids loading the whole @components barrel and its
// transitive @api usage in this unit test).
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, className, variant, fullWidth, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      adminFor: "Admin for:",
      addOrganizationLabel: "+ Add Organization",
      noAssignedOrganizations: "No organizations assigned yet",
      remove: "Remove",
      selectOrganizations: "Select organizations to assign",
      noOrganizationsToAdd: "All organizations already assigned",
      cancel: "Cancel",
      confirm: "Confirm",
      removeOrganizationSuccess: "Organization removed successfully",
      removeOrganizationError: "Failed to remove organization",
      assignOrganizationSuccess: "Organization(s) assigned successfully",
      assignOrganizationError: "Failed to assign organization(s)",
    },
    common: {
      loading: "Loading...",
    },
  },
}));

import {
  useGetAdminTenantsQuery,
  useAssignAdminTenantsMutation,
  useRemoveAdminTenantsMutation,
} from "@api";

describe("AssignedOrganizations", () => {
  const mockUserId = 123;
  const mockAllTenants = [
    { id: "t1", name: "Tenant 1" },
    { id: "t2", name: "Tenant 2" },
    { id: "t3", name: "Tenant 3" },
  ];

  const mockAdminTenants = {
    data: [{ id: "t1", name: "Tenant 1", logoUrl: "" }],
    count: 1,
  };

  const mockAssignMutation = vi
    .fn()
    .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
  const mockRemoveMutation = vi
    .fn()
    .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });

  beforeEach(() => {
    vi.clearAllMocks();
    (useGetAdminTenantsQuery as any).mockReturnValue({
      data: mockAdminTenants,
      isFetching: false,
    });
    (useAssignAdminTenantsMutation as any).mockReturnValue([
      mockAssignMutation,
      { isLoading: false },
    ]);
    (useRemoveAdminTenantsMutation as any).mockReturnValue([
      mockRemoveMutation,
      { isLoading: false },
    ]);
  });

  it("renders assigned organizations correctly", () => {
    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    expect(screen.getByText("Admin for:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // count
    expect(screen.getByText("Tenant 1")).toBeInTheDocument();
    expect(screen.getByText("+ Add Organization")).toBeInTheDocument();
  });

  it("shows loading state when fetching", () => {
    (useGetAdminTenantsQuery as any).mockReturnValue({
      data: null,
      isFetching: true,
    });

    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when no organizations assigned", () => {
    (useGetAdminTenantsQuery as any).mockReturnValue({
      data: { data: [], count: 0 },
      isFetching: false,
    });

    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    expect(screen.getByText("No organizations assigned yet")).toBeInTheDocument();
  });

  it("hides Add button and Remove icon when canEdit is false", () => {
    render(
      <AssignedOrganizations userId={mockUserId} canEdit={false} allTenants={mockAllTenants} />,
    );

    expect(screen.queryByText("+ Add Organization")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Remove")).not.toBeInTheDocument();
  });

  it("opens modal and allows assigning new organizations", async () => {
    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    fireEvent.click(screen.getByText("+ Add Organization"));

    // Modal should be visible
    expect(screen.getByText("Select organizations to assign")).toBeInTheDocument();

    // Only t2 and t3 should be available (t1 is already assigned)
    expect(screen.queryByText("Tenant 1")).toBeInTheDocument(); // It's in the background list
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2); // Tenant 2 and Tenant 3 in modal

    // Select Tenant 2
    fireEvent.click(checkboxes[0]);

    // Click Confirm
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockAssignMutation).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantIds: ["t2"],
      });
      expect(toast.success).toHaveBeenCalledWith("Organization(s) assigned successfully");
    });
  });

  it("allows removing an assigned organization", async () => {
    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    const removeBtn = screen.getByTitle("Remove");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockRemoveMutation).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantIds: ["t1"],
      });
      expect(toast.success).toHaveBeenCalledWith("Organization removed successfully");
    });
  });

  it("handles assignment error", async () => {
    const errorMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ data: { message: "Error assigning" } }),
    });
    (useAssignAdminTenantsMutation as any).mockReturnValue([errorMutation, { isLoading: false }]);

    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    fireEvent.click(screen.getByText("+ Add Organization"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error assigning");
    });
  });

  it("handles removal error", async () => {
    const errorMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({}),
    });
    (useRemoveAdminTenantsMutation as any).mockReturnValue([errorMutation, { isLoading: false }]);

    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    fireEvent.click(screen.getByTitle("Remove"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to remove organization");
    });
  });

  it("closes modal on cancel", () => {
    render(
      <AssignedOrganizations userId={mockUserId} canEdit={true} allTenants={mockAllTenants} />,
    );

    fireEvent.click(screen.getByText("+ Add Organization"));
    expect(screen.getByText("Select organizations to assign")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Select organizations to assign")).not.toBeInTheDocument();
  });
});
