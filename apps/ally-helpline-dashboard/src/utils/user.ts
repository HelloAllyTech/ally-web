import { UserRole, UserStatus } from "@types";

export const isCounselor = (role: string) => role === UserRole.COUNSELLOR;

export const isUserAvailable = (status: string) => status === UserStatus.AVAILABLE;
