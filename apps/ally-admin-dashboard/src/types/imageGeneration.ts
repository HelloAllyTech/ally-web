/**
 * An AI image generation running as a background job (ally-be
 * ImageGenerationJobService). Starting one returns at once; the editor polls
 * until it is no longer `running`.
 */
export interface ImageGenerationJob {
  jobId: string;
  status: "running" | "succeeded" | "failed";
  /** Set once succeeded. */
  imageUrl?: string;
  /** Set once failed — already worded for the author. */
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
