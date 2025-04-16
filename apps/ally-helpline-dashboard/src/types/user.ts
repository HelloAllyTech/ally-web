export interface User {
  email: string;
  id: number;
  name: string;
  role: UserRole;
  userId: number;
}

export enum UserRole {
  CLIENT = "CLIENT",
  COUNSELOR = "COUNSELOR",
}

export enum UserStatus {
  OFFLINE = "offline",
  AVAILABLE = "available",
}
