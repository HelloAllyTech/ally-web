import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FieldValues, useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useCreateSimulationMutation,
  useDeleteCoverImageMutation,
  useGetAvailableLanguageVoicesQuery,
  useGetMappedScenarioEventsQuery,
  useGetPromptsQuery,
  useLazyGetAdminSimulationByIdQuery,
  useUpdateSimulationByIdMutation,
  useUpdateScenarioVersionMutation,
  usePublishScenarioVersionMutation,
  useGetScenarioVersionsQuery,
} from "@api";
import { ArrowDown, DoubleArrowRight, WarningAlt } from "@assets";
import {
  ActionConfirmationPopup,
  AgentBuilderCopilotWizard,
  AppTooltip,
  Button,
  CreateSimulationSubSection,
  ReportSection,
  ReportSectionHandle,
  ReportPrimaryTab,
  ScenarioVersionPanel,
  SimulationEventMapTable,
  SimulationPreview,
  TranslationJob,
  TranslationLanguageProgress,
  TranslationProgressToast,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
  ADVANCED_EVENTS_LATENCY_THRESHOLD,
  en,
  ROUTES,
  StepperList,
  SIMULATION_CREATOR_FIELD_GROUPS,
  SIMULATION_CREATOR_STEP_IDS,
  SESSION_TIMER_CONFIG,
  FORM_FIELD_IDS,
  isValidStateInstructionId,
  ROLE_INSTRUCTION_PROMPT_CODE,
  BEHAVIOUR_STATES,
  SIMULATION_CATEGORY,
  TooltipLocation,
} from "@constants";
import { useDebounce, useScenarioTranslationsSocket } from "@hooks";
import { selectUploadsInProgress } from "@reducer/reportUploadReducer";
import {
  ScenarioTranslationStatus,
  SimulationStatus,
  SimulationPreviewType,
  triggerWarning,
  behaviourInstruction,
  knowledgeSource,
  TranslationProgressPayload,
  ScenarioVersionStatus,
  formatVersionLabel,
} from "@types";
import {
  getCreateSimulationSubSectionById,
  buildFeedbackTabsPayload,
  buildToggleDefaultValues,
  formatSimulationResponseData,
  formatVersionConfigToForm,
  isNonEmptyString,
  extractValidData,
  isEmpty,
  isNonEmptyArray,
  validateTimeRange,
} from "@utils";

const stepIds: any = SIMULATION_CREATOR_STEP_IDS;

// How often the background timer attempts to autosave an unsaved draft.
const AUTOSAVE_INTERVAL_MS = 10_000;

