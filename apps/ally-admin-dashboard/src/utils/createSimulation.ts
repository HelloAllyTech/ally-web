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
    linguisticStyleSamples: (data?.metadata as any)?.linguisticStyleSamples,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    difficultyLevel: data?.difficultyLevel,
    terminationEvents: data?.terminationEvents?.map(event => ({
      id: event.eventId,
      name: event.name,
      message: event.message,
    })),
    responseLength: data?.metadata?.responseLength,
    prompt: data?.prompt,
    isGlobal: Boolean(data?.isGlobal),
    isPublic: Boolean(data?.isPublic),
    triggerWarningIds: data?.triggerWarnings,
    customFields: data?.metadata?.customFields?.map((field, index) => ({
      id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${index + 1}}`,
      name: field.name,
      value: field.value,
      useInDefaultPrompt: field.useInDefaultPrompt ?? true,
    })),
    agentDialogues: Array.isArray(data?.metadata?.agentDialogues)
      ? data?.metadata?.agentDialogues.join("\n")
      : (data?.metadata?.agentDialogues ?? ""),
    experienceMode: data?.metadata?.experienceMode,
    checklistType: data?.metadata?.checklistType,
    timerMode: data?.metadata?.timerMode,
    maxTimeValue: data?.metadata?.maxTimeValue,
    optGuardrails: data?.metadata?.optGuardrails,
    stateInstructions: data?.metadata?.stateInstructions,
    behaviorInstructions: data?.behaviorInstructions ?? [],
    showScoreMeter: data?.metadata?.showScoreMeter,
    characterProfileText: data?.metadata?.characterProfileText,
    competency: data?.competency,
  };
};
