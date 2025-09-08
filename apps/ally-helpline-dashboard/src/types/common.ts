import { CallType, SocketConnectionTypes } from "@constants";

import { SocketEvent } from "./message";
import { User, UserStatus } from "./user";

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
}

export interface UserState {
  isAuthenticated: boolean;
  user: User;
  userStatus: UserStatus;
  permissions: string[];
  availableChatTypes: CallType[];
}
