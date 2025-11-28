export interface User {
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
