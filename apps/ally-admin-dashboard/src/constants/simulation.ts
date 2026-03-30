import type { RoomOptions } from "livekit-client";

export const LIVEKIT_CONFIG: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [],
  },
};

export enum SimulationStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  PUBLISHED = "PUBLISHED",
}
