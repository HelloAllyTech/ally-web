export interface User {
  profileImageUrl?: string;
  email: string;
  id: number;
  name: string;
  role: UserRole;
  userId: number;
  status: string;
}

export enum UserRole {
  COUNSELLOR = "COUNSELOR",
  ADMIN = "ADMIN",
  LEARNER = "LEARNER",
  SCRIBE_REVIEWER = "SCRIBE_REVIEWER",
  SIMULATION_REVIEWER = "SIMULATION_REVIEWER",
}

export enum AppType {
  ADMIN = "ADMIN",
  APP = "APP",
}

export interface UserPreferences {
  [key: string]: any;
}
