import { SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

export const getCreateSimulationSubSectionById = (id: string) => {
  return SIMULATION_CREATOR_FIELD_GROUPS.find(section => section.id === id);
};

export const formatSimulationResponseData = (data: GetSimulationByIdResponse) => {
  return {
    title: data.title,
    description: data.description,
    age: data?.metadata?.age,
    name: data?.metadata?.name,
    context: data?.metadata?.context,
    coreMemories: data?.metadata?.coreMemories,
    agentGoal: data?.metadata?.agentGoal,
    currentLocation: data?.metadata?.currentLocation,
    emotionalNeeds: data?.metadata?.emotionalNeeds,
    gender: data?.metadata?.gender,
    genderIdentity: data?.metadata?.genderIdentity,
    lifeHistory: data?.metadata?.lifeHistory,
    openingStatements: Array.isArray(data?.metadata?.openingStatements)
      ? data.metadata.openingStatements.join("\n")
      : ((data?.metadata as any)?.openingStatements ?? ""),
    personality: data?.metadata?.personality,
    profession: data?.metadata?.profession,
    sessionBehaviorGuidelines: data?.metadata?.sessionBehaviorGuidelines,
    sexualOrientation: data?.metadata?.sexualOrientation,
    startingState: data?.metadata?.startingState,
    tone: data?.metadata?.tone,
    voiceId: data?.metadata?.voiceId,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    autoTerminationStatus: Boolean(data?.terminationEvent?.autoTerminationStatus),
    terminationEventId: data?.terminationEvent?.eventId,
    terminationMessage: data?.terminationEvent?.message,
    isGlobal: Boolean(data?.isGlobal),
    triggerWarnings: data?.triggerWarnings,
  };
};
