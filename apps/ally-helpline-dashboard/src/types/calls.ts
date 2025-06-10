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
}

export interface GetCallLogsResponse {
  count: number;
  data: CallLog[];
}

export interface GetCallLogsInput {
  limit: number;
  offset: number;
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
