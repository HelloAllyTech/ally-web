import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions for mutations
const mockCreateBadge = vi.fn();
const mockUpdateBadge = vi.fn();
const mockUploadBadgeIcon = vi.fn();
const mockDeleteBadge = vi.fn();
const mockDeleteBadgeIcon = vi.fn();

// Mock roles data - LEARNER role for SIMULATION_MINUTES badge type
const mockRolesData = [
  { id: 1, name: "LEARNER" },
  { id: 2, name: "SIMULATION_REVIEWER" },
];

// Mock API hooks
vi.mock("@api", () => ({
  useCreateBadgeMutation: () => [mockCreateBadge, { isLoading: false }],
  useUpdateBadgeMutation: () => [mockUpdateBadge, { isLoading: false }],
  useDeleteBadgeMutation: () => [mockDeleteBadge, { isLoading: false }],
  useGetRoleQuery: () => ({
    data: mockRolesData,
    isLoading: false,
  }),
  useUploadBadgeIconMutation: () => [mockUploadBadgeIcon],
  useDeleteBadgeIconMutation: () => [mockDeleteBadgeIcon, { isLoading: false }],
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button data-testid={`button-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  TextDropdown: ({ value, options, onChange, placeholder }: any) => (
    <div data-testid="text-dropdown">
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  ActionConfirmationPopup: ({ isOpen, primaryButton, secondaryButton, title }: any) =>
    isOpen ? (
      <div data-testid="confirmation-popup">
        <div data-testid="popup-title">{title}</div>
        <button data-testid="primary-btn" onClick={primaryButton?.onClick}>
          {primaryButton?.label}
        </button>
        <button data-testid="secondary-btn" onClick={secondaryButton?.onClick}>
          {secondaryButton?.label}
        </button>
      </div>
    ) : null,
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <div data-testid="toggle-switch">
      <input
        type="checkbox"
        data-testid="toggle-input"
        checked={enabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </div>
  ),
}));

// Mock IconUploader
vi.mock("@components/icon-uploader", () => ({
  IconUploader: ({ imageUrl, onImageChange }: any) => (
    <div data-testid="icon-uploader">
      <span data-testid="icon-url">{imageUrl}</span>
      <button data-testid="upload-btn" onClick={() => onImageChange("https://cdn/new-icon.png")}>
        Upload
      </button>
    </div>
  ),
}));

// Mock assets
vi.mock("@assets", () => ({
  DoubleArrowRight: () => <svg data-testid="double-arrow" />,
  InfoIcon: () => <svg data-testid="info-icon" />,
  TooltipIcon: () => <svg data-testid="tooltip-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
  ArrowDownFilled: () => <svg data-testid="arrow-down-filled" />,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    badge: {
      createBadge: "Create Badge",
      editBadge: "Edit Badge",
      name: "Name",
      enterName: "Add name",
      description: "Description",
      enterDescription: "Add description",
      visibility: "Default org-level visibility",
      selectVisibility: "Select visibility",
      category: "Category",
      role: "Role",
      roles: "Roles",
      addRole: "Add role",
      nameRequired: "Badge name is required",
      unsavedChanges: "Unsaved Changes",
      unsavedChangesDescription: "You have unsaved changes. Are you sure you want to close?",
      closeAnyway: "Close Anyway",
      keepEditing: "Keep Editing",
      cannotChangeAfterPublishing: "Cannot be changed after publishing",
      saveAsDraft: "Save as draft",
      publish: "Publish",
      badgeSavedAsDraft: "Badge saved as draft",
      badgePublishedSuccessfully: "Badge published successfully",
      badgeUpdatedSuccessfully: "Badge updated successfully",
      badgeCreationFailed: "Failed to create badge",
      badgeUpdateFailed: "Failed to update badge",
      deleteBadge: "Delete Badge",
      deleteBadgeConfirmation: "Delete Badge?",
      deleteBadgeConfirmationTitleItalic: "This action cannot be undone",
      deleteBadgeConfirmationDescription: "Are you sure you want to delete this badge?",
      badgeDeletedSuccessfully: "Badge deleted successfully",
      badgeDeletionFailed: "Failed to delete badge",
      publishBadgeConfirmation: "Publish Badge?",
      publishBadgeConfirmationTitleItalic: "This action will make the badge visible",
      publishBadgeConfirmationDescription: "Are you sure you want to publish this badge?",
      badgeAlreadyPublished: "Badge is already published",
      noChangesToSave: "No changes to save",
    },
    common: {
      delete: "Delete",
      cancel: "Cancel",
    },
  },
  userRoleItems: ["Admin", "User", "Manager"],
  TAG_TYPES: {
    USER_BADGES: "UserBadges",
  },
}));

// Mock types
vi.mock("@types", () => ({
  BadgeCategory: {
    SIMULATION_MINUTES: "Simulation",
    ACTIVE_DAY_STREAK: "Momentum",
    COMMENTS_REACTIONS_GIVEN: "Contribution",
    COMMENTS_REACTIONS_RECEIVED: "Resonance",
  },
}));

// Mock sonner
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: any[]) => toastError(...args),
    success: (...args: any[]) => toastSuccess(...args),
  },
}));

import { CreateBadgeSidePanel } from "../CreateBadgeSidePanel";

describe("CreateBadgeSidePanel", () => {
  let store: ReturnType<typeof configureStore>;

  const defaultProps = {
    selectedBadgeType: "SIMULATION_MINUTES" as const,
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock store
    store = configureStore({
      reducer: {
        user: () => ({ user: null }),
      },
    });

    // Reset mock implementations
    mockCreateBadge.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: "new-badge-id" }),
    });
    mockUpdateBadge.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: "updated-badge-id" }),
    });
    mockUploadBadgeIcon.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        presignedUrl: "https://s3/upload",
        imageUrl: "https://cdn/badge-icon.png",
      }),
    });
    mockDeleteBadge.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  const renderComponent = (props = {}) => {
    const result = render(
      <Provider store={store}>
        <CreateBadgeSidePanel {...defaultProps} {...props} />
      </Provider>,
    );

    return {
      ...result,
      rerender: (newProps = {}) =>
        result.rerender(
          <Provider store={store}>
            <CreateBadgeSidePanel {...defaultProps} {...newProps} />
          </Provider>,
        ),
    };
  };

  describe("Rendering", () => {
    it("renders side panel when isOpen is true", () => {
      renderComponent();

      expect(screen.getByText("Create Badge")).toBeInTheDocument();
      expect(screen.getByTestId("icon-uploader")).toBeInTheDocument();
    });

    it("does not render side panel when isOpen is false", () => {
      renderComponent({ isOpen: false });

      expect(screen.queryByText("Create Badge")).not.toBeInTheDocument();
    });

    it("displays all form fields", () => {
      renderComponent();

      // "Name"/"Description" now appear twice: the visible <Field> label and
      // the Carbon TextInput's (visually hidden) accessible label.
      expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Description").length).toBeGreaterThan(0);
      expect(screen.getByText("Default org-level visibility")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
    });

    it("displays criteria section with info tooltip", () => {
      renderComponent();

      expect(screen.getByText("Criteria")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-icon")).toBeInTheDocument();
    });

    it("displays category based on selected badge type", () => {
      renderComponent({ selectedBadgeType: "SIMULATION_MINUTES" });

      expect(screen.getByText("Simulation Badges")).toBeInTheDocument();
    });

    it("displays correct criteria label for SIMULATION_MINUTES", () => {
      renderComponent({ selectedBadgeType: "SIMULATION_MINUTES" });

      expect(screen.getByText("Total simulation minutes")).toBeInTheDocument();
    });

    it("displays correct criteria label for ACTIVE_DAY_STREAK", () => {
      renderComponent({ selectedBadgeType: "ACTIVE_DAY_STREAK" });

      expect(screen.getByText("Maintain a daily streak of")).toBeInTheDocument();
    });

    it("displays correct criteria label for COMMENTS_REACTIONS_GIVEN", () => {
      renderComponent({ selectedBadgeType: "COMMENTS_REACTIONS_GIVEN" });

      expect(screen.getByText("Comments or reactions given")).toBeInTheDocument();
    });

    it("displays correct criteria label for COMMENTS_REACTIONS_RECEIVED", () => {
      renderComponent({ selectedBadgeType: "COMMENTS_REACTIONS_RECEIVED" });

      expect(screen.getByText("Comments or reactions received")).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    it("updates name field on input change", () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Test Badge" } });

      expect(nameInput).toHaveValue("Test Badge");
    });

    it("updates description field on input change", () => {
      renderComponent();

      const descriptionInput = screen.getByPlaceholderText("Add description");
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });

      expect(descriptionInput).toHaveValue("Test description");
    });

    it("updates visibility toggle", () => {
      renderComponent();

      const toggleInput = screen.getByTestId("toggle-input");
      fireEvent.click(toggleInput);

      expect(toggleInput).toBeChecked();
    });

    it("updates criteria value on input change", () => {
      renderComponent();

      const criteriaInput = screen.getByPlaceholderText("0");
      fireEvent.change(criteriaInput, { target: { value: "60" } });

      expect(criteriaInput).toHaveValue(60);
    });

    it("increments criteria value when up arrow is clicked", () => {
      renderComponent();

      const criteriaInput = screen.getByPlaceholderText("0");
      const upButton = screen.getByTestId("criteria-increment-btn");

      fireEvent.click(upButton);
      expect(criteriaInput).toHaveValue(1);
    });

    it("decrements criteria value when down arrow is clicked", () => {
      renderComponent();

      const criteriaInput = screen.getByPlaceholderText("0");
      fireEvent.change(criteriaInput, { target: { value: "5" } });

      const downButton = screen.getByTestId("criteria-decrement-btn");

      fireEvent.click(downButton);
      expect(criteriaInput).toHaveValue(4);
    });

    it("does not decrement criteria value below 0", () => {
      renderComponent();

      const criteriaInput = screen.getByPlaceholderText("0");
      expect(criteriaInput).toHaveValue(0);

      const downButton = screen.getByTestId("criteria-decrement-btn");

      fireEvent.click(downButton);
      expect(criteriaInput).toHaveValue(0);
    });

    it("updates image URL from IconUploader", () => {
      renderComponent();

      const uploadBtn = screen.getByTestId("upload-btn");
      fireEvent.click(uploadBtn);

      const iconUrl = screen.getByTestId("icon-url");
      expect(iconUrl.textContent).toBe("https://cdn/new-icon.png");
    });
  });

  describe("Form Validation", () => {
    it("disables save button when name is missing", () => {
      renderComponent();

      const saveButton = screen.getByText("Save as draft");
      expect(saveButton).toBeDisabled();
    });

    it("calls createBadge mutation with form data when valid", async () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");
      const criteriaInput = screen.getByPlaceholderText("0");
      const uploadBtn = screen.getByTestId("upload-btn");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });
      fireEvent.change(criteriaInput, { target: { value: "60" } });
      fireEvent.click(uploadBtn);

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateBadge).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Badge",
            category: "SIMULATION_MINUTES",
            status: "DRAFT",
          }),
        );
      });
    });

    it("shows publish confirmation popup when publish is clicked", async () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");
      const criteriaInput = screen.getByPlaceholderText("0");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });
      fireEvent.change(criteriaInput, { target: { value: "60" } });

      const uploadBtn = screen.getByTestId("upload-btn");
      fireEvent.click(uploadBtn);

      const publishButton = screen.getByText("Publish");
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
        expect(screen.getByTestId("popup-title")).toHaveTextContent("Publish Badge?");
      });
    });

    it("calls createBadge mutation with ACTIVE status when publish is confirmed", async () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");
      const criteriaInput = screen.getByPlaceholderText("0");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });
      fireEvent.change(criteriaInput, { target: { value: "60" } });

      const uploadBtn = screen.getByTestId("upload-btn");
      fireEvent.click(uploadBtn);

      const publishButton = screen.getByText("Publish");
      fireEvent.click(publishButton);

      // Confirm publish in the confirmation popup
      const confirmButton = screen.getByTestId("primary-btn");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCreateBadge).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Test Badge",
            status: "ACTIVE",
          }),
        );
      });
    });

    it("enables both buttons when form is valid", () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");
      const criteriaInput = screen.getByPlaceholderText("0");
      const uploadBtn = screen.getByTestId("upload-btn");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });
      fireEvent.change(criteriaInput, { target: { value: "60" } });
      fireEvent.click(uploadBtn);

      const saveButton = screen.getByText("Save as draft");
      const publishButton = screen.getByText("Publish");

      expect(saveButton).not.toBeDisabled();
      expect(publishButton).not.toBeDisabled();
    });
  });

  describe("Close Behavior", () => {
    it("closes panel directly when no changes have been made", () => {
      renderComponent();

      const closeButton = screen.getByText("Create Badge").closest("button");
      if (closeButton) fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("shows confirmation modal when closing with unsaved changes", () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Test Badge" } });

      const closeButton = screen.getByText("Create Badge").closest("button");
      if (closeButton) fireEvent.click(closeButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getByTestId("popup-title")).toHaveTextContent("Unsaved Changes");
    });

    it("closes panel when confirming close with unsaved changes", async () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Test Badge" } });

      const closeButton = screen.getByText("Create Badge").closest("button");
      if (closeButton) fireEvent.click(closeButton);

      const confirmButton = screen.getByTestId("primary-btn");
      fireEvent.click(confirmButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("keeps panel open when canceling close with unsaved changes", () => {
      renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Test Badge" } });

      const closeButton = screen.getByText("Create Badge").closest("button");
      if (closeButton) fireEvent.click(closeButton);

      const cancelButton = screen.getByTestId("secondary-btn");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });

    it("closes panel when clicking backdrop without changes", () => {
      renderComponent();

      const backdrop = document.querySelector(".bg-black.bg-opacity-50");
      if (backdrop) fireEvent.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Badge Type Changes", () => {
    it("resets form when badge type changes", () => {
      const { rerender } = renderComponent();

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Test Badge" } });

      rerender({ selectedBadgeType: "ACTIVE_DAY_STREAK" });

      const newNameInput = screen.getByPlaceholderText("Add name");
      expect(newNameInput).toHaveValue("");
    });

    it("updates category display when badge type changes", () => {
      const { rerender } = renderComponent({ selectedBadgeType: "SIMULATION_MINUTES" });

      expect(screen.getByText("Simulation Badges")).toBeInTheDocument();

      rerender({ selectedBadgeType: "ACTIVE_DAY_STREAK" });

      expect(screen.getByText("Momentum Badges")).toBeInTheDocument();
    });
  });

  describe("Achievement Params", () => {
    it("includes achievementParams in saved data", async () => {
      renderComponent();

      // Fill all required fields
      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");
      const criteriaInput = screen.getByPlaceholderText("0");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });
      fireEvent.change(criteriaInput, { target: { value: "60" } });

      // Upload an icon (required)
      const uploadBtn = screen.getByTestId("upload-btn");
      fireEvent.click(uploadBtn);

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateBadge).toHaveBeenCalledWith(
          expect.objectContaining({
            achievementParams: { count: 60 },
          }),
        );
      });
    });
  });

  describe("Edit Mode", () => {
    const mockSelectedBadge = {
      id: "badge-123",
      name: "Existing Badge",
      description: "Existing description",
      imageUrl: "https://cdn/existing-icon.png",
      status: "DRAFT",
      visibilityType: "PUBLIC" as const,
      category: "SIMULATION_MINUTES",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      roles: ["Admin"],
      achievementParams: { count: 30 },
      groupIds: [1],
    };

    it("displays 'Edit Badge' header when in edit mode", () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      expect(screen.getByText("Edit Badge")).toBeInTheDocument();
    });

    it("pre-fills form data when editing existing badge", () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const nameInput = screen.getByPlaceholderText("Add name");
      const criteriaInput = screen.getByPlaceholderText("0");

      expect(nameInput).toHaveValue("Existing Badge");
      expect(criteriaInput).toHaveValue(30);
    });

    it("calls updateBadge mutation when saving in edit mode", async () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Updated Badge" } });

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateBadge).toHaveBeenCalledWith({
          id: "badge-123",
          data: {
            name: "Updated Badge",
          },
        });
      });
    });

    it("calls updateBadge with ACTIVE status when publishing in edit mode", async () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Updated Badge" } });

      const publishButton = screen.getByText("Publish");
      fireEvent.click(publishButton);

      // Confirm publish in the confirmation popup
      const confirmButton = screen.getByTestId("primary-btn");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateBadge).toHaveBeenCalledWith({
          id: "badge-123",
          data: {
            name: "Updated Badge",
            status: "ACTIVE",
          },
        });
      });
    });

    it("displays delete button in edit mode", () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      expect(screen.getByText("Delete Badge")).toBeInTheDocument();
    });

    it("shows delete confirmation popup when delete button is clicked", () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const deleteButton = screen.getByText("Delete Badge");
      fireEvent.click(deleteButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();
      expect(screen.getByTestId("popup-title")).toHaveTextContent("Delete Badge?");
    });

    it("calls deleteBadge mutation when delete is confirmed", async () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const deleteButton = screen.getByText("Delete Badge");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("primary-btn");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteBadge).toHaveBeenCalledWith({ id: "badge-123" });
      });
    });

    it("closes delete confirmation popup when cancel is clicked", () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      const deleteButton = screen.getByText("Delete Badge");
      fireEvent.click(deleteButton);

      expect(screen.getByTestId("confirmation-popup")).toBeInTheDocument();

      const cancelButton = screen.getByTestId("secondary-btn");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("confirmation-popup")).not.toBeInTheDocument();
    });

    it("shows success toast after successful update", async () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      // Make a change to enable the save button (hasUnsavedChanges required in edit mode)
      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Updated Badge Name" } });

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalled();
      });
    });

    it("calls onSuccess callback after successful save", async () => {
      renderComponent({ selectedBadge: mockSelectedBadge });

      // Make a change to enable the save button (hasUnsavedChanges required in edit mode)
      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Updated Badge Name" } });

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("shows error toast when create mutation fails", async () => {
      mockCreateBadge.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error("Create failed")),
      });

      renderComponent({ selectedBadge: null });

      // Fill in all required fields
      const nameInput = screen.getByPlaceholderText("Add name");
      const descriptionInput = screen.getByPlaceholderText("Add description");

      fireEvent.change(nameInput, { target: { value: "Test Badge" } });
      fireEvent.change(descriptionInput, { target: { value: "Test description" } });

      // Upload an icon
      const uploadBtn = screen.getByTestId("upload-btn");
      fireEvent.click(uploadBtn);

      // Increment criteria count
      const incrementBtn = screen.getByTestId("criteria-increment-btn");
      fireEvent.click(incrementBtn);

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalled();
      });
    });

    it("shows error toast when update mutation fails", async () => {
      mockUpdateBadge.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error("Update failed")),
      });

      const mockSelectedBadgeForUpdate = {
        id: "badge-123",
        name: "Existing Badge",
        description: "Existing description",
        imageUrl: "https://cdn/icon.png",
        status: "DRAFT",
        visibilityType: "PRIVATE" as const,
        category: "SIMULATION_MINUTES",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        roles: [],
        groupIds: [1],
        achievementParams: { count: 10 },
      };

      renderComponent({ selectedBadge: mockSelectedBadgeForUpdate });

      // Make a change to enable the save button (hasUnsavedChanges)
      const nameInput = screen.getByPlaceholderText("Add name");
      fireEvent.change(nameInput, { target: { value: "Updated Badge Name" } });

      const saveButton = screen.getByText("Save as draft");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toastError).toHaveBeenCalled();
      });
    });
  });
});
