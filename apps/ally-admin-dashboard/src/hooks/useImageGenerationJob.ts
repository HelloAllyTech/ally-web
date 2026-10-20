import { useCallback, useEffect, useRef, useState } from "react";

import { ImageGenerationJob } from "@types";

/**
 * How often a running image job is asked whether it has finished. Medium
 * quality takes ~25 s, so this is a handful of cheap reads per image.
 */
export const IMAGE_JOB_POLL_INTERVAL_MS = 3_000;

/**
 * The backend reports a job still running after 5 minutes as failed (its API
 * task was replaced mid-run). Waiting a little past that means the backend's
 * verdict normally arrives first; this cap only matters if polls stop landing.
 */
export const IMAGE_JOB_MAX_WAIT_MS = 5.5 * 60_000;

/** A deploy or a dropped connection costs a poll or two, not the image. */
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

export const IMAGE_GENERATION_FAILED_MESSAGE =
  "Couldn't generate an image this time. Try again in a moment.";

/** Rejected with a sentence the editor can show as-is. */
export class ImageGenerationError extends Error {}

/** The backend's own sentence when it sent one; never a raw validation array. */
const messageOf = (caught: unknown): string => {
  const message = (caught as { data?: { message?: unknown } })?.data?.message;
  return typeof message === "string" && message ? message : IMAGE_GENERATION_FAILED_MESSAGE;
};

interface WaitOptions {
  poll: (jobId: string) => Promise<ImageGenerationJob>;
  isCancelled: () => boolean;
  intervalMs?: number;
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Poll a started job until it settles. Resolves with the image URL, or null if
 * the caller went away first; rejects with an ImageGenerationError otherwise.
 */
export const waitForImageJob = async (
  job: ImageGenerationJob,
  {
    poll,
    isCancelled,
    intervalMs = IMAGE_JOB_POLL_INTERVAL_MS,
    maxWaitMs = IMAGE_JOB_MAX_WAIT_MS,
    sleep = defaultSleep,
    now = Date.now,
  }: WaitOptions,
): Promise<string | null> => {
  const deadline = now() + maxWaitMs;
  let current = job;
  let failures = 0;

  while (current.status === "running") {
    if (now() >= deadline) throw new ImageGenerationError(IMAGE_GENERATION_FAILED_MESSAGE);
    await sleep(intervalMs);
    if (isCancelled()) return null;
    try {
      current = await poll(current.jobId);
      failures = 0;
    } catch (caught) {
      // 404: expired or never ours — no later poll will find it either.
      if ((caught as { status?: number })?.status === 404) {
        throw new ImageGenerationError(messageOf(caught));
      }
      failures += 1;
      if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        throw new ImageGenerationError(IMAGE_GENERATION_FAILED_MESSAGE);
      }
    }
  }

  if (isCancelled()) return null;
  if (current.status === "succeeded" && current.imageUrl) return current.imageUrl;
  throw new ImageGenerationError(current.error || IMAGE_GENERATION_FAILED_MESSAGE);
};

/**
 * Start an AI image generation and wait for it, as one awaitable call.
 *
 * Generation outlasts the load balancer's 60 s idle timeout often enough that
 * the request can't be held open (the roleplay cover button failed in
 * production that way), so the backend runs it as a job: the start returns at
 * once and this polls. `generate` resolves with the image URL, resolves null
 * if the component unmounted meanwhile, and rejects with an
 * ImageGenerationError whose message is ready to show.
 */
export const useImageGenerationJob = <Input>(
  start: (input: Input) => Promise<ImageGenerationJob>,
  poll: (jobId: string) => Promise<ImageGenerationJob>,
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const generate = useCallback(
    async (input: Input): Promise<string | null> => {
      setIsGenerating(true);
      try {
        let job: ImageGenerationJob;
        try {
          job = await start(input);
        } catch (caught) {
          throw new ImageGenerationError(messageOf(caught));
        }
        return await waitForImageJob(job, { poll, isCancelled: () => unmountedRef.current });
      } finally {
        if (!unmountedRef.current) setIsGenerating(false);
      }
    },
    [start, poll],
  );

  return { generate, isGenerating };
};
