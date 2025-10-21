export enum CallType {
  WEBRTC_CHAT = "WEBRTC_CHAT",
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
  EXOTEL_CONFERENCE_CHAT = "EXOTEL_CONFERENCE_CHAT",
}

export enum Permissions {
  VIEW_NAVBAR_CALLS = "view:navbar:calls",
  VIEW_NAVBAR_CALENDAR = "view:navbar:calendar",
  VIEW_NAVBAR_LEARN = "view:navbar:learn",
  VIEW_NAVBAR_STRESS_BUSTER = "view:navbar:stress-buster",
  VIEW_NAVBAR_SETTINGS = "view:navbar:settings",
  VIEW_NAVBAR_ANALYTICS = "view:navbar:analytics",
  VIEW_NAVBAR_COMMUNITY = "view:navbar:community",
  EDIT_SUMMARY = "edit:summary",
  VIEW_START_CALL_PAGE = "view:button:start-call",
  VIEW_NAVBAR_SEARCH = "view:navbar:search",
  VIEW_SCENARIO_SESSION = "view:scenario-session", //  view permission to have session logs
  VIEW_ADMIN_SCENARIO_SESSION = "view:admin:scenario-session", // view permission to have session logs for admin
  VIEW_SCENARIO_SESSION_SUMMARY = "view:scenario-session:summary",
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
}

export enum UserMenuOptions {
  EDIT_DETAILS = "Edit Details",
  CHANGE_ROLE = "Change Role",
  ADD_CREDIT = "Add Credit",
  SUSPEND_USER = "Suspend User",
  ACTIVATE_USER = "Activate User",
  REMOVE_USER = "Remove User",
}

export const addUser = [
  {
    id: "name",
    label: "Name",
    placeholder: "User 01",
    fieldType: "input",
    inputType: "text",
  },
  {
    id: "email",
    label: "Email",
    placeholder: "example.user@gmail.com",
    fieldType: "input",
    inputType: "email",
  },
  {
    id: "telephonyId",
    label: "Cloud Telephony ID",
    placeholder: "TEL002",
    fieldType: "input",
    inputType: "text",
  },
  {
    id: "tenantId",
    label: "Assign Organization",
    placeholder: "Lifeline",
    fieldType: "dropdown",
    inputType: "text",
    options: [],
  },
  {
    id: "roles",
    label: "Role access",
    options: [],
    fieldType: "dropdownWithTag",
    inputType: "text",
  },
  {
    id: "credits",
    label: "Simulation Credits",
    inputType: "number",
    fieldType: "input",
    placeholder: "0",
  },
];

export const userEditMenu = [
  { id: UserMenuOptions.EDIT_DETAILS, label: "Edit Details" },
  { id: UserMenuOptions.CHANGE_ROLE, label: "Change Role" },
  { id: UserMenuOptions.ADD_CREDIT, label: "Add Credit" },
  { id: UserMenuOptions.SUSPEND_USER, label: "Suspend User" },
  { id: UserMenuOptions.ACTIVATE_USER, label: "Activate User" },
  // { id: UserMenuOptions.REMOVE_USER, label: "Remove User" }, // TODO: Add this after backend change for delete user is implemented
];

export const userEditModal = [
  {
    id: "name",
    label: "Name",
    placeholder: "eg:User 01",
    fieldType: "input",
    inputType: "text",
  },
  {
    id: "email",
    label: "Email",
    placeholder: "jorge.ortiz@sample.com",
    fieldType: "input",
    inputType: "email",
  },
  {
    id: "telephonyId",
    label: "Cloud Telephony ID",
    placeholder: "TEL002",
    fieldType: "input",
    inputType: "text",
  },
];

export const changeUserRoles = [
  {
    id: "roles",
    label: "Change to",
    placeholder: "eg:User 01",
    fieldType: "dropdownWithTag",
    inputType: "text",
    options: [],
  },
];

export const addNewOrganizationModal = [
  {
    id: "name",
    label: "Name",
    placeholder: "Enter Organization name",
    fieldType: "input",
    inputType: "text",
  },
  {
    id: "description",
    label: "Description",
    placeholder: "Add description",
    fieldType: "textarea",
    inputType: "text",
  },
];
export const userRoleItems = ["CLIENT", "COUNSELOR", "SUPER_ADMIN", "ADMIN", "LEARNER"];
export const userStatusItems = ["ACTIVE", "INACTIVE", "BLOCKED", "SUSPENDED"];

export const filterDropdownOptions = {
  ORGANIZATION: "Organisation",
  ROLE: "Role",
  STATUS: "Status",
};

export enum userStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
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
  TELEPHONY_ID = "telephonyId",
  TENANTID = "tenantId",
  ROLES = "roles",
  CREDITS = "credits",
}
