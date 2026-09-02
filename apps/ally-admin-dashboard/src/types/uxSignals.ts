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

/**
 * All the scan endpoint returns: the run exists and is going.
 *
 * There are no counts here because at this moment there are none — the scan takes
 * minutes and the response comes back in milliseconds. A shape carrying zeroes
 * would be indistinguishable from a finished, quiet scan, which is the confusion
 * this endpoint used to create. The result arrives via the scan log.
 */
export interface UxScanStarted {
  scanId: string;
  status: UxSignalScanStatus;
  startedAt: string;
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
  /**
   * Detectors whose query failed, by name. Never a silent absence: a scan that
   * found little has to be tellable from one that could not look.
   */
  failedDetectors: string[];
  error: string | null;
  /** Null for scheduled runs. */
  startedBy: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface UxSignalScansResponse {
  scans: UxSignalScan[];
}
