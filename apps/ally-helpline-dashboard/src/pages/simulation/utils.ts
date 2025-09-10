import { SimulationEventType } from "./components";

export const getSimulationEvent = (payload): SimulationEventType => {
  const { data, timestamp } = payload;
  return {
    score: data?.score ?? null,
    emoji: data?.emoji ?? "",
    message: data?.message ?? "",
    timestamp,
  };
};
