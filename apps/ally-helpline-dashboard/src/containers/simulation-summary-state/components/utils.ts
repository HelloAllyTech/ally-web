import { SimulationSummary } from "@src/types";

export const getFormattedFeedbackSection = (summary: SimulationSummary) => {
  return {
    keyEvents: summary.events
      ?.slice()
      ?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      ?.map(item => {
        // Calculate time difference from summary.createdAt to item.createdAt
        const sessionStartTime = new Date(summary.createdAt).getTime();
        const eventTime = new Date(item.createdAt).getTime();
        const timeDiffMs = eventTime - sessionStartTime;

        const totalSeconds = Math.floor(timeDiffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return {
          time: `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          event: item.events?.message,
          score: item.events?.score,
        };
      }),
    improvements: summary.details?.summary?.feedback?.improvements,
    positives: summary.details?.summary?.feedback?.positives,
  };
};
