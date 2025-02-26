export interface User {
  id: number;
  userId: number;
  email: string;
  name: string;
  role: UserRole;
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}

export enum UserRole {
  CLIENT = "CLIENT",
  COUNSELOR = "COUNSELOR",
}
