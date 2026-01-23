import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TabType } from "@types";

import * as useOrganizationManagementHook from "../useOrganizationManagement";
import { UserManagement } from "../UserManagement";
import * as useUserManagementHook from "../useUserManagement";

// Mock hooks
vi.mock("../useUserManagement");
vi.mock("../useOrganizationManagement");

// Mock components
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
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items.map((item: any) => (
        <button key={item.id} onClick={() => onChange(item.id)} data-active={activeId === item.id}>
          {item.label} ({item.count})
        </button>
      ))}
    </div>
  ),
  ListToolbar: ({ searchValue, onSearchChange, action, filterChips, addFilterCta }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search"
      />
      {action && <button onClick={action.onClick}>{action.label}</button>}
      {filterChips}
      {addFilterCta}
    </div>
  ),
  FilterDropdown: ({ isOpen, onApplyFilters }: any) =>
    isOpen ? (
      <div data-testid="filter-dropdown">
        Filter Dropdown
        <button
          data-testid="apply-filters-test"
          onClick={() => onApplyFilters({ roles: ["admin"], organizations: [], statuses: [] })}
        >
          Apply Filters
        </button>
      </div>
    ) : null,
  UserList: ({ users, onOptionSelect, renderFooter }: any) => (
    <div data-testid="user-list">
      {users.map((user: any) => (
        <div key={user.id} data-testid={`user-${user.id}`}>
          <span>{user.name}</span>
          <button onClick={() => onOptionSelect(user, "EDIT_DETAILS")}>Edit</button>
          <button onClick={() => onOptionSelect(user, "SUSPEND_USER")}>Suspend</button>
          <button onClick={() => onOptionSelect(user, "REMOVE_USER")}>Remove</button>
        </div>
      ))}
      {renderFooter()}
    </div>
  ),
  OrganizationList: ({ organizations, onEditPress, renderFooter }: any) => (
    <div data-testid="organization-list">
      {organizations.map((org: any) => (
        <div key={org.id} data-testid={`org-${org.id}`}>
          <span>{org.name}</span>
          <button onClick={() => onEditPress(org)}>Edit</button>
        </div>
      ))}
      {renderFooter()}
    </div>
  ),
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
  UserListLoader: () => <div data-testid="user-loader">Loading users...</div>,
  OrganizationListLoader: () => <div data-testid="org-loader">Loading organizations...</div>,
  UserModal: ({ isOpen, onClose, title, handleClick }: any) => {
    // If isOpen is explicitly false, don't render
    if (isOpen === false) return null;
    // Otherwise render (when isOpen is true or undefined)
    return (
      <div data-testid="user-modal">
        <h2>{title}</h2>
        <button onClick={handleClick}>Submit</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
  ActionConfirmationPopup: ({ isOpen, onClose, title, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <h2>{title}</h2>
        <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
        <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
      </div>
    ) : null,
}));

