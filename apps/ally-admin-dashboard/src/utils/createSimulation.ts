import {
  COMFORT_AUDIO_VOLUME_DEFAULT,
  FORM_FIELD_IDS,
  FORM_FIELD_TYPES,
  isValidStateInstructionId,
  SIMULATION_CREATOR_FIELD_GROUPS,
  TEMPERATURE_DEFAULT,
} from "@constants";
import { CreatorFieldGroups, GetSimulationByIdResponse, knowledgeSource } from "@types";

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

/**
 * Collect every TOGGLE_BUTTON field's declared `defaultValue` into a
 * `defaultValues` object for `useForm`.
 *
 * ToggleSection seeds its own controller, but only once it MOUNTS — and the
 * creator renders one step at a time and hides fields behind `visibleWhen`, so
 * on a brand-new simulation a toggle the author never scrolled to has no value
 * in form state at all. The save payload is built from `getValues()`, so those
 * fields used to persist as `false` (via `extractValidData`'s `Boolean(value)`)
 * regardless of what their config declared. Seeding the whole set up front
 * fixes that for the create path; the edit path is unaffected because
 * `formMethods.reset(formatSimulationResponseData(...))` replaces these values
 * with the stored ones.
 *
 * Deliberately toggles only. Other field types declare defaults too, but they
 * have their own seeding rules that a blanket seed would break — most sharply
 * `prompt`, whose managed role-instruction default is written by an effect in
 * CreateSimulation that keys off the field still being empty.
 *
 * Note this seeds `false` for a toggle that declares no default, so the whole
 * toggle set is explicit in the payload from the first save. Nothing is marked
 * dirty: `defaultValues` is the form's baseline, so merely opening the creator
 * still doesn't trip the `dirtyFields` gate that keeps autosave from littering
 * the list with untouched drafts.
 */
export const buildToggleDefaultValues = (
  fieldGroups: CreatorFieldGroups[],
): Record<string, boolean> =>
  Object.fromEntries(
    fieldGroups
      .flatMap(group => group.fields)
      .filter(field => field.type === FORM_FIELD_TYPES.TOGGLE_BUTTON)
      .map(field => [field.id, field.defaultValue === true]),
  );

/**
 * Build the `feedbackTabs` metadata payload from the three form toggles.
 *
 * Every key is `!== false`, never `Boolean(...)`. `buildToggleDefaultValues`
 * above now seeds these up front, so in the normal case they arrive as real
 * booleans — but this stays defensive on purpose, because the cost of an
 * `undefined` slipping through is a newly authored roleplay saved with all
 * three tabs dark, and a learner finishing a session to a blank screen. Reading
 * absent as ON also keeps this symmetric with `formatSimulationResponseData`
 * and with the backend resolver, both of which treat absent as on.
 */
export const buildFeedbackTabsPayload = (form: {
  feedbackTabDebrief?: boolean;
  feedbackTabSkills?: boolean;
  feedbackTabTranscript?: boolean;
}) => ({
  debrief: form.feedbackTabDebrief !== false,
  skills: form.feedbackTabSkills !== false,
  transcript: form.feedbackTabTranscript !== false,
});

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
    // Absent = ON: thinking filler is on by default across every scenario
    // unless the stored value is explicitly false. Hydrating absent as false
    // made the edit form LIE about live behavior — and a super-duper-admin
    // saving the form would then write the explicit false back.
    fillerEnabled: data?.metadata?.fillerEnabled ?? true,
    // Absent = ON: the backend serves the glossary unless the stored value is
    // explicitly false (default-ON rollout). Hydrating absent as false made
    // the edit form LIE about live behavior — and a super-duper-admin saving
    // the form would then write the explicit false back.
    languageGlossaryEnabled: data?.metadata?.languageGlossaryEnabled ?? true,
    comfortAudioEnabled: data?.metadata?.comfortAudioEnabled ?? false,
    comfortAudioUrl: (data?.metadata as any)?.comfortAudioUrl ?? "",
    comfortAudioVolume: (data?.metadata as any)?.comfortAudioVolume ?? COMFORT_AUDIO_VOLUME_DEFAULT,
    historyTrimEnabled: data?.metadata?.historyTrimEnabled ?? true,
    // EXPERIMENT(turn-endpointing) — no fallback: unset genuinely means
    // "use the platform default", not a number the form should write back.
    turnMinEndpointingDelay: data?.metadata?.turnMinEndpointingDelay,
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
    // feedbackTabs mirrors the backend resolver exactly: an absent
    // `feedbackTabs` object (every scenario saved before this feature
    // existed) hydrates as all three ON, and within the object each key is
    // ON unless explicitly `false`. Only `=== false` reads as off.
    feedbackTabDebrief: (data?.metadata as any)?.feedbackTabs?.debrief !== false,
    feedbackTabSkills: (data?.metadata as any)?.feedbackTabs?.skills !== false,
    feedbackTabTranscript: (data?.metadata as any)?.feedbackTabs?.transcript !== false,
    // Opt-in toggle: missing → disabled (only an explicit true enables it).
    pauseEnabled: (data?.metadata as any)?.pauseEnabled ?? false,
    // Same opt-in shape: a roleplay saved before live supervisor notes existed
    // hydrates as off, which is also the intended default for new ones.
    supervisorNotesEnabled: (data?.metadata as any)?.supervisorNotesEnabled === true,
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
