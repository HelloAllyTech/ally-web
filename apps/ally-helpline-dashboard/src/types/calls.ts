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
  archivedAt: string | null;
  startedAt: string;
  endedAt: string;
  details: any;
  client: CallClient;
  counselor: {
    id: number;
    name: string;
    phone: string;
  };
  reviewStatus: string | null;
  reviewId: string | null;
  reviewCreatedAt: string | null;
  customFieldValues?: { fieldDefinitionId: string; value?: string | null }[];
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
  archive?: boolean;
  callName?: string;
  /** JSON-encoded array of custom/default-field filters (see fieldFilters.ts). */
  fieldFilters?: string;
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
  s3Key: string;
  chatId: number;
}

export interface CancelAudioUploadInput {
  chatId: number;
}

export interface CancelAudioUploadResponse {
  message: string;
}

export interface ProcessAudioUploadInput {
  s3Key: string;
}

export interface ProcessAudioUploadResponse {
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

export interface CreateNoteResponse {
  chatId: number;
  name: string;
}

/**
 * A generic, human-readable description of a form field for the voice-note
 * extractor. The drawer maps both built-in summary fields and org custom
 * fields onto these types; `id` is the summary key (built-in) or the custom
 * field definition id, and `options` are the choice labels for selects.
 */
export type VoiceNoteFieldType =
  | "text"
  | "multiline"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "boolean";

export interface VoiceNoteFieldSpec {
  id: string;
  label: string;
  type: VoiceNoteFieldType;
  options?: string[];
  hint?: string;
}

export interface GenerateNoteFromAudioInput {
  audio: Blob;
  fields: VoiceNoteFieldSpec[];
  /** Optional ISO-639-1 language hint; omitted lets the model auto-detect. */
  languageHint?: string;
}

export interface GenerateNoteFromAudioResponse {
  /**
   * Plain-text transcript of the dictation. The generate call itself does not
   * persist it; the drawer saves it to the note via `saveNoteTranscript` so it
   * shows in the Transcript view later.
   */
  transcript: string;
  /** Values the model could fill (value is a human-readable string). */
  values: { id: string; value: string }[];
}

export interface SaveNoteTranscriptInput {
  chatId: number;
  /** The full (possibly accumulated) dictation transcript to store. */
  transcript: string;
}
