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
}

export interface UserPreferences {
  [key: string]: any;
}
