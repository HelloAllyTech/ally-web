import { formatRunDuration } from "@components/builder/runFormat";
import { MobileReleaseRun } from "@types";

/** First 7 chars of a commit SHA — the length GitHub's own UI uses for a short SHA. */
export const shortSha = (sha: string) => sha.slice(0, 7);

export const runDisplayDuration = (run: MobileReleaseRun): string => {
  if (run.status !== "completed") return "In progress";
  if (!run.runStartedAt) return "—";
  return formatRunDuration(run.runStartedAt, run.updatedAt) ?? "—";
};
