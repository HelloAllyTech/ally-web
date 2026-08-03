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
  /**
   * Ally staff. Carries no permissions this app uses — it exists so the admin
   * console path-mounted at /admin on this origin can be offered to its
   * holders (see hasInternalRole / ADMIN_CONSOLE_PATH).
   */
  INTERNAL = "INTERNAL",
}

export enum AppType {
  ADMIN = "ADMIN",
  APP = "APP",
}

export interface UserPreferences {
  [key: string]: any;
}
