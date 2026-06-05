import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useCreateSimulationMutation,
  useDeleteCoverImageMutation,
  useGetAvailableLanguageVoicesQuery,
  useGetPromptsQuery,
  useLazyGetAdminSimulationByIdQuery,
  useUpdateSimulationByIdMutation,
} from "@api";
import { ArrowDown } from "@assets";
import {
  ActionConfirmationPopup,
  Button,
  CreateSimulationSubSection,
  ReportSection,
  ReportSectionHandle,
  ReportPrimaryTab,
  SimulationEventMapTable,
  SimulationPreview,
  TranslationJob,
  TranslationLanguageProgress,
  TranslationProgressToast,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
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
} from "@types";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
  isNonEmptyString,
  extractValidData,
  isEmpty,
  isNonEmptyArray,
  validateTimeRange,
} from "@utils";

const stepIds: any = SIMULATION_CREATOR_STEP_IDS;

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

export const CreateSimulation: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [simulationId, setSimulationId] = useState<string | undefined>(id);
  const [currentStep, setCurrentStep] = useState(stepIds.basicSettings);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showOptionalFieldsWarning, setShowOptionalFieldsWarning] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSimulation, setPreviewSimulation] = useState<SimulationPreviewType | null>(null);

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

  const formMethods = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
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
    if (adminSimulationByIdData) {
      formMethods.reset(formatSimulationResponseData(adminSimulationByIdData));
    }
  }, [adminSimulationByIdData, formMethods]);

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
    if (Object.keys(dirtyFields).length > 0) {
      setShowDiscardPopup(true);
    } else {
      navigate(-1);
    }
  };

  // Core function to save simulation changes
  const saveSimulationChangesCore = async (status: SimulationStatus) => {
    const formData = formMethods.getValues();
    if (!formData.title?.trim()) {
      toast.error(en.errors.titleIsRequired);
      return null;
    }

    if (formData.timerMode && formData.maxTimeValue) {
      if (
        !validateTimeRange(
          formData.maxTimeValue,
          SESSION_TIMER_CONFIG.MIN_TIME,
          SESSION_TIMER_CONFIG.MAX_TIME,
        )?.isValid
      ) {
        toast.error(
          en.simulation.maxTimeError(SESSION_TIMER_CONFIG.MIN_TIME, SESSION_TIMER_CONFIG.MAX_TIME),
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
        toast.error(en.errors.invalidStateInstructionIds);
        return null;
      }
    }

    // Delete cover image from s3 if it is changed
    if (
      isNonEmptyString(adminSimulationByIdData?.coverImageUrl) &&
      adminSimulationByIdData?.coverImageUrl !== formData.coverImageUrl
    ) {
      try {
        await deleteCoverImage({ coverImageUrl: adminSimulationByIdData.coverImageUrl }).unwrap();
      } catch (error: any) {
        toast.error(error?.data?.message || en.errors.fileUploadFailed);
      }
    }

    const {
      openingStatements,
      translationOpeningStatements,
      translationDescription,
      translationTitle,
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
    };

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
      (simulationData as any).states = filledStates.length > 0 ? filledStates : null;
    }

    // Normalize empty-string selectedMainPromptCode to undefined.
    // DropdownField's `allowDeselect` writes "" on clear, but downstream
    // (ai-learn / scenario metadata) treats `undefined` and `""` differently
    // in some paths. Sending `undefined` keeps the field cleanly absent so
    // resolver fallback to default kicks in without ambiguity.
    if ((simulationData as any).selectedMainPromptCode === "") {
      (simulationData as any).selectedMainPromptCode = undefined;
    }

    let response;
    if (simulationId) {
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

  const handleSaveDraft = async () => {
    try {
      const response = await saveSimulationChanges(SimulationStatus.DRAFT);
      if (response && !response.error) {
        if (response?.data?.[0]?.id && !simulationId) {
          setSimulationId(response?.data?.[0]?.id);
        }
        // Reset form to clear dirtyFields after successful save
        const currentFormValues = formMethods.getValues();
        formMethods.reset(currentFormValues);

        return response?.data;
      } else if (response?.error) {
        toast.error(response?.error?.data?.message || en.errors.failedSimulationChange);
        return null;
      }
      return response?.data;
    } catch {
      toast.error(en.errors.failedSimulationChange);
      return null;
    }
  };

  const doPublish = async () => {
    try {
      const response = await saveSimulationChanges(SimulationStatus.ACTIVE);

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
    if (currentStep === stepIds.basicSettings) {
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
      case stepIds.basicSettings: {
        const simulationSubSectionData = getCreateSimulationSubSectionById(currentStep);
        return renderStep(
          <CreateSimulationSubSection
            items={simulationSubSectionData.fields}
            formMethods={formMethods}
          />,
        );
      }
      case stepIds.advancedSettings:
        return renderStep(<SimulationEventMapTable simulationId={simulationId} />);
      case stepIds.report:
        return renderStep(
          <ReportSection
            ref={reportStepRef}
            scenarioId={simulationId}
            areAllMandatoryFieldsFilled={areAllMandatoryFieldsFilled}
            hasUnsavedChanges={Object.keys(dirtyFields).length > 0}
            onPrimaryTabChange={setReportPrimaryTab}
            selectedMainPromptCode={
              formMethods.watch("selectedMainPromptCode") as string | undefined
            }
          />,
        );
      default:
        return null;
    }
  };

  const doPreview = async () => {
    const response = await saveSimulationChanges(
      adminSimulationByIdData?.status || SimulationStatus.DRAFT,
    );
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
    if (emptyOptionalFields.length > 0) {
      pendingActionRef.current = doPreview;
      setShowOptionalFieldsWarning(true);
    } else {
      doPreview();
    }
  };

  const pageTitle = simulationId ? en.simulation.editSimulation : en.simulation.createNewSimulation;

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
          <Button
            variant={ButtonVariant.TEXT}
            onClick={handleSaveDraft}
            className="px-4 h-[40px] text-typography-900"
          >
            {en.simulation.save}
          </Button>
          <Button
            variant={ButtonVariant.TEXT}
            onClick={handlePreview}
            disabled={!areAllMandatoryFieldsFilled}
            className={`px-4 h-[40px] ${areAllMandatoryFieldsFilled ? "text-primary-500" : "text-typography-600 cursor-not-allowed"}`}
          >
            {en.simulation.preview}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handlePublish}
            disabled={!areAllMandatoryFieldsFilled || isCreatingSimulation}
            className="transition-colors h-[40px] pr-[20px]"
          >
            {isCreatingSimulation ? en.simulation.publishing : en.simulation.publish}
          </Button>
        </div>
      </div>

      {/* Tab bar — identical class set and full width to match the Roleplays
          page tabs exactly, so the tab strip is seamless across both pages. */}
      <Tabs
        items={StepperList.map(s => ({ id: s.id, label: s.title }))}
        activeId={currentStep}
        onChange={tab => !isReportGenerationInProgress && handleStepClick(tab)}
        showCount={false}
        className="mb-2 mt-6 border-b border-border-light font-primary shrink-0"
      />

      {/* Scrollable content in a centered, readable column. The full-width
          chrome above matches the parent; the editable form is bounded
          (~Notion's editor width) and centered so whitespace is balanced on
          both sides instead of stretching fields edge-to-edge. */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[1040px] mx-auto py-6">{renderCurrentStep()}</div>
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
