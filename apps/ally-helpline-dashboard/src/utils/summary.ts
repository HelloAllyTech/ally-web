import { logger } from "@ally-ui-mono/ui-shared";
import { CallProvider, CallSummaryGenerationDataMap } from "@constants";
import { Tag } from "@types";

/** How long a save is willing to wait for LLM tag ratings before falling back. */
export const TAG_RATING_TIMEOUT_MS = 10_000;
/** Middle of the 1–5 positivity scale (renders as the neutral gray chip). */
export const NEUTRAL_TAG_POSITIVITY = 3;

type GetTagsTrigger = (arg: { tags: string[] }) => PromiseLike<{
  data?: Tag[];
  error?: unknown;
}> & {
  abort: () => void;
};

/**
 * Rate tags via the LLM endpoint, but never let that call block or break a
 * save: abort after TAG_RATING_TIMEOUT_MS, and on any failure fall back to the
 * tag's previous rating (or neutral for new tags). Tags the user typed must be
 * persisted even when the AI service is down — an earlier version sent [] on
 * failure, which silently wiped every tag on the session.
 */
export const rateTagsWithFallback = async (
  getTags: GetTagsTrigger,
  tags: string[],
  previousTags: Tag[] = [],
): Promise<Tag[]> => {
  if (tags.length === 0) return [];
  const request = getTags({ tags });
  const timeout = setTimeout(() => request.abort(), TAG_RATING_TIMEOUT_MS);
  const response = await request;
  clearTimeout(timeout);
  if (response.data) return response.data;
  logger.info(`Error getting tag positivity ratings, using fallback: ${response.error}`);
  const previous = new Map(previousTags.map(t => [t.tag, t]));
  return tags.map(tag => previous.get(tag) ?? { tag, positivity_rating: NEUTRAL_TAG_POSITIVITY });
};

export const getEstimatedSummaryGenerationTime = (
  callDuration: number,
  callProvider: CallProvider,
) => {
  // calculate the estimated generation time in seconds based on actual generation time
  // 1.2 is a buffer to account for the time it takes to generate the summary
  const callSumamryGenerationData = CallSummaryGenerationDataMap[callProvider];
  if (!callSumamryGenerationData) return 0;
  const estimatedGenerationTimeInseconds =
    ((callSumamryGenerationData.summaryGenerationDurationInSeconds * callDuration) /
      callSumamryGenerationData.durationInSeconds) *
    1.2;

  return Math.ceil(estimatedGenerationTimeInseconds / 60);
};
