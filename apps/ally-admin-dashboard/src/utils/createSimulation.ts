import {
  COMFORT_AUDIO_VOLUME_DEFAULT,
  FORM_FIELD_IDS,
  isValidStateInstructionId,
  SIMULATION_CREATOR_FIELD_GROUPS,
  TEMPERATURE_DEFAULT,
} from "@constants";
import { GetSimulationByIdResponse, knowledgeSource } from "@types";

export const getCreateSimulationSubSectionById = (id: string) => {
  return SIMULATION_CREATOR_FIELD_GROUPS.find(section => section.id === id);
};

/**
 * Map a saved version's flattened `config` snapshot into react-hook-form values
 * for the studio editor, delegating to formatSimulationResponseData so every
 * default/transform (array→string joins, boolean defaults, etc.) applies
 * identically to the live-scenario load path.
 *
 * formatSimulationResponseData reads some fields from the top level and others
 * from `metadata`. The snapshot is flat (one value per key), so we expose the
 * whole snapshot in BOTH places — each field is then found wherever it's read.
 * This deliberately avoids a hand-maintained "which fields are metadata" list:
 * a new scenario field round-trips automatically, with no second place to
 * update (and no silent "reverts to default" if someone forgets).
 *
 * Only the fields the live GET returns as richer objects are reconstructed from
 * the ids the snapshot stores: competency, trigger warnings, termination events.
 */
export const formatVersionConfigToForm = (config: Record<string, any>) => {
  const cfg = config ?? {};

  const adminShape = {
    ...cfg,
    metadata: { ...cfg },
    competency: cfg.competency ?? (cfg.competencyId ? { id: cfg.competencyId } : undefined),
    // config stores trigger warnings as a string[] of ids; formatSim expects
    // objects under `triggerWarnings`.
    triggerWarnings: Array.isArray(cfg.triggerWarningIds)
      ? cfg.triggerWarningIds.map((tw: any) => (typeof tw === "string" ? { id: tw } : tw))
      : (cfg.triggerWarnings ?? []),
    // tolerate both the form shape ({id}) and the admin shape ({eventId}).
    terminationEvents: Array.isArray(cfg.terminationEvents)
      ? cfg.terminationEvents.map((e: any) => ({
          eventId: e.eventId ?? e.id,
          name: e.name,
          message: e.message,
        }))
      : [],
    behaviorInstructions: cfg.behaviorInstructions ?? [],
  };

  return formatSimulationResponseData(adminShape as GetSimulationByIdResponse);
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
    reminders: Array.isArray(data?.metadata?.reminders)
      ? data.metadata.reminders.join("\n")
      : ((data?.metadata?.reminders as unknown as string) ?? ""),
    translationReminders: Object.fromEntries(
      Object.entries(data.translationReminders ?? {}).map(([languageId, lines]) => [
        languageId,
        Array.isArray(lines) ? lines.join("\n") : (lines ?? ""),
      ]),
    ),
    remindersPrimaryLanguageId: data.remindersPrimaryLanguageId ?? null,
    profession: data?.metadata?.profession,
    sexualOrientation: data?.metadata?.sexualOrientation,
    // Agent Builder Copilot V2 agent-test-case selection (metadata JSONB).
    agentTestCaseIds: (data?.metadata as any)?.agentTestCaseIds ?? [],
    languageVoices: (data?.metadata as any)?.languageVoices,
    linguisticStyleSamples: (data?.metadata as any)?.linguisticStyleSamples,
    allowedFillerWords: (data?.metadata as any)?.allowedFillerWords,
    languageCharacteristics: (data?.metadata as any)?.languageCharacteristics,
    coverImageUrl: data?.coverImageUrl,
    coverVideoUrl: data?.coverVideoUrl,
    category: data?.category ?? "",
    partnerOrgName: data?.partnerOrgName ?? "",
    difficultyLevel: data?.difficultyLevel,
    terminationEvents: data?.terminationEvents?.map(event => ({
      id: event.eventId,
      name: event.name,
      message: event.message,
    })),
    selectedMainPromptCode: data?.metadata?.selectedMainPromptCode,
    selectedEvaluatorPromptCode: data?.metadata?.selectedEvaluatorPromptCode,
    mainPromptVariantByLanguage: data?.metadata?.mainPromptVariantByLanguage ?? {},
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
    // Absent = OFF: the summary checklist is opt-in per roleplay, so every
    // scenario saved before this toggle existed loads with it disabled.
    summaryChecklistEnabled: data?.metadata?.summaryChecklistEnabled ?? false,
    timerMode: data?.metadata?.timerMode,
    maxTimeValue: data?.metadata?.maxTimeValue,
    optGuardrails: data?.metadata?.optGuardrails,
    temperature: (data?.metadata as any)?.temperature ?? TEMPERATURE_DEFAULT,
    fillerEnabled: data?.metadata?.fillerEnabled ?? false,
    // Absent = ON: the backend serves the glossary unless the stored value is
    // explicitly false (default-ON rollout). Hydrating absent as false made
    // the edit form LIE about live behavior — and a super-duper-admin saving
    // the form would then write the explicit false back.
    languageGlossaryEnabled: data?.metadata?.languageGlossaryEnabled ?? true,
    comfortAudioEnabled: data?.metadata?.comfortAudioEnabled ?? false,
    comfortAudioUrl: (data?.metadata as any)?.comfortAudioUrl ?? "",
    comfortAudioVolume: (data?.metadata as any)?.comfortAudioVolume ?? COMFORT_AUDIO_VOLUME_DEFAULT,
    historyTrimEnabled: data?.metadata?.historyTrimEnabled ?? true,
    // No fallback: unset genuinely means "use the global platform default"
    // (settings.TURN_MAX_ENDPOINTING_DELAY in ally-ai-learn), not a specific
    // number the form should silently write back.
    turnMaxEndpointingDelay: data?.metadata?.turnMaxEndpointingDelay,
    continuousBackchanneling: data?.metadata?.continuousBackchanneling ?? false,
    interimReplyEnabled: data?.metadata?.interimReplyEnabled ?? true,
    currentState: data?.metadata?.currentState,
    remindersEnabled: data?.metadata?.remindersEnabled,
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
    // Per-language STT picks, keyed like languageVoices. Absent = inherit.
    sttConfigByLanguage: (data?.metadata as any)?.sttConfigByLanguage ?? {},
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
