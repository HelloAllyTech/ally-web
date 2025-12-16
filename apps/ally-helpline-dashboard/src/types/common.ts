import { CallType, Permissions, SocketConnectionTypes } from "@constants";

import { AudioUpload } from "./calls";
import { SocketEvent } from "./message";
import { User } from "./user";

export interface EnhanceButtonProps {
  fieldName: string;
  inputText: string;
  updateValue: (text: string) => void;
}

export interface Session {
  type: string;
  [key: string]: any;
}

// TODO: Move to hooks/types.ts
export interface UseSessionManagerOptions {
  autoConnect?: boolean;
  connectionType?: SocketConnectionTypes;
}

// TODO: Move to hooks/types.ts
export interface UseSocketOptions {
  connectionType: SocketConnectionTypes;
  eventCallbacks?: Partial<Record<SocketEvent, (params?: any) => void>>;
}

export interface CallsState {
  filters: {
    page?: number;
    offset?: number;
    limit?: number;
    sortBy?: string;
    order?: "ASC" | "DESC";
    counsellorName?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    minDuration?: number;
    maxDuration?: number;
    minQualityScore?: number;
    maxQualityScore?: number;
    tags?: string;
  };
  audioUpload: AudioUpload[];
}

export interface UserState {
  isAuthenticated: boolean;
  user: User;
  permissions: Permissions[];
  availableChatTypes: CallType[];
}
export interface LanguageOption {
  value: string;
  label: string;
  language_id?: number; // Make this optional with ?
}

export enum SessionType {
  CALL = "call",
  SIMULATION = "simulation",
}

export enum IssueOptions {
  MISSING_KEY_INFORMATION = "MISSING_KEY_INFORMATION",
  INACCURATE = "INACCURATE",
  TOO_VAGUE = "TOO_VAGUE",
  DIFFICULT_TO_UNDERSTAND = "DIFFICULT_TO_UNDERSTAND",
  TOO_SHORT = "TOO_SHORT",
  OTHER = "OTHER",
}
