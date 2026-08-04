import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { FieldOptions, USER_MODAL_FIELDS_IDS, UserRole, KeyboardKeys } from "@constants";
import { FieldProps, UserListUser } from "@types";

import { UserModal } from "../UserModal";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  ImageUpload: ({ uploadButtonName, uploadTitle }: any) => (
    <div data-testid="image-upload">
      <span>{uploadTitle}</span>
      <button>{uploadButtonName}</button>
    </div>
  ),
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items?.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          data-active={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  TextArea: ({ labelText, hideLabel, ...props }: any) => (
    <textarea aria-label={labelText} {...props} />
  ),
}));

// Mock @components barrel import
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-testid={
        children === "Save" || children?.props?.children === "Save" || children === "Submit"
          ? "save-button"
          : "cancel-button"
      }
    >
      {children}
    </button>
  ),
  DropdownwithTag: ({ label, onChange, initialValue, options, placeholder, required }: any) => (
    <div data-testid="dropdown-with-tag">
      <label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        data-testid="dropdown-with-tag-select"
        onChange={(event: any) => {
          const selectedOptions = Array.from(
            event.target.selectedOptions,
            (option: any) => option.value,
          );
          onChange(selectedOptions);
        }}
        multiple
        defaultValue={initialValue}
      >
        {options.map((option: any) => (
          <option key={option.id || option.value} value={option.name || option.value}>
            {option.name || option.value}
          </option>
        ))}
      </select>
      {/* Deselecting every option in a jsdom multi-select doesn't reliably
          reach React's onChange, so expose the "no roles selected" transition
          directly — it is the contract the real component fulfils. */}
      <button data-testid="dropdown-with-tag-clear" onClick={() => onChange([])}>
        clear roles
      </button>
    </div>
  ),
  CustomDropdown: ({ label, onChange, value, options, placeholder, required }: any) => (
    <div data-testid="custom-dropdown">
      <label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        data-testid="custom-dropdown-select"
        value={value}
        onChange={(event: any) => onChange(event.target.value)}
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
  CreditField: ({ onChange, userData, value }: any) => (
    <div data-testid="credit-field">
      <input
        type="number"
        data-testid="credit-input"
        value={value}
        onChange={(event: any) => onChange(parseInt(event.target.value) || 0)}
      />
    </div>
  ),
  ProfileCard: ({ user }: any) => (
    <div data-testid="profile-card">
      {user.name} - {user.email}
    </div>
  ),
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          data-active={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  ToggleSwitch: ({ enabled, onChange }: any) => (
    <button
      data-testid="toggle-switch"
      data-enabled={enabled}
      onClick={onChange}
      role="switch"
      aria-checked={enabled}
    >
      {enabled ? "ON" : "OFF"}
    </button>
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

vi.mock("@constants", () => ({
  FieldOptions: {
    INPUT: "input",
    DROPDOWN: "dropdown",
    DROPDOWN_WITH_TAG: "dropdownWithTag",
    TEXTAREA: "textarea",
    CREDITS: "credits",
    DISABLED_FIELD: "disabledField",
  },
  USER_MODAL_FIELDS_IDS: {
    NAME: "name",
    EMAIL: "email",
    TENANTID: "tenantId",
    EXTERNALID: "externalId",
    ROLES: "roles",
    CREDITS: "simulationCreditLimit",
    ORGNAME: "orgname",
    ORGCODE: "orgcode",
    DESCRIPTION: "description",
    ORGLOGO: "orglogo",
    PROFILE: "profileImageUrl",
  },
  UserRole: {
    COUNSELLOR: "COUNSELOR",
    ADMIN: "ADMIN",
    LEARNER: "LEARNER",
    SUPER_ADMIN: "SUPER_ADMIN",
    CLIENT: "CLIENT",
    SIMULATION_REVIEWER: "SIMULATION_REVIEWER",
    SCRIBE_REVIEWER: "SCRIBE_REVIEWER",
    MULTI_TENANT_ADMIN: "MULTI_TENANT_ADMIN",
  },
  KeyboardKeys: {
    ESCAPE: "Escape",
    KEYDOWN: "keydown",
  },
  en: {
    common: {
      enabled: "Enabled",
      disabled: "Disabled",
    },
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
}));

// Mock button types
vi.mock("../types", () => ({
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    DESTRUCTIVE: "destructive",
  },
}));

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

      expect(screen.getByTestId("cancel-button")).toHaveTextContent("Cancel");
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

      expect(screen.getByTestId("save-button")).toHaveTextContent("Save");
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

      expect(screen.getByTestId("save-button")).toHaveTextContent("Submit");
    });

    it("renders extra content when provided", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Test Modal"
              fields={basicFields}
              formMethods={formMethods}
              extraContent={<div data-testid="extra-content">Extra Content</div>}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("extra-content")).toBeInTheDocument();
      expect(screen.getByText("Extra Content")).toBeInTheDocument();
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
        profileImageUrl: "https://example.com/profile.jpg",
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

    // A platform account holds roles this picker deliberately never offers
    // (the super-admin tier lives on the Super Admins tab). Seeding them would
    // render a tag that can be seen but never removed, and submitting would
    // drop them.
    describe("roles the picker does not offer", () => {
      const rolesField: FieldProps[] = [
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

      const platformAccount = (roles: string[]): UserListUser =>
        ({
          id: 1,
          name: "Ally Staffer",
          email: "staff@helloally.ai",
          username: "staff",
          status: "ACTIVE",
          role: "SUPER_DUPER_ADMIN",
          metadata: {},
          organization: "Test Org",
          tenantId: "tenant1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          roles,
        }) as UserListUser;

      let form: any = null;
      const renderRolesModal = (user: UserListUser) => {
        form = null;
        return render(
          <TestWrapper defaultValues={{ roles: user.roles ?? [] }}>
            {(formMethods: any) => {
              form = formMethods;
              return (
                <UserModal
                  isOpen={true}
                  onClose={mockOnClose}
                  title="Change User Role"
                  fields={rolesField}
                  formMethods={formMethods}
                  details={user}
                  handleClick={mockHandleClick}
                />
              );
            }}
          </TestWrapper>,
        );
      };

      /** Clear every selection — how the last app role comes off an account. */
      const deselectAll = () => fireEvent.click(screen.getByTestId("dropdown-with-tag-clear"));

      it("seeds the picker only with roles it can actually manage", () => {
        renderRolesModal(platformAccount(["SUPER_DUPER_ADMIN", "LEARNER"]));

        const select = screen.getByTestId("dropdown-with-tag-select") as HTMLSelectElement;
        const selected = Array.from(select.selectedOptions).map(option => option.value);
        expect(selected).toEqual(["LEARNER"]);
      });

      it("accepts an empty selection when an unoffered role is held", async () => {
        renderRolesModal(platformAccount(["SUPER_DUPER_ADMIN", "LEARNER"]));

        deselectAll();

        await waitFor(async () => expect(await form.trigger()).toBe(true));
        expect(form.getValues().roles).toEqual([]);
        expect(form.formState.errors.roles).toBeUndefined();
      });

      it("still requires a role for an ordinary account", async () => {
        renderRolesModal(platformAccount(["LEARNER"]));

        deselectAll();

        await waitFor(async () => expect(await form.trigger()).toBe(false));
        // Text comes from the @constants mock at the top of this file.
        expect(form.formState.errors.roles?.message).toBe("Please select at least one role");
        expect(screen.getByTestId("save-button")).toBeDisabled();
      });
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
        profileImageUrl: "https://example.com/profile.jpg",
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
        <TestWrapper defaultValues={{ roles: [UserRole.LEARNER] }}>
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

      fireEvent.keyDown(document, { key: "Escape" });

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

      fireEvent.click(screen.getByTestId("cancel-button"));

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
        profileImageUrl: "https://example.com/profile.jpg",
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
        profileImageUrl: "https://example.com/profile.jpg",
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

      if (backdrop) {
        fireEvent.mouseDown(backdrop);
        fireEvent.mouseUp(backdrop);
      }

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("does not close modal when clicking inside modal content", () => {
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
        expect(screen.getByText("Maximum 100 characters allowed")).toBeInTheDocument();
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
        expect(nameInput).toHaveClass("border-destructive-500");
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

  describe("Settings tab with optionValues", () => {
    const tabOptions = [
      { id: "details", label: "Details" },
      { id: "settings", label: "Settings" },
    ];

    const mockOptionValues = [
      {
        id: "dashboard-1",
        value: true,
        label: "Enable Call Analytics",
        onClick: vi.fn(),
      },
      {
        id: "enableMicrophoneMode",
        value: false,
        label: "Enable Microphone Mode",
        onClick: vi.fn(),
      },
      {
        id: "enableAudioUpload",
        value: true,
        label: "Enable Audio Upload",
        onClick: vi.fn(),
      },
      {
        id: "hideRankInCommunity",
        value: false,
        label: "Hide Rank in Leaderboard",
        onClick: vi.fn(),
      },
    ];

    beforeEach(() => {
      mockOptionValues.forEach(option => option.onClick.mockClear());
    });

    it("renders tabs when hasTabs is true", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByTestId("tab-details")).toBeInTheDocument();
      expect(screen.getByTestId("tab-settings")).toBeInTheDocument();
    });

    it("shows settings tab content when settings tab is clicked", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      // Click settings tab
      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        expect(screen.getByText("Enable Call Analytics")).toBeInTheDocument();
        expect(screen.getByText("Enable Microphone Mode")).toBeInTheDocument();
        expect(screen.getByText("Enable Audio Upload")).toBeInTheDocument();
        expect(screen.getByText("Hide Rank in Leaderboard")).toBeInTheDocument();
      });
    });

    it("renders toggle switches with correct initial values from optionValues", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      // Click settings tab to view toggle switches
      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        const toggleSwitches = screen.getAllByTestId("toggle-switch");
        expect(toggleSwitches).toHaveLength(4);

        // Check initial values are reflected
        expect(toggleSwitches[0]).toHaveAttribute("data-enabled", "true"); // dashboard-1: true
        expect(toggleSwitches[1]).toHaveAttribute("data-enabled", "false"); // enableMicrophoneMode: false
        expect(toggleSwitches[2]).toHaveAttribute("data-enabled", "true"); // enableAudioUpload: true
        expect(toggleSwitches[3]).toHaveAttribute("data-enabled", "false"); // hideRankInCommunity: false
      });
    });

    it("calls onClick handler when toggle switch is clicked", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      // Click settings tab
      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        const toggleSwitches = screen.getAllByTestId("toggle-switch");
        // Click the second toggle (enableMicrophoneMode - currently false)
        fireEvent.click(toggleSwitches[1]);
      });

      // onClick should be called with the opposite value (true since it was false)
      expect(mockOptionValues[1].onClick).toHaveBeenCalledWith(true);
    });

    it("displays Enabled text for enabled settings", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        // Two options are enabled (dashboard-1 and enableAudioUpload)
        const enabledTexts = screen.getAllByText("Enabled");
        expect(enabledTexts).toHaveLength(2);
      });
    });

    it("displays Disabled text for disabled settings", async () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={mockOptionValues}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        // Two options are disabled (enableMicrophoneMode and hideRankInCommunity)
        const disabledTexts = screen.getAllByText("Disabled");
        expect(disabledTexts).toHaveLength(2);
      });
    });

    it("save button becomes enabled when settings are changed and form is dirty", async () => {
      const TestComponent = () => {
        const formMethods = useForm({
          defaultValues: {
            orgname: "Test Org",
            orgcode: "TEST",
            enableMicrophoneMode: false,
            enableAudioUpload: false,
            hideRankInCommunity: false,
            enabledDashboardIds: [],
          },
          mode: "onChange",
        });

        const handleSettingToggle = (settingId: string, value: boolean) => {
          formMethods.setValue(settingId as any, value, { shouldDirty: true });
        };

        const optionValuesWithFormIntegration = [
          {
            id: "enableMicrophoneMode",
            value: formMethods.watch("enableMicrophoneMode"),
            label: "Enable Microphone Mode",
            onClick: (enabled: boolean) => handleSettingToggle("enableMicrophoneMode", enabled),
          },
        ];

        return (
          <UserModal
            isOpen={true}
            onClose={mockOnClose}
            title="Edit Organization"
            fields={[
              {
                id: "orgname",
                label: "Organization Name",
                placeholder: "Enter name",
                fieldType: FieldOptions.INPUT,
                inputType: "text",
                required: true,
                maxLength: 100,
              },
            ]}
            formMethods={formMethods}
            hasTabs={true}
            tabOptions={tabOptions}
            optionValues={optionValuesWithFormIntegration}
          />
        );
      };

      render(<TestComponent />);

      // Initially save button should be disabled (form not dirty)
      expect(screen.getByTestId("save-button")).toBeDisabled();

      // Click settings tab
      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        const toggleSwitch = screen.getByTestId("toggle-switch");
        fireEvent.click(toggleSwitch);
      });

      // After toggling, form should be dirty and save button enabled
      await waitFor(() => {
        expect(screen.getByTestId("save-button")).not.toBeDisabled();
      });
    });

    it("reflects API initial values in settings toggles when editing", async () => {
      // Simulate API data with specific settings values
      const apiTenantData = {
        id: "tenant-123",
        enableMicrophoneMode: true,
        enableAudioUpload: false,
        hideRankInCommunity: true,
        enabledDashboardIds: ["dashboard-1", "dashboard-2"],
      };

      const optionValuesFromAPI = [
        {
          id: "dashboard-1",
          value: apiTenantData.enabledDashboardIds.includes("dashboard-1"),
          label: "Dashboard 1",
          onClick: vi.fn(),
        },
        {
          id: "enableMicrophoneMode",
          value: apiTenantData.enableMicrophoneMode,
          label: "Enable Microphone Mode",
          onClick: vi.fn(),
        },
        {
          id: "enableAudioUpload",
          value: apiTenantData.enableAudioUpload,
          label: "Enable Audio Upload",
          onClick: vi.fn(),
        },
        {
          id: "hideRankInCommunity",
          value: apiTenantData.hideRankInCommunity,
          label: "Hide Rank in Leaderboard",
          onClick: vi.fn(),
        },
      ];

      render(
        <TestWrapper
          defaultValues={{
            enableMicrophoneMode: apiTenantData.enableMicrophoneMode,
            enableAudioUpload: apiTenantData.enableAudioUpload,
            hideRankInCommunity: apiTenantData.hideRankInCommunity,
            enabledDashboardIds: apiTenantData.enabledDashboardIds,
          }}
        >
          {(formMethods: any) => (
            <UserModal
              isOpen={true}
              onClose={mockOnClose}
              title="Edit Organization"
              fields={basicFields}
              formMethods={formMethods}
              hasTabs={true}
              tabOptions={tabOptions}
              optionValues={optionValuesFromAPI}
              details={apiTenantData}
            />
          )}
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("tab-settings"));

      await waitFor(() => {
        const toggleSwitches = screen.getAllByTestId("toggle-switch");

        // Verify toggles reflect API values
        expect(toggleSwitches[0]).toHaveAttribute("data-enabled", "true"); // dashboard-1 in enabledDashboardIds
        expect(toggleSwitches[1]).toHaveAttribute("data-enabled", "true"); // enableMicrophoneMode: true
        expect(toggleSwitches[2]).toHaveAttribute("data-enabled", "false"); // enableAudioUpload: false
        expect(toggleSwitches[3]).toHaveAttribute("data-enabled", "true"); // hideRankInCommunity: true
      });
    });
  });
});
