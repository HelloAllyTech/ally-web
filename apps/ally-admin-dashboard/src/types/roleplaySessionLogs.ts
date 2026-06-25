export type RoleplaySessionStatus = "ACTIVE" | "ENDED";

/** A single row in the super-admin roleplay-session-logs table. */
export interface RoleplaySessionLogRow {
  id: string;
  counselorId: number;
  counselorName: string | null;
  counselorEmail: string | null;
  tenantId: string;
  orgName: string | null;
  scenarioId: number;
  scenarioTitle: string | null;
  status: RoleplaySessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  platform: string | null;
  createdAt: string;
}

export interface RoleplaySessionLogEvent {
  id: string;
  eventId: string;
  eventName: string | null;
  occurredAt: string;
  score: number | null;
  emoji: string | null;
  message: string | null;
}

export interface RoleplaySessionLogMessage {
  id: number;
  senderId: number;
  content: string;
  startSeconds: number | null;
  endSeconds: number | null;
  createdAt: string;
}

export interface RoleplaySessionLogDetail extends RoleplaySessionLogRow {
  summary: Record<string, unknown> | null;
  events: RoleplaySessionLogEvent[];
  transcript: RoleplaySessionLogMessage[];
}

export interface RoleplaySessionLogsResponse {
  data: RoleplaySessionLogRow[];
  total: number;
}

/** Query params accepted by GET /v1/roleplay-session-logs. */
export interface RoleplaySessionLogsParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: RoleplaySessionStatus;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
  sortBy?: "createdAt" | "startedAt" | "endedAt" | "score" | "status";
  order?: "ASC" | "DESC";
}
