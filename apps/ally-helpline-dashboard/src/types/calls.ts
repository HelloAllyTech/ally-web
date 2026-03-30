import { ChatSummaryStatus } from "./summary";

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
  summaryStatus: ChatSummaryStatus;
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

export interface GetCounsellorsInput {
  limit?: number;
  offset?: number;
}

export interface GetTagsInput {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface GetCounsellorsResponse {
  count: number;
  data: Counsellor[];
}

export interface Counsellor {
  id: number;
  name: string;
}

export interface GetTagsResponse {
  count: number;
  data: string[];
}

export interface GetAudioUploadUrlInput {
  fileName: string;
  fileSize: number;
  contentType: string;
  counselorId: number;
  startedAt: string;
  platform: string;
  duration: number;
}

export interface GetAudioUploadUrlResponse {
  presignedUrl: string;
  chatId: number;
}

export interface CancelAudioUploadInput {
  chatId: number;
}

export interface CancelAudioUploadResponse {
  message: string;
}

export interface AudioUpload {
  chatId: number;
  fileName: string;
  status: UploadStatus;
  progress: number;
  error: string | null;
}

export enum UploadStatus {
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}
