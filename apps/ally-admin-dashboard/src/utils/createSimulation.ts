import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  FORM_FIELD_IDS,
  SIMULATION_CREATOR_FIELD_GROUPS,
  SIMULATION_CREATOR_FIELD_GROUPS_OLD,
} from "@constants";
import { GetSimulationByIdResponse } from "@types";

// TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
export const getCreateSimulationSubSectionById = (id: string) => {
  const fieldGroups = FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
    ? SIMULATION_CREATOR_FIELD_GROUPS
    : SIMULATION_CREATOR_FIELD_GROUPS_OLD;
  return fieldGroups.find(section => section.id === id);
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
    languageVoices: (data?.metadata as any)?.languageVoices,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    autoTerminationStatus: Boolean(data?.terminationEvent?.autoTerminationStatus),
    terminationEventId: data?.terminationEvent?.eventId,
    terminationMessage: data?.terminationEvent?.message,
    terminationName: data?.terminationEvent?.name,
    isGlobal: Boolean(data?.isGlobal),
    triggerWarningIds: data?.triggerWarnings,
    customFieldGroup: data?.customFields?.map((field, index) => ({
      id: `${FORM_FIELD_IDS.CUSTOM_FIELD_GROUP}${index + 1}}`,
      name: field.name,
      value: field.value,
    })),
  };
};