// Fallback title for draft roleplays saved without an explicit title. Stamps
// the current date/time so successive untitled drafts stay distinguishable in
// the simulation list (e.g. "Untitled Roleplay - Jun 22, 2026, 3:42 PM").
const generateDraftTitle = (): string => {
  const stamp = new Date().toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${en.simulation.untitledRoleplay} - ${stamp}`;
};

// Get all mandatory field IDs from the configuration
const getMandatoryFieldIds = () => {
  const mandatoryFields: string[] = [];
  const fieldGroups = SIMULATION_CREATOR_FIELD_GROUPS;
  fieldGroups.forEach(group => {
    group.fields.forEach(field => {
      if (field.isMandatory) {
        mandatoryFields.push(field.id);
      }
    });
  });
  return mandatoryFields;
};

const isOverviewMandatoryValueFilled = (fieldId: string, value: unknown): boolean => {
  if (value instanceof FileList) {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  switch (fieldId) {
    case FORM_FIELD_IDS.TITLE:
    case FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT:
      return typeof value === "string" && value.trim().length > 0;
    case FORM_FIELD_IDS.COMPETENCY:
      if (value == null || value === "") return false;
      if (typeof value === "object" && value !== null && "id" in value) {
        const id = (value as { id?: unknown }).id;
        return id !== null && id !== undefined && String(id).length > 0;
      }
      if (typeof value === "number") return !Number.isNaN(value);
      if (typeof value === "string") return value.trim().length > 0;
      return false;
    case FORM_FIELD_IDS.COVER_IMAGE_URL:
      return typeof value === "string" && value.trim().length > 0;
    case FORM_FIELD_IDS.DIFFICULTY_LEVEL:
      return value !== null && value !== undefined && String(value).length > 0;
    default:
      return !isEmpty(value);
  }
};

const getMissingOverviewMandatoryLabels = (values: Record<string, unknown>): string[] => {
  const overviewFields = SIMULATION_CREATOR_FIELD_GROUPS?.[0]?.fields ?? [];
  const missing: string[] = [];
  for (const field of overviewFields) {
    if (!field.isMandatory) continue;
    if (!isOverviewMandatoryValueFilled(field.id, values[field.id])) {
      missing.push(field.label);
    }
  }
  return missing;
};

export interface CreateSimulationProps {
  /**
   * Read-only "View Details" mode (route /create-simulation/view/:id): the
   * whole editor renders inert and NOTHING is ever saved — no autosave, no
   * draft flush, no publish — so a published simulation stays published.
   */
  viewMode?: boolean;
}

export const CreateSimulation: FC<CreateSimulationProps> = ({ viewMode = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [simulationId, setSimulationId] = useState<string | undefined>(id);
  // The Agent Builder Copilot tab is the canonical builder surface — its left
  // pane is the Basic Settings form — so it's always the initial tab. (The
  // report-in-progress effect below can still redirect to the Report tab.)
  const [currentStep, setCurrentStep] = useState(stepIds.agentBuilderCopilot);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showOptionalFieldsWarning, setShowOptionalFieldsWarning] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSimulation, setPreviewSimulation] = useState<SimulationPreviewType | null>(null);
  // Agent Builder Copilot tab: whether the right-half chat pane is collapsed.
  // Default expanded; collapsing hands the full canvas to the Basic Settings
  // mirror on the left.
  const [isCopilotCollapsed, setIsCopilotCollapsed] = useState(false);

  // Version management. `activeVersionId` is the version subsequent test
  // reports/previews run against; editing a version's isolated config is the
  // remaining integration (form-load + autosave retarget).
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(undefined);
  // Event mappings (Advanced Settings) live in a separate table, so they're
  // carried on the version config as `mappedEvents`. `versionEvents` seeds the
  // event table when editing a draft; the ref holds the latest set to fold into
  // the version autosave; the json ref dedupes the table's initial hydration
  // report so opening a draft doesn't trigger a spurious save.
  const [versionEvents, setVersionEvents] = useState<any[] | undefined>(undefined);
  const draftMappedEventsRef = useRef<any[] | undefined>(undefined);
  const lastEventsJsonRef = useRef<string | undefined>(undefined);

  // Shared cache with the version panel (same query args). Used to label the
  // header trigger with the version currently in the editor.
  const { data: scenarioVersions = [] } = useGetScenarioVersionsQuery(
    { scenarioId: simulationId as string },
    // Skipped in view mode: listing versions lazily seeds a v1 row server-side
    // (a write), and the version panel is hidden there anyway.
    { skip: !simulationId || viewMode },
  );
  const currentVersion =
    scenarioVersions.find(v => v.id === activeVersionId) ??
    scenarioVersions.find(v => v.status === ScenarioVersionStatus.PUBLISHED) ??
    scenarioVersions[0];
  // An explicitly-selected non-draft (archived) version is read-only — edits
  // can't be saved to it; the user must branch.
  const activeVersion = activeVersionId
    ? scenarioVersions.find(v => v.id === activeVersionId)
    : undefined;
  const isActiveVersionReadOnly =
    !!activeVersion && activeVersion.status !== ScenarioVersionStatus.DRAFT;

  const containerRef = useRef<HTMLDivElement>(null);
  const reportStepRef = useRef<ReportSectionHandle>(null);
  const [, setReportPrimaryTab] = useState<ReportPrimaryTab>("report");

  const [translationJobs, setTranslationJobs] = useState<Record<string, TranslationJob>>({});
  const dismissTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const dismissTranslationJob = useCallback((jobId: string) => {
    const timeout = dismissTimeoutsRef.current[jobId];
    if (timeout) {
      clearTimeout(timeout);
      delete dismissTimeoutsRef.current[jobId];
    }
    setTranslationJobs(prev => {
      if (!prev[jobId]) return prev;
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  const scheduleAutoDismiss = useCallback(
    (jobId: string, delayMs: number) => {
      if (dismissTimeoutsRef.current[jobId]) {
        clearTimeout(dismissTimeoutsRef.current[jobId]);
      }
      dismissTimeoutsRef.current[jobId] = setTimeout(() => dismissTranslationJob(jobId), delayMs);
    },
    [dismissTranslationJob],
  );

  const handleTranslationProgress = useCallback(
    (payload: TranslationProgressPayload) => {
      setTranslationJobs(prev => {
        const existing = prev[payload.jobId];
        const existingLanguages: TranslationLanguageProgress[] = existing?.languages ?? [];

        let nextLanguages = existingLanguages;
        if (payload.language) {
          const idx = existingLanguages.findIndex(l => l.code === payload.language);
          const statusForLang: TranslationLanguageProgress["status"] =
            payload.status === ScenarioTranslationStatus.TRANSLATING
              ? "translating"
              : payload.status === ScenarioTranslationStatus.TRANSLATED
                ? "translated"
                : payload.status === ScenarioTranslationStatus.LANGUAGE_FAILED
                  ? "failed"
                  : (existingLanguages[idx]?.status ?? "pending");

          const entry: TranslationLanguageProgress = {
            code: payload.language,
            status: statusForLang,
            error: payload.error,
          };
          if (idx >= 0) {
            nextLanguages = [...existingLanguages];
            nextLanguages[idx] = entry;
          } else {
            nextLanguages = [...existingLanguages, entry];
          }
        }

        let nextStatus: TranslationJob["status"];
        if (payload.status === ScenarioTranslationStatus.COMPLETED) {
          nextStatus = "completed";
        } else if (payload.status === ScenarioTranslationStatus.FAILED) {
          nextStatus = "failed";
        } else if (payload.status === ScenarioTranslationStatus.STARTED) {
          nextStatus = "started";
        } else {
          nextStatus = "in_progress";
        }

        const job: TranslationJob = {
          jobId: payload.jobId,
          scenarioId: payload.scenarioId,
          scenarioTitle: payload.scenarioTitle ?? existing?.scenarioTitle,
          action: payload.action,
          status: nextStatus,
          completed: payload.completed ?? existing?.completed ?? 0,
          total: payload.total ?? existing?.total ?? 0,
          languages: nextLanguages,
          error:
            payload.status === ScenarioTranslationStatus.FAILED ? payload.error : existing?.error,
          startedAt: existing?.startedAt ?? Date.now(),
          completedAt:
            payload.status === ScenarioTranslationStatus.COMPLETED ||
            payload.status === ScenarioTranslationStatus.FAILED
              ? Date.now()
              : existing?.completedAt,
        };

        return { ...prev, [payload.jobId]: job };
      });

      if (
        payload.status === ScenarioTranslationStatus.COMPLETED ||
        payload.status === ScenarioTranslationStatus.FAILED
      ) {
        scheduleAutoDismiss(payload.jobId, 4000);
      }
    },
    [scheduleAutoDismiss],
  );

  useScenarioTranslationsSocket({ onTranslationProgress: handleTranslationProgress });

  useEffect(() => {
    const timeouts = dismissTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const translationJobsList = useMemo(
    () => Object.values(translationJobs).sort((a, b) => a.startedAt - b.startedAt),
    [translationJobs],
  );

  // API mutation for creating simulation
  const [createSimulationQuery, { isLoading: isCreatingSimulation }] =
    useCreateSimulationMutation();
  const [updateSimulationByIdQuery] = useUpdateSimulationByIdMutation();
  const [updateScenarioVersionQuery] = useUpdateScenarioVersionMutation();
  const [publishScenarioVersionQuery, { isLoading: isPublishingVersion }] =
    usePublishScenarioVersionMutation();
  const [getAdminSimulationByIdQuery, { data: adminSimulationByIdData }] =
    useLazyGetAdminSimulationByIdQuery();
  const [deleteCoverImage] = useDeleteCoverImageMutation();
  const { data: availableLanguages = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: Array<{ language_id: number; value: string; label: string }> };
  const { data: roleInstructionPrompts = [] } = useGetPromptsQuery({
    searchName: ROLE_INSTRUCTION_PROMPT_CODE,
    limit: 20,
    offset: 0,
    includeBlocks: false,
  });

  // Advanced (mapped) event count, sourced from the same RTK Query cache the
  // Advanced Settings tab's event table uses (shared SIMULATION_EVENTS tag), so
  // adding/removing events there keeps this count live without a refetch here.
  // Skipped until the draft has an id — a brand-new simulation has no events yet.
  const { data: mappedScenarioEventsData } = useGetMappedScenarioEventsQuery(
    { id: String(simulationId ?? "") },
    { skip: !simulationId },
  );
  const advancedEventsCount = mappedScenarioEventsData?.data?.length ?? 0;
  const showAdvancedEventsLatencyWarning = advancedEventsCount > ADVANCED_EVENTS_LATENCY_THRESHOLD;

  // Every TOGGLE_BUTTON's declared default, seeded as the form's baseline so a
  // brand-new roleplay saves what its field config says even for a toggle on a
  // step the author never opened. Resolved here rather than at module load: the
  // field groups come from the `@constants` barrel, which several test files
  // mock wholesale (see CLAUDE.md). useForm only reads `defaultValues` on the
  // first render, and the field groups are static, so the memo is just hygiene.
  const toggleDefaultValues = useMemo(
    () => buildToggleDefaultValues(SIMULATION_CREATOR_FIELD_GROUPS),
    [],
  );

  // `FieldValues` is pinned explicitly: without it, `defaultValues` narrows the
  // form's value type to the toggles' `Record<string, boolean>` and every
  // non-boolean field in this file (title, prompt, maxTimeValue, …) starts
  // failing to typecheck.
  const formMethods = useForm<FieldValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toggleDefaultValues,
  });

  const managedRoleInstruction = useMemo(
    () =>
      roleInstructionPrompts.find(prompt => prompt.promptCode === ROLE_INSTRUCTION_PROMPT_CODE)
        ?.prompt ?? "",
    [roleInstructionPrompts],
  );

  const uploadsInProgress = useSelector(selectUploadsInProgress);
  const isReportGenerationInProgress = uploadsInProgress.some(
    upload => simulationId != null && String(upload.scenarioId) === String(simulationId),
  );

  const hasSetInitialStepForReportInProgress = useRef(false);
  useEffect(() => {
    if (
      simulationId &&
      isReportGenerationInProgress &&
      !hasSetInitialStepForReportInProgress.current
    ) {
      setCurrentStep(stepIds.report);
      hasSetInitialStepForReportInProgress.current = true;
    }
  }, [simulationId, isReportGenerationInProgress]);

  useEffect(() => {
    if (simulationId) getAdminSimulationByIdQuery(simulationId);
  }, [simulationId, getAdminSimulationByIdQuery]);

  useEffect(() => {
    // When a draft version is loaded into the form, don't let a refetch of the
    // live scenario clobber the in-editor draft.
    if (activeVersionId) return;
    if (adminSimulationByIdData) {
      formMethods.reset(formatSimulationResponseData(adminSimulationByIdData));
    }
  }, [adminSimulationByIdData, formMethods, activeVersionId]);

  useEffect(() => {
    if (simulationId) return;
    if (!isNonEmptyString(managedRoleInstruction)) return;
    if (isNonEmptyString(formMethods.getValues("prompt"))) return;

    formMethods.setValue("prompt", managedRoleInstruction, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [simulationId, managedRoleInstruction, formMethods]);

  const {
    formState: { dirtyFields },
    watch,
  } = formMethods;

  // Watch all form values to check mandatory fields
  const formValues = watch();

  // Custom validation to check if all mandatory fields are filled
  const areAllMandatoryFieldsFilled = useMemo(() => {
    const mandatoryFieldIds = getMandatoryFieldIds();
    return mandatoryFieldIds.every(fieldId => {
      const value = formValues[fieldId];
      if (isEmpty(value)) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (value instanceof FileList && value.length === 0) return false;
      if (fieldId === FORM_FIELD_IDS.LANGUAGES_VOICES) {
        const mappings = value as Record<string, string> | undefined;
        const hasAnyVoiceSelected = !!mappings && Object.values(mappings).some(v => !!v);
        if (!hasAnyVoiceSelected) return false;
      }
      if (fieldId === FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) {
        const behaviorInstructions = value as behaviourInstruction[];
        // A behaviour rule is "complete" with just category + at least
        // one linked behaviour — those two fields drive scoring in every
        // prompt variant. Per-state coaching cells (when shown by the
        // unified table for legacy variants) are optional content that
        // authors can fill in when relevant; they're not gating fields.
        // Previously per-state instructions were required, but that's
        // incompatible with Prompt #2-style variants where the per-state
        // columns are hidden entirely.
        if (
          behaviorInstructions.some(
            instruction => instruction.behaviors.length === 0 || instruction.category.length === 0,
          )
        )
          return false;
      }
      return true;
    });
  }, [formValues]);

  const overviewMissingMandatoryLabels = useMemo(
    () => getMissingOverviewMandatoryLabels(formValues as Record<string, unknown>),
    [formValues],
  );

  const areAllMandatoryFieldsFilledInOverview = overviewMissingMandatoryLabels.length === 0;

  const emptyOptionalFields = useMemo(() => {
    const fields: { id: string; label: string }[] = [
      { id: FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT, label: "Character Backstory" },
      // Role Instructions is now a mandatory field, so it's handled by the
      // mandatory-field gate, not the "empty optional fields" warning.
      { id: FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS, label: "Behaviour Instructions" },
      { id: FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES, label: "Linguistic Style Samples" },
    ];
    return fields.filter(({ id }) => {
      const value = formValues[id];
      if (!value) return true;
      if (Array.isArray(value) && value.length === 0) return true;
      if (typeof value === "string" && value.trim() === "") return true;
      return false;
    });
  }, [formValues]);

  const handlePageBack = () => {
    if (!viewMode && Object.keys(dirtyFields).length > 0) {
      setShowDiscardPopup(true);
    } else {
      navigate(-1);
    }
  };

  // Core function to save simulation changes.
  // `silent` suppresses validation error toasts — used by the background
  // autosave so a not-yet-valid draft fails quietly and simply retries on the
  // next tick instead of spamming the user with toasts.
  const saveSimulationChangesCore = async (
    status: SimulationStatus,
    options?: { silent?: boolean },
  ) => {
    // Hard guard: View Details must never write. Every save entry point is
    // already gated, but this keeps a future call site from silently
    // demoting a published sim to draft.
    if (viewMode) return null;
    const silent = options?.silent ?? false;
    const formData = formMethods.getValues();
    if (!formData.title?.trim()) {
      // For drafts, a missing title shouldn't block the (auto)save — generate a
      // readable, timestamped fallback name and write it back into the form so
      // the user sees the same title that gets persisted. Publishing still
      // requires an explicit title.
      if (status === SimulationStatus.DRAFT) {
        const autoTitle = generateDraftTitle();
        formMethods.setValue(FORM_FIELD_IDS.TITLE, autoTitle, {
          shouldDirty: true,
          shouldTouch: true,
        });
        formData.title = autoTitle;
      } else {
        if (!silent) toast.error(en.errors.titleIsRequired);
        return null;
      }
    }

    if (formData.timerMode && formData.maxTimeValue) {
      if (
        !validateTimeRange(
          formData.maxTimeValue,
          SESSION_TIMER_CONFIG.MIN_TIME,
          SESSION_TIMER_CONFIG.MAX_TIME,
        )?.isValid
      ) {
        if (!silent)
          toast.error(
            en.simulation.maxTimeError(
              SESSION_TIMER_CONFIG.MIN_TIME,
              SESSION_TIMER_CONFIG.MAX_TIME,
            ),
          );
        return null;
      }
    }

    const rawBehaviorInstructions = formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) as
      | behaviourInstruction[]
      | undefined;

    if (isNonEmptyArray(rawBehaviorInstructions)) {
      const hasInvalidStateId = rawBehaviorInstructions.some(instruction =>
        (instruction.stateInstructions ?? []).some(si => !isValidStateInstructionId(si?.stateId)),
      );
      if (hasInvalidStateId) {
        if (!silent) toast.error(en.errors.invalidStateInstructionIds);
        return null;
      }
    }

    // Delete cover image from s3 if it is changed. Only in live mode — while
    // editing a draft version the live scenario still references this asset
    // (until publish), so deleting it would break the live cover image.
    if (
      !activeVersionId &&
      isNonEmptyString(adminSimulationByIdData?.coverImageUrl) &&
      adminSimulationByIdData?.coverImageUrl !== formData.coverImageUrl
    ) {
      try {
        await deleteCoverImage({ coverImageUrl: adminSimulationByIdData.coverImageUrl }).unwrap();
      } catch (error: any) {
        if (!silent) toast.error(error?.data?.message || en.errors.fileUploadFailed);
      }
    }

    const {
      openingStatements,
      translationOpeningStatements,
      translationDescription,
      translationTitle,
      reminders,
      translationReminders,
      triggerWarningIds,
      customFields,
      agentDialogues,
      behaviorInstructions,
      maxTimeValue,
      timerMode,
      ...restForm
    } = formData;

    const openingStatementsArray = isNonEmptyString(openingStatements)
      ? openingStatements.split("\n").filter((line: string) => line.length > 0)
      : null;

    const splitReminderLines = (text: string | undefined) =>
      isNonEmptyString(text)
        ? text
            .split("\n")
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0)
        : [];

    const remindersArray = splitReminderLines(reminders);
    const translationRemindersArray = Object.fromEntries(
      Object.entries((translationReminders ?? {}) as Record<string, string>).map(
        ([languageId, text]) => [languageId, splitReminderLines(text)],
      ),
    );

    const agentDialoguesArray = isNonEmptyString(agentDialogues)
      ? agentDialogues
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
      : null;

    const triggerWarning = isNonEmptyArray(triggerWarningIds)
      ? (triggerWarningIds as triggerWarning[])
          .filter(trigger => !isEmpty(trigger))
          .map(trigger => trigger.id)
      : [];

    // filter out empty values from languageVoiceMapping
    // Same treatment as languageVoices: an empty selection means "inherit this
    // language's default", which is the absence of a key, not an empty string.
    restForm.sttConfigByLanguage = restForm.sttConfigByLanguage
      ? Object.fromEntries(
          Object.entries(restForm.sttConfigByLanguage || {}).filter(([, v]) => !!v),
        )
      : {};

    if (restForm.languageVoices) {
      restForm.languageVoices = Object.fromEntries(
        Object.entries(restForm.languageVoices || {}).filter(([, v]) => v !== ""),
      );
    } else {
      restForm.languageVoices = {};
    }

    const customFieldGroupList = customFields?.map((field: any) => ({
      name: field.name,
      value: field.value,
      useInDefaultPrompt: field.useInDefaultPrompt ?? true,
    }));

    const normalizeInstructions = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
        : String(value ?? "")
            .split("\n")
            .map(text => text.trim())
            .filter(Boolean);

    const uniqueBehaviorIds = (behaviors: unknown): string[] => {
      const ids = (Array.isArray(behaviors) ? behaviors : [])
        .map((behavior: any) => {
          const raw = behavior?.id ?? behavior;
          return raw.length > 0 ? raw : null;
        })
        .filter((id): id is string => id !== null);
      return [...new Set(ids)];
    };

    const behaviourInstructionsArray = [];

    if (isNonEmptyArray(behaviorInstructions)) {
      behaviorInstructions?.forEach((instruction: any) => {
        if (
          isNonEmptyString(instruction?.category) ||
          isNonEmptyArray(instruction?.behaviors) ||
          normalizeInstructions(instruction?.instructions).length > 0
        ) {
          const entry: any = {
            category: instruction.category,
            behaviors: uniqueBehaviorIds(instruction.behaviors),
            instructions: normalizeInstructions(instruction.instructions),
            stateInstructions: (instruction.stateInstructions ?? [])
              .filter((si: any) => isNonEmptyString(si?.instruction))
              .map((si: any) => ({
                stateId: si.stateId,
                instruction: si.instruction,
              })),
          };

          behaviourInstructionsArray.push(entry);
        }
      });
    }

    const simulationData = {
      ...extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, restForm),
      openingStatements: openingStatementsArray,
      translationOpeningStatements: translationOpeningStatements ?? {},
      translationDescription: translationDescription ?? {},
      translationTitle: translationTitle ?? {},
      reminders: remindersArray,
      translationReminders: translationRemindersArray,
      agentDialogues: agentDialoguesArray,
      customFields: customFieldGroupList,
      triggerWarningIds: triggerWarning,
      status,
      behaviorInstructions: behaviourInstructionsArray,
      competencyId: restForm.competency?.id,
      maxTimeValue: timerMode ? maxTimeValue : null,
      timerMode: timerMode,
      knowledgeSources: Array.isArray(restForm.knowledgeSources)
        ? restForm.knowledgeSources.map((item: knowledgeSource) => ({
            id: item.id,
            title: item.title,
            content: item.content,
          }))
        : [],
      // Which post-session tabs this roleplay shows, nested under the
      // enableFeedback master switch. Always send all three keys — a
      // partial object could be misread by the backend resolver's per-key
      // defaults (debrief/transcript on, skills off) for whichever key is
      // missing. Sent regardless of enableFeedback's own value: turning the master
      // switch off only hides these controls in the form, it doesn't clear
      // their stored preference (see the field configs in
      // SimulationCreator.ts), so re-enabling it later restores them as-is.
      feedbackTabs: buildFeedbackTabsPayload(restForm),
      // Carry the draft's event mappings on the version config (only when
      // editing a version and the event table has provided them). The live
      // update path ignores this key; publish replays it to scenario_events.
      ...(activeVersionId && draftMappedEventsRef.current !== undefined
        ? { mappedEvents: draftMappedEventsRef.current }
        : {}),
    };

    // The three sub-toggles above are folded into feedbackTabs; drop their
    // flat copies (added by extractValidData, which normalizes every
    // SIMULATION_CREATOR_FIELD_GROUPS field including these) so the payload
    // matches the backend contract exactly instead of also carrying loose
    // top-level booleans.
    delete (simulationData as any).feedbackTabDebrief;
    delete (simulationData as any).feedbackTabSkills;
    delete (simulationData as any).feedbackTabTranscript;

    if (Array.isArray((simulationData as any).stateNames)) {
      const filtered = ((simulationData as any).stateNames as any[]).filter(sn =>
        isValidStateInstructionId(sn.stateId),
      );
      (simulationData as any).stateNames =
        filtered.length > 0
          ? filtered
          : BEHAVIOUR_STATES.map(s => ({ stateId: s.stateId, name: `State ${s.stateId}` }));
    }

    // Drop incomplete simulation-state cards before save. StatesEditor
    // auto-seeds a blank card so the editor isn't visually empty when a
    // hasStates variant is selected; if the user doesn't fill in at least
    // the `name`, the backend's SimulationStateDto.name is @IsNotEmpty()
    // and would 400 the request. States are optional overall — an empty
    // array is valid. We require `name` specifically (not just "any field
    // touched") because that's what the backend validates as mandatory;
    // filtering on OR would allow guidelines-only states that still 400.
    if (Array.isArray((simulationData as any).states)) {
      const filledStates = ((simulationData as any).states as any[]).filter(
        s => typeof s?.name === "string" && s.name.trim().length > 0,
      );
      // When all state cards are blank the user hasn't configured any states.
      // Send null (not []) so the backend treats this as "not configured" and
      // skips validation against the prompt variant's {state_x_guidelines}.
      // Send undefined (not null) when empty so ally-be's merge logic excludes
      // the field and preserves any states already stored in metadata.
      (simulationData as any).states = filledStates.length > 0 ? filledStates : undefined;
    }

    // The partner-org tag only means something for Partner Sim entries; when
    // the category is anything else the field is hidden in the form, so clear
    // the stale value instead of persisting it invisibly.
    if ((simulationData as any).category !== SIMULATION_CATEGORY.PARTNER_SIM) {
      (simulationData as any).partnerOrgName = null;
    }

    // Normalize empty-string selectedMainPromptCode to undefined.
    // DropdownField's `allowDeselect` writes "" on clear, but downstream
    // (ai-learn / scenario metadata) treats `undefined` and `""` differently
    // in some paths. Sending `undefined` keeps the field cleanly absent so
    // resolver fallback to default kicks in without ambiguity.
    if ((simulationData as any).selectedMainPromptCode === "") {
      (simulationData as any).selectedMainPromptCode = undefined;
    }

    // Archived versions are immutable read-only snapshots; never attempt to
    // persist edits to them (the version PUT would 400). Guide the user to
    // branch instead. (The published version is edited via the live path —
    // selecting it clears activeVersionId.)
    if (simulationId && activeVersionId) {
      const activeVer = scenarioVersions.find(v => v.id === activeVersionId);
      if (activeVer && activeVer.status !== ScenarioVersionStatus.DRAFT) {
        if (!silent) toast.error(en.simulation.versions.readOnlyEdit);
        return null;
      }
    }

    let response;
    if (simulationId && activeVersionId) {
      // Editing an isolated draft version: persist the snapshot to the version,
      // not the live scenario. The live record only changes on publish.
      response = await updateScenarioVersionQuery({
        scenarioId: simulationId,
        versionId: activeVersionId,
        config: simulationData,
      });
    } else if (simulationId) {
      response = await updateSimulationByIdQuery({
        id: simulationId,
        simulation: simulationData,
      });
    } else {
      if (!isCreatingSimulation) {
        response = await createSimulationQuery({
          scenarios: [simulationData],
        });
        navigate(ROUTES.EDIT_SIMULATION(response?.data?.[0]?.id), { replace: true });
      }
    }
    return response;
  };

  // Debounced version to prevent duplicate simulation creation (500ms delay)
  const saveSimulationChanges = useDebounce(saveSimulationChangesCore, 500);

  // Persist the current draft/live edits before switching versions. Autosave
  // only runs on a 10s interval, so without this a quick switch would discard
  // any field changes (e.g. Skill version) made since the last tick when the
  // form is reset to the incoming version.
  const flushPendingEdits = async () => {
    if (viewMode) return;
    if (Object.keys(dirtyFields).length === 0) return;
    if (isActiveVersionReadOnly) return; // archived snapshot — nothing to save
    try {
      await saveSimulationChangesCore(SimulationStatus.DRAFT, { silent: true });
    } catch {
      /* best-effort — proceed with the switch even if the flush fails */
    }
  };

  const handleSaveDraft = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      const response = await saveSimulationChanges(SimulationStatus.DRAFT, options);
      if (response && !response.error) {
        if (response?.data?.[0]?.id && !simulationId) {
          setSimulationId(response?.data?.[0]?.id);
        }
        // Reset form to clear dirtyFields after successful save
        const currentFormValues = formMethods.getValues();
        formMethods.reset(currentFormValues);

        return response?.data;
      } else if (response?.error) {
        const serverMessage = response?.error?.data?.message;
        // "…can't be moved to draft" (Tracks/Case member): permanent for this
        // sim, so remember it — the autosave gate stops retrying and the
        // indicator explains instead of a generic "couldn't save".
        if (typeof serverMessage === "string" && serverMessage.includes("moved to draft")) {
          setDraftSaveBlockedMessage(serverMessage);
        }
        if (!silent) toast.error(serverMessage || en.errors.failedSimulationChange);
        return null;
      }
      return response?.data;
    } catch {
      if (!silent) toast.error(en.errors.failedSimulationChange);
      return null;
    }
  };

  // Background autosave. A timer periodically persists the draft on its own so
  // in-progress work isn't lost. We keep the latest closure in a ref and run a
  // single stable interval, so changing form state / save handlers don't churn
  // the timer. The save is silent (no toasts) and only runs when there are
  // genuine unsaved changes and nothing else is mid-flight.
  const isAutosavingRef = useRef(false);
  // Drives the subtle inline indicator next to the Save button. `error` means
  // the last background autosave failed — surfaced so silent failures don't
  // look like successful saves.
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Set when the backend refuses to move this sim to draft (it belongs to a
  // Tracks/Case, whose members may only be edited-and-published). Every draft
  // save would hit the same 400, so autosave stops retrying and the inline
  // indicator shows the backend's reason; Publish remains the save path.
  const [draftSaveBlockedMessage, setDraftSaveBlockedMessage] = useState<string | null>(null);
  const autosaveRef = useRef<() => void>(() => {});
  autosaveRef.current = () => {
    if (viewMode) return; // View Details never saves
    if (draftSaveBlockedMessage) return; // backend refuses drafts for this sim
    if (isAutosavingRef.current) return; // an autosave is already running
    if (isCreatingSimulation) return; // a create/publish is in flight
    if (isReportGenerationInProgress) return; // don't fight report generation
    if (Object.keys(dirtyFields).length === 0) return; // nothing to save

    isAutosavingRef.current = true;
    setAutosaveState("saving");
    // handleSaveDraft returns truthy data on success, `null` on a genuine
    // failure, and `undefined` for benign no-ops (debounce superseded /
    // read-only version). Only `null`/throw is an error.
    void handleSaveDraft({ silent: true })
      .then(data => setAutosaveState(data === null ? "error" : data ? "saved" : "idle"))
      .catch(() => setAutosaveState("error"))
      .finally(() => {
        isAutosavingRef.current = false;
      });
  };

  useEffect(() => {
    const interval = setInterval(() => autosaveRef.current(), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Browser-level unsaved-changes guard (in addition to the in-app discard
  // popup). Background autosave above closes most of the gap, but only runs
  // every AUTOSAVE_INTERVAL_MS — a real tab close in between still lost
  // whatever changed since the last tick with no warning at all. Mirrors
  // CreateTrack.tsx's guard.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!viewMode && Object.keys(dirtyFields).length > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [viewMode, dirtyFields]);

  // Note: a brand-new roleplay is NOT persisted on mount. Nothing is saved until
  // the user actually edits a field — at which point the interval autosave above
  // (gated on `dirtyFields`) picks it up. A draft saved without an explicit title
  // still gets a timestamped fallback name in `saveSimulationChangesCore`. This
  // avoids littering the simulation list with empty "Untitled Roleplay" drafts
  // from people who merely open the create page and leave.

  const doPublish = async () => {
    try {
      // Publishing the selected version. For a draft, persist its latest edits
      // first; for a published/archived version (e.g. a rollback) the snapshot
      // is immutable, so skip the save and publish it directly.
      if (simulationId && activeVersionId) {
        const activeVer = scenarioVersions.find(v => v.id === activeVersionId);
        if (activeVer?.status === ScenarioVersionStatus.DRAFT) {
          await saveSimulationChangesCore(SimulationStatus.DRAFT, { silent: true });
        }
        const res: any = await publishScenarioVersionQuery({
          scenarioId: simulationId,
          versionId: activeVersionId,
        });
        if (res?.error) {
          toast.error(res?.error?.data?.message || en.errors.failedSimulationCreation);
          return;
        }
        toast.success(en.simulation.versions.published);
        navigate(ROUTES.SIMULATION_STUDIO);
        return;
      }

      const response = await saveSimulationChanges(SimulationStatus.ACTIVE);

      // A superseded/cancelled debounced call resolves to `undefined`; treat
      // that as "nothing happened" rather than dereferencing it.
      if (!response) return;
      if (response.error) {
        toast.error(response?.error?.data?.message || en.errors.failedSimulationCreation);
      } else {
        navigate(ROUTES.SIMULATION_STUDIO);
      }
    } catch {
      toast.error(en.errors.failedSimulationCreation);
    }
  };

  const handlePublish = () => {
    if (emptyOptionalFields.length > 0) {
      pendingActionRef.current = doPublish;
      setShowOptionalFieldsWarning(true);
    } else {
      doPublish();
    }
  };

  const handleDiscardChanges = () => {
    setShowDiscardPopup(false);
    navigate(-1);
  };

  const handleSaveAndExit = async () => {
    const response = await saveSimulationChanges(SimulationStatus.DRAFT);
    if (response) {
      setShowDiscardPopup(false);
      navigate(-1);
      toast.success("Simulation changes saved successfully!");
    }
  };

  const handleCloseDiscardPopup = () => {
    setShowDiscardPopup(false);
  };

  const handleStepClick = async (stepId: string) => {
    if (isReportGenerationInProgress) {
      return;
    }
    // Entering the Agent Builder Copilot tab is unconditional — it's the builder
    // itself, so it never requires mandatory fields or a saved draft to open.
    if (stepId === stepIds.agentBuilderCopilot) {
      setCurrentStep(stepId);
      containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Leaving the builder for Advanced Settings / Report requires the mandatory
    // Basic Settings fields — the form lives in the builder's left pane now that
    // Basic Settings is no longer a separate tab.
    if (currentStep === stepIds.agentBuilderCopilot) {
      if (!areAllMandatoryFieldsFilledInOverview) {
        toast.error(
          overviewMissingMandatoryLabels.length > 0
            ? `${en.errors.overviewMandatoryFieldsNotFilled} — ${overviewMissingMandatoryLabels.join(", ")}`
            : en.errors.overviewMandatoryFieldsNotFilled,
        );
        return;
      }
    }
    //TODO: add report step to the requiresSave condition
    const requiresSave = stepId === stepIds.advancedSettings || stepId === stepIds.report;

    if (requiresSave && !simulationId) {
      const response = await handleSaveDraft();
      if (response) setCurrentStep(stepId);
      else toast.error(en.errors.failedToProceed);
    } else {
      setCurrentStep(stepId);
    }
    // Scroll to top when moving to next step
    containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderStep = (component: React.ReactNode) => component;

  const renderCurrentStep = () => {
    switch (currentStep) {
      case stepIds.advancedSettings:
        return renderStep(
          // View mode: the event table has no readOnly prop of its own, so the
          // whole tab is rendered inert (saveSimulationChangesCore also
          // hard-refuses to write in view mode, as defense-in-depth).
          <div className={viewMode ? "pointer-events-none select-text opacity-80" : undefined}>
            <SimulationEventMapTable
              simulationId={simulationId}
              versionId={activeVersionId}
              versionEvents={versionEvents}
              onVersionEventsChange={events => {
                if (viewMode) return;
                draftMappedEventsRef.current = events;
                const json = JSON.stringify(events ?? null);
                // Skip the table's initial hydration report; persist real edits.
                if (json === lastEventsJsonRef.current) return;
                lastEventsJsonRef.current = json;
                saveSimulationChanges(SimulationStatus.DRAFT, { silent: true });
              }}
            />
          </div>,
        );
      case stepIds.agentBuilderCopilot: {
        // Split the canvas into two halves (collapsible — see the toggle
        // below). The left half is a live mirror of the Basic Settings tab: it
        // renders the EXACT same CreateSimulationSubSection bound to the SAME
        // shared `formMethods` instance, so it's the same form surfaced in two
        // places. react-hook-form holds a single source of truth, so edits here
        // and on the Basic Settings tab stay in sync both ways with no extra
        // wiring. The right-half Copilot can be collapsed to hand the whole
        // canvas to the mirror; it re-opens from the floating button.
        const basicSettingsSection = getCreateSimulationSubSectionById(stepIds.basicSettings);
        // View mode hands the whole canvas to the (inert) Basic Settings
        // mirror — the Copilot is an editing tool, so it's never shown there.
        const copilotCollapsed = viewMode || isCopilotCollapsed;
        return renderStep(
          <div
            className={`grid ${
              copilotCollapsed ? "grid-cols-1" : "grid-cols-2 gap-6"
            } h-full min-h-0 relative`}
          >
            {/* Left half — mirror of Basic Settings, independent vertical scroll.
                Spans the full canvas when the Copilot is collapsed. */}
            <div className="min-h-0 h-full overflow-y-auto custom-scrollbar">
              <CreateSimulationSubSection
                items={basicSettingsSection?.fields ?? []}
                formMethods={formMethods}
                readOnly={viewMode}
              />
            </div>
            {/* Floating re-open control, shown only while the Copilot is
                collapsed so the pane can always be brought back. */}
            {copilotCollapsed && !viewMode && (
              <button
                type="button"
                onClick={() => setIsCopilotCollapsed(false)}
                title="Show Copilot"
                aria-label="Show Copilot"
                className="absolute top-2 right-2 z-10 flex items-center gap-1.5 h-[36px] px-3 rounded border border-border-light bg-white shadow-sm text-typography-900 hover:bg-secondary-50 transition-colors"
              >
                <DoubleArrowRight className="rotate-180" size={18} />
                <span className="text-sm">Copilot</span>
              </button>
            )}
            {/* Right half — chat-style agent-builder wizard. Scrolls on its own
                (the wizard pins its composer and scrolls the chat internally).
                Hidden when collapsed. */}
            {!copilotCollapsed && (
              <div className="min-h-0 h-full overflow-hidden border-l border-border-light pl-6 flex flex-col">
                <div className="shrink-0 flex justify-end pb-2">
                  <button
                    type="button"
                    onClick={() => setIsCopilotCollapsed(true)}
                    title="Hide Copilot"
                    aria-label="Hide Copilot"
                    className="flex items-center justify-center h-[32px] w-[32px] rounded text-typography-700 hover:bg-secondary-50 transition-colors"
                  >
                    <DoubleArrowRight size={18} />
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <AgentBuilderCopilotWizard formMethods={formMethods} />
                </div>
              </div>
            )}
          </div>,
        );
      }
      case stepIds.report:
        return renderStep(
          <ReportSection
            ref={reportStepRef}
            scenarioId={simulationId}
            scenarioVersionId={activeVersionId}
            areAllMandatoryFieldsFilled={areAllMandatoryFieldsFilled}
            onPrimaryTabChange={setReportPrimaryTab}
            // Report-only fields (helper prompt, evaluator variant) are sent
            // live with each report, so editing them must NOT block Regenerate.
            // Scenario-structural edits still do — report generation reads the
            // SAVED scenario for persona / main-agent prompt / etc.
            hasUnsavedChanges={Object.keys(dirtyFields).some(
              field =>
                field !== FORM_FIELD_IDS.HELPER_AGENT_PROMPT &&
                field !== FORM_FIELD_IDS.SELECTED_EVALUATOR_PROMPT_CODE,
            )}
            selectedMainPromptCode={
              formMethods.watch("selectedMainPromptCode") as string | undefined
            }
            savedHelperAgentPrompt={formMethods.watch("helperAgentPrompt") as string | undefined}
            onHelperPromptChange={prompt =>
              formMethods.setValue("helperAgentPrompt", prompt, { shouldDirty: true })
            }
            savedEvaluatorPromptCode={
              formMethods.watch("selectedEvaluatorPromptCode") as string | undefined
            }
            onEvaluatorPromptChange={promptCode =>
              formMethods.setValue("selectedEvaluatorPromptCode", promptCode, {
                shouldDirty: true,
              })
            }
          />,
        );
      default:
        return null;
    }
  };

  const doPreview = async () => {
    // View mode previews the saved scenario as-is; the form can't have edits,
    // so skip the save entirely (it would be a pointless PUT).
    const response = viewMode
      ? null
      : await saveSimulationChanges(adminSimulationByIdData?.status || SimulationStatus.DRAFT);
    const id = simulationId || (response && response?.data?.[0]?.id);
    if (id) {
      const formData = formMethods.getValues();
      const selectedLangIds = Object.keys(formData.languageVoices ?? {}).filter(
        k => (formData.languageVoices ?? {})[k],
      );
      const scenarioAvailableLanguages = selectedLangIds
        .map(langId => availableLanguages.find(l => String(l.language_id) === langId))
        .filter((l): l is (typeof availableLanguages)[number] => Boolean(l));

      const simulation = {
        id: String(id),
        title: formData.title,
        description: formData.description,
        coverImageUrl: formData.coverImageUrl,
        triggerWarnings: formData.triggerWarningIds,
        status: adminSimulationByIdData?.status || SimulationStatus.DRAFT,
        availableLanguages: scenarioAvailableLanguages,
      };

      setPreviewSimulation(simulation);
      setIsPreviewOpen(true);
    }
  };

  const handlePreview = () => {
    if (!viewMode && emptyOptionalFields.length > 0) {
      pendingActionRef.current = doPreview;
      setShowOptionalFieldsWarning(true);
    } else {
      doPreview();
    }
  };

  const pageTitle = viewMode
    ? en.simulation.viewSimulation
    : simulationId
      ? en.simulation.editSimulation
      : en.simulation.createNewSimulation;

  return (
    // h-full (not h-[100vh]): the page already lives inside PrivateLayout's
    // `p-4 lg:p-6 h-[100vh] overflow-y-hidden` box. Using h-full fills that
    // box exactly — a nested h-[100vh] overflowed by the wrapper's padding
    // and clipped the form's bottom. Mirrors the Roleplays page, which fills
    // the same wrapper rather than re-declaring viewport height.
    <div className="h-full font-primary flex flex-col">
      {/* Header — aligned with the Roleplays page header: no extra
          horizontal padding (the PrivateLayout gutter is shared) and the
          title uses font-secondary, so the title position and typeface stay
          put when navigating Roleplays → Edit. Breadcrumb + actions added. */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-typography-800 cursor-pointer" onClick={handlePageBack}>
            {en.simulation.rolePlays}
          </span>
          <span className="-rotate-90">
            <ArrowDown />
          </span>
          <h1 className="text-2xl text-typography-900 font-secondary">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          {viewMode && (
            <span className="flex items-center gap-1.5 text-xs text-typography-500">
              <span className="h-1.5 w-1.5 rounded-full bg-typography-500" />
              {en.simulation.readOnlyViewNote}
            </span>
          )}
          {!viewMode && autosaveState !== "idle" && (
            <span
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                autosaveState === "error" ? "text-destructive-500" : "text-typography-500"
              }`}
              aria-live="polite"
            >
              {autosaveState === "saving" ? (
                en.simulation.autosaving
              ) : autosaveState === "error" ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive-500" />
                  {draftSaveBlockedMessage ?? en.simulation.autosaveFailed}
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                  {en.simulation.draftAutosaved}
                </>
              )}
            </span>
          )}
          {simulationId && !viewMode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsVersionPanelOpen(o => !o)}
                title={en.simulation.versions.switchVersion}
                className={`flex items-center gap-1.5 h-[40px] px-3 rounded text-typography-900 transition-colors ${
                  isVersionPanelOpen ? "bg-secondary-50" : "hover:bg-secondary-50"
                }`}
              >
                <span className="text-base max-w-[220px] truncate">
                  {currentVersion
                    ? formatVersionLabel(currentVersion)
                    : en.simulation.versions.title}
                </span>
                {isActiveVersionReadOnly && (
                  <span className="text-xs text-typography-500">
                    · {en.simulation.versions.readOnly}
                  </span>
                )}
                <span
                  className={`scale-75 opacity-70 transition-transform ${
                    isVersionPanelOpen ? "rotate-180" : ""
                  }`}
                >
                  <ArrowDown />
                </span>
              </button>
              <ScenarioVersionPanel
                scenarioId={simulationId}
                activeVersionId={activeVersionId}
                isOpen={isVersionPanelOpen}
                onClose={() => setIsVersionPanelOpen(false)}
                onEditVersion={async version => {
                  // Save the outgoing draft/live edits before the form reset.
                  await flushPendingEdits();
                  if (version.status === ScenarioVersionStatus.PUBLISHED) {
                    // The published version IS the live scenario — edit it via
                    // the live path. Clearing activeVersionId makes the load
                    // effect re-sync the form from the live record.
                    setActiveVersionId(undefined);
                    setVersionEvents(undefined);
                    draftMappedEventsRef.current = undefined;
                    lastEventsJsonRef.current = undefined;
                    if (simulationId) getAdminSimulationByIdQuery(simulationId);
                  } else {
                    setActiveVersionId(version.id);
                    formMethods.reset(formatVersionConfigToForm(version.config));
                    const events = (version.config as Record<string, any>)?.mappedEvents;
                    const eventsArr = Array.isArray(events) ? events : undefined;
                    setVersionEvents(eventsArr);
                    draftMappedEventsRef.current = eventsArr;
                    lastEventsJsonRef.current = JSON.stringify(eventsArr ?? null);
                  }
                  setIsVersionPanelOpen(false);
                  toast.success(en.simulation.versions.editingToast(formatVersionLabel(version)));
                }}
                onBeforeCreate={flushPendingEdits}
                onVersionDeleted={deletedId => {
                  // If the version we were editing got deleted, drop back to the
                  // live scenario so saves don't target a missing version.
                  if (deletedId === activeVersionId) {
                    setActiveVersionId(undefined);
                    setVersionEvents(undefined);
                    draftMappedEventsRef.current = undefined;
                    lastEventsJsonRef.current = undefined;
                    if (simulationId) getAdminSimulationByIdQuery(simulationId);
                  }
                }}
              />
            </div>
          )}
          {!viewMode && (
            <Button
              variant={ButtonVariant.TEXT}
              onClick={() => handleSaveDraft()}
              className="px-4 h-[40px] text-typography-900"
            >
              {en.simulation.save}
            </Button>
          )}
          <Button
            variant={ButtonVariant.TEXT}
            onClick={handlePreview}
            disabled={!areAllMandatoryFieldsFilled}
            className={`px-4 h-[40px] ${areAllMandatoryFieldsFilled ? "text-primary-500" : "text-typography-600 cursor-not-allowed"}`}
          >
            {en.simulation.preview}
          </Button>
          {viewMode ? (
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => simulationId && navigate(ROUTES.EDIT_SIMULATION(simulationId))}
              className="transition-colors h-[40px] pr-[20px]"
            >
              {en.simulation.edit}
            </Button>
          ) : (
            <AppTooltip location={TooltipLocation.PUBLISH_SIMULATION_VERSION}>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handlePublish}
                disabled={
                  !areAllMandatoryFieldsFilled || isCreatingSimulation || isPublishingVersion
                }
                className="transition-colors h-[40px] pr-[20px]"
              >
                {isCreatingSimulation || isPublishingVersion
                  ? en.simulation.publishing
                  : en.simulation.publish}
              </Button>
            </AppTooltip>
          )}
        </div>
      </div>

      {/* Latency warning — shown before the tab strip when this simulation has
          more advanced (mapped) events than the recommended threshold, since a
          large event set adds real-time detection latency during a session. */}
      {showAdvancedEventsLatencyWarning && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shrink-0 font-primary"
        >
          <WarningAlt className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{en.simulation.advancedEventsLatencyWarning(advancedEventsCount)}</span>
        </div>
      )}

      {/* Tab bar — identical class set and full width to match the Roleplays
          page tabs exactly, so the tab strip is seamless across both pages. */}
      <Tabs
        items={[
          {
            id: stepIds.agentBuilderCopilot,
            title: en.simulation.agentBuilder.tabTitle,
          },
          ...StepperList,
        ].map(s => ({ id: s.id, label: s.title }))}
        activeId={currentStep}
        onChange={tab => !isReportGenerationInProgress && handleStepClick(tab)}
        showCount={false}
        className="mb-2 mt-6 border-b border-border-light font-primary shrink-0"
      />

      {/* Scrollable content in a centered, readable column. The full-width
          chrome above matches the parent; the editable form is bounded
          (~Notion's editor width) and centered so whitespace is balanced on
          both sides instead of stretching fields edge-to-edge. */}
      <div ref={containerRef} className="relative flex-1 overflow-y-auto custom-scrollbar">
        {/* The Agent Builder Copilot tab is a full-width split screen, so it
            opts out of the centered, max-width reading column the other tabs
            use. */}
        <div
          className={
            currentStep === stepIds.agentBuilderCopilot
              ? "w-full h-full min-h-0 py-6"
              : "w-full max-w-[1040px] mx-auto py-6"
          }
        >
          {renderCurrentStep()}
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showDiscardPopup}
        onClose={handleCloseDiscardPopup}
        title={en.simulation.unsaved}
        titleItalic={en.simulation.changes}
        description={en.simulation.discardDescription}
        primaryButton={{
          label: en.simulation.saveAndExit,
          onClick: handleSaveAndExit,
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.discardChanges,
          onClick: handleDiscardChanges,
          variant: ButtonVariant.SECONDARY,
        }}
      />

      <ActionConfirmationPopup
        isOpen={showOptionalFieldsWarning}
        onClose={() => setShowOptionalFieldsWarning(false)}
        title="Before you continue..."
        description="Some optional fields are empty. This may affect the simulation quality. Are you sure you want to continue?"
        primaryButton={{
          label: "Continue anyway",
          onClick: () => {
            setShowOptionalFieldsWarning(false);
            pendingActionRef.current?.();
            pendingActionRef.current = null;
          },
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: "Go back and fill in",
          onClick: () => setShowOptionalFieldsWarning(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      {previewSimulation && (
        <SimulationPreview
          simulation={previewSimulation}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      <TranslationProgressToast jobs={translationJobsList} onDismiss={dismissTranslationJob} />
    </div>
  );
};
