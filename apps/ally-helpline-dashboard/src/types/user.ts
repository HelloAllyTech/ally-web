export interface User {
  email: string;
  id: number;
  name: string;
  role: UserRole;
  userId: number;
}

export enum UserRole {
  CLIENT = "CLIENT",
  COUNSELLOR = "COUNSELOR",
  ADMIN = "ADMIN",
  // TODO: Confirm and update with correct role
  LEARNER = "LEARNER",
}

export enum UserStatus {
  OFFLINE = "offline",
  AVAILABLE = "available",
}
