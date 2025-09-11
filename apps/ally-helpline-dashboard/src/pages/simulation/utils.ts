import { LiveKitEvent } from "@hooks/types";

import { SimulationEventType } from "./components";

export const getSimulationEvents = (events: LiveKitEvent[]): SimulationEventType[] => {
  return events.map(event => {
    const { data, timestamp } = event;
    return {
      score: data?.score ?? null,
      emoji: data?.emoji ?? "",
      message: data?.message ?? "",
      timestamp,
    };
  });
};
