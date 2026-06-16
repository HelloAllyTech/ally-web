export enum CallType {
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
}

export enum LoginSection {
  EMAIL = "Email",
  OTP = "OTP",
}

export enum FieldOptions {
  INPUT = "input",
  DROPDOWN = "dropdown",
  DROPDOWN_WITH_TAG = "dropdownWithTag",
  TEXTAREA = "textarea",
  CREDITS = "credits",
  DISABLED_FIELD = "disabledField",
}

export enum UserMenuOptions {
  EDIT_DETAILS = "Edit details",
  CHANGE_ROLE = "Change role",
  MANAGE_CREDITS = "Manage credits",
  SUSPEND_USER = "Suspend user",
  GRANT_ACCESS = "Grant access",
  REMOVE_USER = "Remove user",
  IMPERSONATE_USER = "Impersonate user",
}

export const USER_MODAL_FIELDS_IDS = {
  NAME: "name",
  EMAIL: "email",
  EMAILS: "emails",
  TENANTID: "tenantId",
  EXTERNALID: "externalId",
  ROLES: "roles",
  CREDITS: "simulationCreditLimit",
  ORGNAME: "orgname",
  ORGCODE: "orgcode",
  DESCRIPTION: "description",
  ORGLOGO: "orglogo",
  PROFILE: "profileImageUrl",
};

export const userEditMenu = [
  UserMenuOptions.EDIT_DETAILS,
  UserMenuOptions.CHANGE_ROLE,
  UserMenuOptions.MANAGE_CREDITS,
  UserMenuOptions.GRANT_ACCESS,
  UserMenuOptions.IMPERSONATE_USER,
  UserMenuOptions.SUSPEND_USER,
  // UserMenuOptions.REMOVE_USER, // TODO: Add this after backend change for delete user is implemented
];

export const addUser = [
  {
    id: USER_MODAL_FIELDS_IDS.NAME,
    label: "Name",
    placeholder: "Enter full name",
    fieldType: "input",
    inputType: "text",
    maxLength: 100,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.EMAIL,
    label: "Email",
    placeholder: "Enter email address",
    fieldType: "input",
    inputType: "email",
    maxLength: 100,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.EXTERNALID,
    label: "Cloud Telephony ID",
    placeholder: "Enter ID",
    fieldType: "input",
    inputType: "text",
    maxLength: 50,
  },
  {
    id: USER_MODAL_FIELDS_IDS.TENANTID,
    label: "Assign Organization",
    placeholder: "Select Organization",
    fieldType: "dropdown",
    inputType: "text",
    options: [],
    maxLength: 50,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.ROLES,
    label: "Role access",
    placeholder: "Select Role",
    options: [],
    fieldType: "dropdownWithTag",
    inputType: "text",
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.CREDITS,
    label: "Simulation Credits",
    inputType: "number",
    fieldType: "input",
    placeholder: "20",
    maxLength: 10,
    required: true,
  },
];

export const bulkAddUser = [
  {
    id: USER_MODAL_FIELDS_IDS.EMAILS,
    label: "Email addresses",
    placeholder: "Enter one email per line, or separate with commas",
    fieldType: "textarea",
    inputType: "text",
    maxLength: 20000,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.TENANTID,
    label: "Assign Organization",
    placeholder: "Select Organization",
    fieldType: "dropdown",
    inputType: "text",
    options: [],
    maxLength: 50,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.ROLES,
    label: "Role access",
    placeholder: "Select Role",
    options: [],
    fieldType: "dropdownWithTag",
    inputType: "text",
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.CREDITS,
    label: "Simulation Credits",
    inputType: "number",
    fieldType: "input",
    placeholder: "20",
    maxLength: 10,
    required: true,
  },
];

export const userEditModal = [
  {
    id: USER_MODAL_FIELDS_IDS.NAME,
    label: "Name",
    placeholder: "eg:User 01",
    fieldType: "input",
    inputType: "text",
    maxLength: 100,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.EMAIL,
    label: "Email",
    placeholder: "jorge.ortiz@sample.com",
    fieldType: "input",
    inputType: "email",
    maxLength: 100,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.EXTERNALID,
    label: "Cloud Telephony ID",
    placeholder: "TEL002",
    fieldType: "input",
    inputType: "text",
    maxLength: 50,
    required: false,
  },
];

export const changeUserRoles = [
  {
    id: USER_MODAL_FIELDS_IDS.ROLES,
    label: "Change to",
    placeholder: "eg:User 01",
    fieldType: "dropdownWithTag",
    inputType: "text",
    options: [],
    required: true,
  },
];

export const addCredit = [
  {
    id: USER_MODAL_FIELDS_IDS.CREDITS,
    label: "Add credits",
    placeholder: "0",
    fieldType: "credits",
    inputType: "number",
    maxLength: 10000, // TODO: What is the max credit limit?
    required: true,
  },
];

export const addNewOrganizationModal = [
  {
    id: USER_MODAL_FIELDS_IDS.ORGNAME,
    label: "Name",
    placeholder: "Enter Organization name",
    fieldType: "input",
    inputType: "text",
    maxLength: 100,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.ORGCODE,
    label: "Organization code",
    placeholder: "Enter code",
    fieldType: "input",
    inputType: "text",
    maxLength: 50,
    required: true,
  },
  {
    id: USER_MODAL_FIELDS_IDS.DESCRIPTION,
    label: "Description",
    placeholder: "Add description",
    fieldType: "textarea",
    inputType: "text",
    maxLength: 500,
    required: false,
  },
];
export const userRoleItems = ["COUNSELOR", "ADMIN", "LEARNER", "MULTI_TENANT_ADMIN"];
export const userStatusItems = ["ACTIVE", "SUSPENDED"];

export enum FilterDropdownOptions {
  ORGANIZATION = "Organisation",
  ROLE = "Role",
  STATUS = "Status",
}

export enum userStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum fieldType {
  INPUT = "input",
  DROPDOWN = "dropdown",
  DROPDOWN_WITH_TAG = "dropdownWithTag",
  TEXTAREA = "textarea",
}

export enum fieldId {
  NAME = "name",
  EMAIL = "email",
  TENANTID = "tenantId",
  ROLES = "roles",
  CREDITS = "credits",
}

export enum UserRole {
  COUNSELLOR = "COUNSELOR",
  ADMIN = "ADMIN",
  LEARNER = "LEARNER",
  SUPER_ADMIN = "SUPER_ADMIN",
  CLIENT = "CLIENT",
  SIMULATION_REVIEWER = "SIMULATION_REVIEWER",
  SCRIBE_REVIEWER = "SCRIBE_REVIEWER",
  MULTI_TENANT_ADMIN = "MULTI_TENANT_ADMIN",
}

export enum AppType {
  ADMIN = "ADMIN",
  APP = "APP",
}
