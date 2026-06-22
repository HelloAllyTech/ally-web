import {
  FORM_FIELD_IDS,
  isValidStateInstructionId,
  SIMULATION_CREATOR_FIELD_GROUPS,
} from "@constants";
import { GetSimulationByIdResponse, knowledgeSource } from "@types";

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
    currentLocation: data?.metadata?.currentLocation,
    gender: data?.metadata?.gender,
    genderIdentity: data?.metadata?.genderIdentity,
    openingStatements: Array.isArray(data?.metadata?.openingStatements)
      ? data.metadata.openingStatements.join("\n")
      : (data?.metadata?.openingStatements ?? ""),
    translationOpeningStatements: data.translationOpeningStatements ?? {},
    openingDialoguePrimaryLanguageId: data.openingDialoguePrimaryLanguageId ?? null,
    translationDescription: data.translationDescription ?? {},
    challengeDescriptionPrimaryLanguageId: data.challengeDescriptionPrimaryLanguageId ?? null,
    translationTitle: data.translationTitle ?? {},
    profession: data?.metadata?.profession,
    sexualOrientation: data?.metadata?.sexualOrientation,
    languageVoices: (data?.metadata as any)?.languageVoices,
    linguisticStyleSamples: (data?.metadata as any)?.linguisticStyleSamples,
    allowedFillerWords: (data?.metadata as any)?.allowedFillerWords,
    fillerDialogues: (data?.metadata as any)?.fillerDialogues,
    languageCharacteristics: (data?.metadata as any)?.languageCharacteristics,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    difficultyLevel: data?.difficultyLevel,
    terminationEvents: data?.terminationEvents?.map(event => ({
      id: event.eventId,
      name: event.name,
      message: event.message,
    })),
    selectedMainPromptCode: data?.metadata?.selectedMainPromptCode,
    selectedEvaluatorPromptCode: data?.metadata?.selectedEvaluatorPromptCode,
    states: data?.metadata?.states ?? [],
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
    enableProsody: data?.metadata?.enableProsody ?? true,
    fillerEnabled: data?.metadata?.fillerEnabled ?? false,
    currentState: data?.metadata?.currentState,
    stateInstructions: Array.isArray(data?.metadata?.stateInstructions)
      ? data.metadata.stateInstructions.filter(si => isValidStateInstructionId(si?.stateId))
      : data?.metadata?.stateInstructions,
    behaviorInstructions: (data?.behaviorInstructions ?? []).map(beh => ({
      ...beh,
      stateInstructions: (beh.stateInstructions ?? []).filter(si =>
        isValidStateInstructionId(si?.stateId),
      ),
    })),
    showScoreMeter: data?.metadata?.showScoreMeter,
    enableFeedback: data?.metadata?.enableFeedback ?? true,
    // Opt-in toggle: missing → disabled (only an explicit true enables it).
    pauseEnabled: (data?.metadata as any)?.pauseEnabled ?? false,
    characterProfileText: data?.metadata?.characterProfileText,
    helperAgentPrompt: data?.metadata?.helperAgentPrompt,
    agentBuilderDescription: (data?.metadata as any)?.agentBuilderDescription,
    agentBuilderPrompt: (data?.metadata as any)?.agentBuilderPrompt,
    competency: data?.competency,
    stateNames: (data?.metadata as any)?.stateNames ?? [],
    knowledgeSources: data?.metadata?.knowledgeSources?.map((source: knowledgeSource) => ({
      id: source.id,
      title: source.title,
      content: source.content,
    })),
  };
};
