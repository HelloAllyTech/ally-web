import { FORM_FIELD_TYPES, SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import { isNonEmptyString } from "./common";

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
    autoTermitionRule: Boolean(data?.metadata?.autoTermitionRule), // To Do: Will be change when BE API is updated
    triggerEvent: data?.metadata?.triggerEvent,
    triggerMessage: data?.metadata?.triggerMessage,
  };
};

export const extractValidData = (formData: Record<string, any>): Record<string, any> => {
  const allFields = SIMULATION_CREATOR_FIELD_GROUPS.flatMap(group => group.fields);
  return Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      const field = allFields.find(field => field.id === key);

      switch (field?.type) {
        case FORM_FIELD_TYPES.SELECT:
        case FORM_FIELD_TYPES.CUSTOM.VOICE_DROPDOWN: //handles dropdown case
          return [key, isNonEmptyString(value) ? value : null];

        case FORM_FIELD_TYPES.NUMBER: //convert string to number and empty val to null
          return [key, value ? parseInt(value) : null];

        case FORM_FIELD_TYPES.IMAGE_UPLOAD: //image upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        case FORM_FIELD_TYPES.VIDEO_UPLOAD: //video upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        default:
          return [key, isNonEmptyString(value) ? value.trim() : value];
      }
    }),
  );
};
