export const getSimulationEvents = <T extends { data?: any; timestamp: string }>(events: T[]) => {
  return events.map(event => {
    const { data, timestamp } = event as any;
    return {
      score: data?.score ?? null,
      emoji: data?.emoji ?? "",
      message: data?.message ?? "",
      timestamp,
    };
  });
};
export { MAX_SESSION_MINUTES, WARNING_THRESHOLD } from "./waveformConstants";
