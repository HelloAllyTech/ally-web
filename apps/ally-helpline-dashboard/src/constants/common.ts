import { UserStatus } from "@/types/user";

export const USER_STATUS_OPTIONS = [
  { value: UserStatus.OFFLINE, label: "Offline" },
  { value: UserStatus.AVAILABLE, label: "Available" }
];

export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
