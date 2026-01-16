import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { FORM_FIELD_IDS, SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
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
      : (data?.metadata?.openingStatements ?? ""),
    personality: data?.metadata?.personality,
    profession: data?.metadata?.profession,
    sessionBehaviorGuidelines: data?.metadata?.sessionBehaviorGuidelines,
    sexualOrientation: data?.metadata?.sexualOrientation,
    startingState: data?.metadata?.startingState,
    tone: data?.metadata?.tone,
    voiceId: data?.metadata?.voiceId,
    languageVoices: (data?.metadata as any)?.languageVoices,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    terminationEvents: data?.terminationEvents,
    difficultyLevel: data?.difficultyLevel,
    ...(FEATURE_FLAGS_MAP.AUTO_TERMINATION_FIELD_FLAG
      ? {
          terminationEvents: data?.terminationEvents?.map(event => ({
            id: event.eventId,
            name: event.name,
            message: event.message,
          })),
        }
      : {
          autoTerminationStatus: Boolean(data?.terminationEvent?.autoTerminationStatus),
          terminationEventId: data?.terminationEvent?.eventId,
          terminationMessage: data?.terminationEvent?.message,
          terminationName: data?.terminationEvent?.name,
        }),
    responseLength: data?.metadata?.responseLength,
    prompt: data?.prompt,
    isGlobal: Boolean(data?.isGlobal),
    ...(FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG
      ? {
          isPublic: Boolean(data?.isPublic),
        }
      : {}),
    triggerWarningIds: data?.triggerWarnings,
    customFields: data?.metadata?.customFields?.map((field, index) => ({
      id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${index + 1}}`,
      name: field.name,
      value: field.value,
    })),
    agentDialogues: Array.isArray(data?.metadata?.agentDialogues)
      ? data?.metadata?.agentDialogues.join("\n")
      : (data?.metadata?.agentDialogues ?? ""),
    experienceMode: data?.metadata?.experienceMode,
    checklistType: data?.metadata?.checklistType,
  };
};
