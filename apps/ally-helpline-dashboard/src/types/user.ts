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
}

export enum UserStatus {
  OFFLINE = "offline",
  AVAILABLE = "available",
}
