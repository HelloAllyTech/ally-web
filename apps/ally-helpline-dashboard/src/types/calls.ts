interface CallClient {
  createdAt: string;
  updatedAt: string;
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  username: string;
  metadata: Record<string, unknown>;
  phone: string | null;
}

export interface CallLog {
  createdAt: string;
  updatedAt: string;
  id: number;
  roomId: number;
  clientId: number;
  counselorId: number;
  status: string;
  startedAt: string;
  endedAt: string;
  details: any;
  client: CallClient;
  counselor: {
    id: number;
    name: string;
    phone: string;
  };
}

export interface GetCallLogsResponse {
  count: number;
  data: CallLog[];
}

export interface GetCallLogsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
  counselorName?: string;
  clientId?: string;
  counselorId?: string;
  counselorIds?: string;
  startDate?: string;
  endDate?: string;
  minDuration?: number;
  maxDuration?: number;
  minQualityScore?: number;
  maxQualityScore?: number;
  tags?: string;
}

export interface WaitingClientChat {
  chatId: number;
  roomId: number;
  clientId: number;
  counselorId: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

export interface WaitingClient {
  userId: number;
  email: string;
  name: string;
  role: string;
  status: string;
  chat: WaitingClientChat;
  createdAt: string;
  updatedAt: string | null;
}

export interface GetWaitingClientsResponse {
  totalWaiting: number;
  clients: WaitingClient[];
}

export interface GetCounselorsInput {
  limit?: number;
  offset?: number;
}

export interface GetTagsInput {
  limit?: number;
  offset?: number;
}

export interface GetCounselorsResponse {
  count: number;
  data: Counselor[];
}

export interface Counselor {
  id: number;
  name: string;
}

export interface GetTagsResponse {
  count: number;
  data: import("./summary").Tag[];
}
