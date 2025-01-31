export interface User {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  user_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
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
