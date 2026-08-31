/**
 * Wire types for UX Signals — the PostHog scan that files bug findings into Bug
 * Hunter and improvement suggestions into the Analytics Suggestions queue.
 * Mirrors ally-be src/ux-signals DTOs.
 */

export enum UxSignalScanTrigger {
  SCHEDULED = "scheduled",
  MANUAL = "manual",
}

export enum UxSignalScanStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

/** What one scan did. Returned by the scan endpoint and shown in the toast. */
export interface UxScanOutcome {
  scanId: string;
  /** Observations that crossed a detector threshold, before triage clustered them. */
  signalsDetected: number;
  findingsCreated: number;
  suggestionsCreated: number;
  /**
   * Items already open as a finding or pending as a suggestion. A healthy steady
   * state, not an error — worth showing so a scan that filed nothing does not
   * read as a scan that found nothing.
   */
  skippedDuplicates: number;
  /** Detectors whose query failed, by name. Never a silent absence. */
  failedDetectors: string[];
}

export interface UxSignalScan {
  id: string;
  trigger: UxSignalScanTrigger;
  status: UxSignalScanStatus;
  windowFrom: string;
  windowTo: string;
  signalsDetected: number;
  findingsCreated: number;
  suggestionsCreated: number;
  skippedDuplicates: number;
  error: string | null;
  /** Null for scheduled runs. */
  startedBy: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface UxSignalScansResponse {
  scans: UxSignalScan[];
}
