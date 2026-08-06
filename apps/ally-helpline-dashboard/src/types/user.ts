export interface User {
  profileImageUrl?: string;
  email: string;
  id: number;
  name: string;
  /**
   * The single role the backend collapses a user's roles down to. Lossy for
   * anyone holding more than one — read `roles` when testing for a specific
   * role.
   */
  role: UserRole;
  /** Every role the user holds. Absent on responses predating the field. */
  roles?: UserRole[];
  userId: number;
  status: string;
  // False for accounts created in bulk by an admin (no name yet); gates the
  // user into the Complete Profile screen on first login.
  profileCompleted?: boolean;
}

export enum UserRole {
  COUNSELLOR = "COUNSELOR",
  ADMIN = "ADMIN",
  LEARNER = "LEARNER",
  SCRIBE_REVIEWER = "SCRIBE_REVIEWER",
  SIMULATION_REVIEWER = "SIMULATION_REVIEWER",
  // Platform/admin-console roles. A consumer account can hold one of these
  // alongside its consumer role (roles are additive on a single user record),
  // so they arrive on `roles` here even though none of them can log *into*
  // this app on their own — see ALLY_ADMIN_ROLES in @constants.
  SUPER_ADMIN = "SUPER_ADMIN",
  SUPER_DUPER_ADMIN = "SUPER_DUPER_ADMIN",
  MULTI_TENANT_ADMIN = "MULTI_TENANT_ADMIN",
}

export enum AppType {
  ADMIN = "ADMIN",
  APP = "APP",
}

export interface UserPreferences {
  [key: string]: any;
}