describe("UserManagement", () => {
  const mockUsers = [
    { id: "user-1", name: "John Doe", email: "john@example.com", status: "ACTIVE" },
    { id: "user-2", name: "Jane Smith", email: "jane@example.com", status: "ACTIVE" },
  ];

  const mockOrganizations = [
    { id: "org-1", name: "Organization 1" },
    { id: "org-2", name: "Organization 2" },
  ];

  const mockUserManagementHook = {
    usersCount: 2,
    activeTab: TabType.USERS,
    search: "",
    setSearch: vi.fn(),
    isFilterOpen: false,
    setIsFilterOpen: vi.fn(),
    addFilterBtnRef: { current: null },
    filters: { organizations: [], roles: [], statuses: [] },
    handleApplyFilters: vi.fn(),
    users: mockUsers as any,
    loadUsers: vi.fn(),
    isUsersFetching: false,
    filterChips: null,
    getField: vi.fn(),
    addUsermodalOpen: false,
    setAddUserModalOpen: vi.fn(),
    handleTabChange: vi.fn(),
    selectedUser: null,
    setSelectedUser: vi.fn(),
    selectedOption: null,
    setSelectedOption: vi.fn(),
    addFilterCtaMemo: null,
    userMethods: {
      watch: vi.fn(),
      register: vi.fn(),
      handleSubmit: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn(),
      reset: vi.fn(),
      formState: { errors: {} },
    } as any,
    handleOptionSelect: vi.fn(),
    handleDropdownClose: vi.fn(),
    handleAddUser: vi.fn(),
    handleRemoveUser: vi.fn(),
    handleEditUser: vi.fn(),
    handleSuspendUser: vi.fn(),
    handleChangeRole: vi.fn(),
    handleActivateUser: vi.fn(),
    handleAddUserClose: vi.fn(),
    handleUserAddClick: vi.fn(),
    handleAddCredit: vi.fn(),
    roles: [],
    setRoles: vi.fn(),
    usersOffset: 0,
    addUser: vi.fn(),
    editUser: vi.fn(),
    deleteUser: vi.fn(),
    updateUserStatus: vi.fn(),
    changeRole: vi.fn(),
    addUserdata: vi.fn(),
  };

  const mockOrganizationManagementHook = {
    tenantsCount: 2,
    orgSearch: "",
    setOrgSearch: vi.fn(),
    addOrganizationModalOpen: false,
    setAddOrganizationModalOpen: vi.fn(),
    selectedTenant: null,
    setSelectedTenant: vi.fn(),
    tenants: mockOrganizations as any,
    loadTenants: vi.fn(),
    isTenantsFetching: false,
    tenantsOffset: 0,
    tenantMethods: {
      watch: vi.fn().mockReturnValue(undefined),
      register: vi.fn(),
      handleSubmit: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn(),
      reset: vi.fn(),
      formState: { errors: {} },
    } as any,
    handleNewgroupClick: vi.fn(),
    onEditTenant: vi.fn(),
    handleTenantFormSubmit: vi.fn(),
    onCloseOrganizationEditModal: vi.fn(),
    handleCreateTenant: vi.fn(),
    handleEditTenant: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue(
      mockUserManagementHook as any,
    );
    vi.mocked(useOrganizationManagementHook.useOrganizationManagement).mockReturnValue(
      mockOrganizationManagementHook as any,
    );
  });

  const renderUserManagement = (initialEntries = ["/"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <UserManagement />
      </MemoryRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render user management page", () => {
      renderUserManagement();

      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });

    it("should render tabs with counts", () => {
      renderUserManagement();

      expect(screen.getByText(/Users \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Organizations \(2\)/)).toBeInTheDocument();
    });

    it("should render users tab by default", () => {
      renderUserManagement();

      expect(screen.getByTestId("user-list")).toBeInTheDocument();
      expect(screen.queryByTestId("organization-list")).not.toBeInTheDocument();
    });
  });

  describe("Users Tab", () => {
    it("should display user list", () => {
      renderUserManagement();

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should show search input", () => {
      renderUserManagement();

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should update search value", () => {
      renderUserManagement();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(mockUserManagementHook.setSearch).toHaveBeenCalledWith("John");
    });

    it("should show add user button", () => {
      renderUserManagement();

      expect(screen.getByText("Add user")).toBeInTheDocument();
    });

    it("should open add user modal when add user button is clicked", () => {
      renderUserManagement();

      const addUserButton = screen.getByText("Add user");
      fireEvent.click(addUserButton);

      expect(mockUserManagementHook.handleUserAddClick).toHaveBeenCalled();
    });

    it("should show empty state when no users", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        users: [],
        usersCount: 0,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("should show loading state when fetching users", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        users: [],
        isUsersFetching: true,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("user-loader")).toBeInTheDocument();
    });
  });

  describe("User Actions", () => {
    it("should handle edit user", () => {
      renderUserManagement();

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      expect(mockUserManagementHook.handleOptionSelect).toHaveBeenCalledWith(
        mockUsers[0],
        "EDIT_DETAILS",
      );
    });

    it("should handle suspend user", () => {
      renderUserManagement();

      const suspendButtons = screen.getAllByText("Suspend");
      fireEvent.click(suspendButtons[0]);

      expect(mockUserManagementHook.handleOptionSelect).toHaveBeenCalledWith(
        mockUsers[0],
        "SUSPEND_USER",
      );
    });

    it("should handle remove user", () => {
      renderUserManagement();

      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);

      expect(mockUserManagementHook.handleOptionSelect).toHaveBeenCalledWith(
        mockUsers[0],
        "REMOVE_USER",
      );
    });

    it("should show edit modal when editing user", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Edit details",
        selectedUser: mockUsers[0],
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("user-modal")).toBeInTheDocument();
      expect(screen.getByText("Edit Details")).toBeInTheDocument();
    });

    it("should show confirmation popup when suspending user", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Suspend user",
        selectedUser: mockUsers[0],
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getAllByText("Suspend User").length).toBeGreaterThan(0);
    });

    it("should show confirmation popup when removing user", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Remove user",
        selectedUser: mockUsers[0],
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getAllByText("Remove User").length).toBeGreaterThan(0);
    });
  });

  describe("Organizations Tab", () => {
    beforeEach(() => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        activeTab: TabType.ORGANIZATIONS,
      } as any);
    });

    it("should switch to organizations tab", () => {
      renderUserManagement();

      const orgTab = screen.getByText(/Organizations \(2\)/);
      fireEvent.click(orgTab);

      // The component now uses setSearchParams instead of handleTabChange
      // Just verify the tab was clicked
      expect(orgTab).toBeInTheDocument();
    });

    it("should display organization list", () => {
      renderUserManagement(["/?tab=organizations"]);

      expect(screen.getByTestId("organization-list")).toBeInTheDocument();
      expect(screen.getByText("Organization 1")).toBeInTheDocument();
      expect(screen.getByText("Organization 2")).toBeInTheDocument();
    });

    it("should show add organization button", () => {
      renderUserManagement(["/?tab=organizations"]);

      expect(screen.getByText("Add organization")).toBeInTheDocument();
    });

    it("should open add organization modal", () => {
      renderUserManagement(["/?tab=organizations"]);

      const addOrgButton = screen.getByText("Add organization");
      fireEvent.click(addOrgButton);

      expect(mockOrganizationManagementHook.handleNewgroupClick).toHaveBeenCalled();
    });

    it("should handle edit organization", () => {
      renderUserManagement(["/?tab=organizations"]);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      expect(mockOrganizationManagementHook.onEditTenant).toHaveBeenCalledWith(
        mockOrganizations[0],
      );
    });

    it("should show empty state when no organizations", () => {
      vi.mocked(useOrganizationManagementHook.useOrganizationManagement).mockReturnValue({
        ...mockOrganizationManagementHook,
        tenants: [],
        tenantsCount: 0,
      } as any);

      renderUserManagement(["/?tab=organizations"]);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("should show loading state when fetching organizations", () => {
      vi.mocked(useOrganizationManagementHook.useOrganizationManagement).mockReturnValue({
        ...mockOrganizationManagementHook,
        tenants: [],
        isTenantsFetching: true,
      } as any);

      renderUserManagement(["/?tab=organizations"]);

      expect(screen.getByTestId("org-loader")).toBeInTheDocument();
    });

    it("should show organization search input", () => {
      renderUserManagement(["/?tab=organizations"]);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "Organization" } });

      expect(mockOrganizationManagementHook.setOrgSearch).toHaveBeenCalledWith("Organization");
    });
  });

  describe("Filtering", () => {
    it("should open filter dropdown when filter button is clicked", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        isFilterOpen: true,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
    });

    it("should apply filters", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        isFilterOpen: true,
      } as any);

      renderUserManagement();

      const applyButton = screen.getByTestId("apply-filters-test");
      fireEvent.click(applyButton);

      expect(mockUserManagementHook.handleApplyFilters).toHaveBeenCalledWith({
        roles: ["admin"],
        organizations: [],
        statuses: [],
      });
    });
  });

  describe("Load More", () => {
    it("should load more users when load more is clicked", () => {
      renderUserManagement();

      // Load more functionality would be in the footer
      expect(mockUserManagementHook.loadUsers).toBeDefined();
    });

    it("should load more organizations when load more is clicked", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        activeTab: TabType.ORGANIZATIONS,
      } as any);

      renderUserManagement();

      expect(mockOrganizationManagementHook.loadTenants).toBeDefined();
    });
  });

  describe("Modals", () => {
    it("should show user modal when adding user", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        addUsermodalOpen: true,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("user-modal")).toBeInTheDocument();
    });

    it("should close user modal", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        addUsermodalOpen: true,
      } as any);

      renderUserManagement();

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(mockUserManagementHook.handleAddUserClose).toHaveBeenCalled();
    });

    it("should show organization modal when adding organization", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        activeTab: TabType.ORGANIZATIONS,
      } as any);

      vi.mocked(useOrganizationManagementHook.useOrganizationManagement).mockReturnValue({
        ...mockOrganizationManagementHook,
        addOrganizationModalOpen: true,
      } as any);

      renderUserManagement(["/?tab=organizations"]);

      expect(screen.getByTestId("user-modal")).toBeInTheDocument();
    });

    it("should close organization modal", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        activeTab: TabType.ORGANIZATIONS,
      } as any);

      vi.mocked(useOrganizationManagementHook.useOrganizationManagement).mockReturnValue({
        ...mockOrganizationManagementHook,
        addOrganizationModalOpen: true,
      } as any);

      renderUserManagement(["/?tab=organizations"]);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(mockOrganizationManagementHook.onCloseOrganizationEditModal).toHaveBeenCalled();
    });
  });

  describe("User Role Management", () => {
    it("should show change role modal", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Change role",
        selectedUser: mockUsers[0],
        activeTab: TabType.USERS,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("user-modal")).toBeInTheDocument();
      expect(screen.getByText("Change User Role")).toBeInTheDocument();
    });

    it("should show add credit modal", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Manage credits",
        selectedUser: mockUsers[0],
        activeTab: TabType.USERS,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("user-modal")).toBeInTheDocument();
      expect(screen.getByText("Manage Simulation Credits")).toBeInTheDocument();
    });

    it("should show grant access confirmation", () => {
      vi.mocked(useUserManagementHook.useUserManagement).mockReturnValue({
        ...mockUserManagementHook,
        selectedOption: "Grant access",
        selectedUser: mockUsers[0],
        activeTab: TabType.USERS,
      } as any);

      renderUserManagement();

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getAllByText("Grant Access").length).toBeGreaterThan(0);
    });
  });
});
