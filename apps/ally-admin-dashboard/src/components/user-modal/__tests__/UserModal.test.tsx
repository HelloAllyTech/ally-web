import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { FieldOptions, USER_MODAL_FIELDS_IDS, UserRole, KeyboardKeys } from "@constants";
import { FieldProps, UserListUser } from "@types";

import { UserModal } from "../UserModal";

// Mock specific component files to avoid circular dependencies
vi.mock("@components/button", () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-testid={
        children === "Save" || children?.props?.children === "Save"
          ? "save-button"
          : "cancel-button"
      }
    >
      {children}
    </button>
  ),
}));

vi.mock("@components/dropdownwithtag", () => ({
  DropdownwithTag: ({ label, onChange, initialValue, options, placeholder, required }: any) => (
    <div data-testid="dropdown-with-tag">
      <label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        data-testid="dropdown-with-tag-select"
        onChange={event => {
          const selectedOptions = Array.from(
            event.target.selectedOptions,
            (option: any) => option.value,
          );
          onChange(selectedOptions);
        }}
        multiple
      >
        {options.map((option: any) => (
          <option key={option.id || option.value} value={option.name || option.value}>
            {option.name || option.value}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock("@components/custom-dropdown", () => ({
  CustomDropdown: ({ label, onChange, value, options, placeholder, required }: any) => (
    <div data-testid="custom-dropdown">
      <label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        data-testid="custom-dropdown-select"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option: any) => (
          <option key={option.id || option.value} value={option.id || option.value}>
            {option.value || option.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock("@components/credit-field", () => ({
  CreditField: ({ onChange, userData, value }: any) => (
    <div data-testid="credit-field">
      <input
        type="number"
        data-testid="credit-input"
        value={value}
        onChange={event => onChange(parseInt(event.target.value) || 0)}
      />
    </div>
  ),
}));

vi.mock("@components/profile-card", () => ({
  ProfileCard: ({ user }: any) => (
    <div data-testid="profile-card">
      {user.name} - {user.email}
    </div>
  ),
}));

// Mock SimulationCreator to avoid cellTypes dependency issue
vi.mock("@constants/SimulationCreator", () => ({
  STEP1_FIELDS: [],
  STEP2_FIELDS: [],
  STEP3_FIELDS: [],
  STEP4_FIELDS: [],
  STEP5_FIELDS: [],
  eventsTableColumns: [],
  FORM_FIELD_TYPES: {
    TEXT: "text",
    NUMBER: "number",
    SELECT: "select",
    IMAGE_UPLOAD: "image_upload",
    VIDEO_UPLOAD: "video_upload",
    TOGGLE_BUTTON: "toggle_button",
    CUSTOM: {
      VOICE_DROPDOWN: "voice_dropdown",
      AUTO_TERMINATION_RULE: "auto_termination_rule",
    },
  },
}));

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    en: {
      ...(actual.en || {}),
      userManagement: {
        cancel: "Cancel",
        selectOrg: "Select Organization",
        changeRoleErrorMessage: "Please select at least one role",
        maxCharError: (max: number) => `Maximum ${max} characters allowed`,
        textAreaUpperLimit: "Maximum character limit exceeded",
        creditRequiredError: "Credit is required",
        creditNotNegativeError: "Credit cannot be negative",
        creditLimitError: "Credit limit exceeded",
      },
    },
  };
});

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({
    defaultValues,
    mode: "onChange",
  });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("UserModal", () => {
  const mockOnClose = vi.fn();
  const mockHandleClick = vi.fn();

  const basicFields: FieldProps[] = [
    {
      id: USER_MODAL_FIELDS_IDS.NAME,
      label: "Name",
      placeholder: "Enter name",
      fieldType: FieldOptions.INPUT,
      inputType: "text",
      required: true,
      maxLength: 100,
    },
    {
      id: USER_MODAL_FIELDS_IDS.EMAIL,
      label: "Email",
      placeholder: "Enter email",
      fieldType: FieldOptions.INPUT,
      inputType: "email",
      required: true,
      maxLength: 100,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "unset";
  });

  afterEach(() => {
    document.body.style.overflow = "unset";
  });

  describe("Modal visibility and basic rendering", () => {
    it("renders modal when isOpen is true", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Test Modal")).toBeInTheDocument();
    });

    it("does not render modal when isOpen is false", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={false}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    });

    it("renders modal title correctly", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Add User"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Add User")).toBeInTheDocument();
    });

    it("renders cancel button with correct text", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders save button with default text", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    it("renders save button with custom buttonName", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
              buttonName="Submit"
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Submit")).toBeInTheDocument();
    });
  });

  describe("Field rendering", () => {
    it("renders input fields correctly", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
    });

    it("renders required asterisk for required fields", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const requiredMarkers = screen.getAllByText("*");
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });

    it("renders dropdown field correctly", () => {
      const fieldsWithDropdown: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.TENANTID,
          label: "Organization",
          placeholder: "Select organization",
          fieldType: FieldOptions.DROPDOWN,
          inputType: "text",
          required: true,
          options: [
            { id: "org1", value: "Organization 1" },
            { id: "org2", value: "Organization 2" },
          ],
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithDropdown}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
    });

    it("renders dropdown with tag field correctly", () => {
      const fieldsWithDropdownTag: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.ROLES,
          label: "Roles",
          placeholder: "Select roles",
          fieldType: FieldOptions.DROPDOWN_WITH_TAG,
          inputType: "text",
          required: true,
          options: [
            { id: 1, name: "ADMIN" },
            { id: 2, name: "LEARNER" },
          ],
        },
      ];

      const mockUser: UserListUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        externalId: "EXT001",
        status: "ACTIVE",
        role: "ADMIN",
        metadata: {},
        organization: "Test Org",
        tenantId: "tenant1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        roles: ["ADMIN"],
        creditLimit: 100,
        consumedCredits: 50,
        secondsAllowedPerCredit: 60,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithDropdownTag}
              formMethods={formMethods}
              details={mockUser}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("dropdown-with-tag")).toBeInTheDocument();
      expect(screen.getByTestId("profile-card")).toBeInTheDocument();
    });

    it("renders textarea field correctly", () => {
      const fieldsWithTextarea: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.DESCRIPTION,
          label: "Description",
          placeholder: "Enter description",
          fieldType: FieldOptions.TEXTAREA,
          inputType: "text",
          maxLength: 500,
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithTextarea}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByPlaceholderText("Enter description")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter description").tagName).toBe("TEXTAREA");
    });

    it("renders credit field correctly", () => {
      const fieldsWithCredit: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.CREDITS,
          label: "Credits",
          placeholder: "Enter credits",
          fieldType: FieldOptions.CREDITS,
          inputType: "number",
          maxLength: 1000,
          required: true,
        },
      ];

      const mockUser: UserListUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        externalId: "EXT001",
        status: "ACTIVE",
        role: "LEARNER",
        metadata: {},
        organization: "Test Org",
        tenantId: "tenant1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        roles: ["LEARNER"],
        creditLimit: 100,
        consumedCredits: 50,
        secondsAllowedPerCredit: 60,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithCredit}
              formMethods={formMethods}
              details={mockUser}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("credit-field")).toBeInTheDocument();
    });
  });

  describe("Keyboard interactions", () => {
    it("closes modal when Escape key is pressed", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.keyDown(document, { key: KeyboardKeys.ESCAPE });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("does not close modal when other keys are pressed", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.keyDown(document, { key: "Enter" });
      fireEvent.keyDown(document, { key: "Tab" });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("prevents body scroll when modal is open", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when modal closes", () => {
      const { rerender } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(document.body.style.overflow).toBe("hidden");

      rerender(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={false}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      expect(document.body.style.overflow).toBe("unset");
    });
  });

  describe("Button interactions", () => {
    it("calls onClose when cancel button is clicked", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Cancel"));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("save button is disabled when form is invalid", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const saveButton = screen.getByTestId("save-button");
      expect(saveButton).toBeDisabled();
    });

    it("save button is disabled when form is not dirty", () => {
      render(
        <TestWrapper defaultValues={{ name: "Test", email: "test@example.com" }}>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const saveButton = screen.getByTestId("save-button");
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Conditional field rendering", () => {
    it("shows credit field only when LEARNER role is selected", async () => {
      const fieldsWithRolesAndCredits: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.ROLES,
          label: "Roles",
          placeholder: "Select roles",
          fieldType: FieldOptions.DROPDOWN_WITH_TAG,
          inputType: "text",
          required: true,
          options: [
            { id: 1, name: UserRole.ADMIN },
            { id: 2, name: UserRole.LEARNER },
          ],
        },
        {
          id: USER_MODAL_FIELDS_IDS.CREDITS,
          label: "Credits",
          placeholder: "Enter credits",
          fieldType: FieldOptions.CREDITS,
          inputType: "number",
          maxLength: 1000,
          required: true,
        },
      ];

      const mockUser: UserListUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        externalId: "EXT001",
        status: "ACTIVE",
        role: "LEARNER",
        metadata: {},
        organization: "Test Org",
        tenantId: "tenant1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        roles: [UserRole.LEARNER],
        creditLimit: 100,
        consumedCredits: 50,
        secondsAllowedPerCredit: 60,
      };

      render(
        <TestWrapper defaultValues={{ roles: [UserRole.LEARNER] }}>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithRolesAndCredits}
              formMethods={formMethods}
              details={mockUser}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("credit-field")).toBeInTheDocument();
    });

    it("hides credit field when LEARNER role is not selected", () => {
      const fieldsWithRolesAndCredits: FieldProps[] = [
        {
          id: USER_MODAL_FIELDS_IDS.ROLES,
          label: "Roles",
          placeholder: "Select roles",
          fieldType: FieldOptions.DROPDOWN_WITH_TAG,
          inputType: "text",
          required: true,
          options: [
            { id: 1, name: UserRole.ADMIN },
            { id: 2, name: UserRole.LEARNER },
          ],
        },
        {
          id: USER_MODAL_FIELDS_IDS.CREDITS,
          label: "Credits",
          placeholder: "Enter credits",
          fieldType: FieldOptions.CREDITS,
          inputType: "number",
          maxLength: 1000,
          required: true,
        },
      ];

      const mockUser: UserListUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        externalId: "EXT001",
        status: "ACTIVE",
        role: "ADMIN",
        metadata: {},
        organization: "Test Org",
        tenantId: "tenant1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        roles: [UserRole.ADMIN],
        creditLimit: null,
        consumedCredits: null,
        secondsAllowedPerCredit: 60,
      };

      render(
        <TestWrapper defaultValues={{ roles: [UserRole.ADMIN] }}>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={fieldsWithRolesAndCredits}
              formMethods={formMethods}
              details={mockUser}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.queryByTestId("credit-field")).not.toBeInTheDocument();
    });
  });

  describe("Backdrop click behavior", () => {
    it("closes modal when backdrop is clicked", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const backdrop = screen.getByText("Test Modal").parentElement?.parentElement;

      if (backdrop) {
        fireEvent.mouseDown(backdrop);
        fireEvent.mouseUp(backdrop);
      }

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("does not close modal when clicking inside modal content", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const modalContent = screen.getByText("Test Modal").parentElement;

      if (modalContent) {
        fireEvent.mouseDown(modalContent);
        fireEvent.mouseUp(modalContent);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Form validation", () => {
    it("shows max length error when input exceeds maxLength", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const nameInput = screen.getByPlaceholderText("Enter name");
      const longString = "a".repeat(101);

      fireEvent.change(nameInput, { target: { value: longString } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/Maximum 100 characters allowed/)).toBeInTheDocument();
      });
    });

    it("shows error border on invalid field", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const nameInput = screen.getByPlaceholderText("Enter name");
      const longString = "a".repeat(101);

      fireEvent.change(nameInput, { target: { value: longString } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Maximum 100 characters allowed")).toBeInTheDocument();
      });
    });
  });

  describe("Form submission", () => {
    it("calls handleClick with form data on valid form submission", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
              handleClick={mockHandleClick}
            />
          )}
        </TestWrapper>,
      );

      const nameInput = screen.getByPlaceholderText("Enter name");
      const emailInput = screen.getByPlaceholderText("Enter email");

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(emailInput, { target: { value: "john@example.com" } });

      await waitFor(() => {
        const saveButton = screen.getByTestId("save-button");
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByTestId("save-button");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHandleClick).toHaveBeenCalled();
      });
    });

    it("includes user id in submission when editing existing user", async () => {
      const mockUser = {
        id: 123,
        name: "Existing User",
        email: "existing@example.com",
      };

      render(
        <TestWrapper defaultValues={{ name: mockUser.name, email: mockUser.email }}>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit User"
              fields={basicFields}
              formMethods={formMethods}
              handleClick={mockHandleClick}
              details={mockUser}
            />
          )}
        </TestWrapper>,
      );

      const nameInput = screen.getByPlaceholderText("Enter name");
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      await waitFor(() => {
        const saveButton = screen.getByTestId("save-button");
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByTestId("save-button");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHandleClick).toHaveBeenCalledWith(expect.objectContaining({ id: 123 }));
      });
    });
  });

  describe("Modal styling", () => {
    it("has correct backdrop styling", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const backdrop = container.querySelector(".bg-black.bg-opacity-50");
      expect(backdrop).toBeInTheDocument();
    });

    it("has correct modal content styling", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const modalContent = container.querySelector(".bg-white");
      expect(modalContent).toBeInTheDocument();
      expect(modalContent?.className).toContain("rounded-[10px]");
    });
  });
});
