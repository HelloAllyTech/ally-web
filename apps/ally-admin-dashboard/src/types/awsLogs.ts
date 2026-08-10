export type AwsLogService = "ally-be" | "ally-ai" | "ally-ai-learn";

export type AwsLogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface AwsLogEvent {
  timestamp: number;
  message: string;
  logStreamName: string;
  eventId: string;
}

export interface AwsLogsResponse {
  events: AwsLogEvent[];
  nextToken?: string;
}

/** Query params accepted by GET /v1/aws-logs. */
export interface AwsLogsParams {
  service: AwsLogService;
  /** Range start, epoch ms. */
  startTime: number;
  /** Range end, epoch ms. */
  endTime: number;
  level?: AwsLogLevel;
  logStreamName?: string;
  search?: string;
  nextToken?: string;
  limit?: number;
}

export interface AwsLogStream {
  name: string;
  lastEventTime?: number;
}

export interface AwsLogStreamsResponse {
  streams: AwsLogStream[];
  nextToken?: string;
}

/** Query params accepted by GET /v1/aws-logs/streams. */
export interface AwsLogStreamsParams {
  service: AwsLogService;
  nextToken?: string;
}
