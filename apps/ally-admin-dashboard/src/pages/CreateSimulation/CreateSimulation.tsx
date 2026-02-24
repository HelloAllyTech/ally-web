import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useCreateSimulationMutation,
  useDeleteCoverImageMutation,
  useLazyGetAdminSimulationByIdQuery,
  useUpdateSimulationByIdMutation,
} from "@api";
import {
  ActionConfirmationPopup,
  CreateSimulationSubSection,
  Footer,
  Header,
  ReportSection,
  SimulationEventMapTable,
  SimulationPreview,
  VerticalStepper,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  ROUTES,
  StepperList,
  SIMULATION_CREATOR_FIELD_GROUPS,
  SIMULATION_CREATOR_FIELD_GROUPS_OLD,
  SIMULATION_CREATOR_STEP_IDS,
  SESSION_TIMER_CONFIG,
  FORM_FIELD_IDS,
} from "@constants";
import { useDebounce } from "@hooks";
import {
  SimulationStatus,
  SimulationPreviewType,
  triggerWarning,
  behaviourInstruction,
  stateInstruction,
} from "@types";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
  isNonEmptyString,
  extractValidData,
  isEmpty,
  isNonEmptyArray,
  validateMaxTimeValue,
} from "@utils";

const stepIds: any = SIMULATION_CREATOR_STEP_IDS;

// Get all mandatory field IDs from the configuration
const getMandatoryFieldIds = () => {
  const mandatoryFields: string[] = [];
  const fieldGroups = FEATURE_FLAGS_MAP.SIMULATION_CREATOR_FLAG
    ? SIMULATION_CREATOR_FIELD_GROUPS
    : SIMULATION_CREATOR_FIELD_GROUPS_OLD;
  fieldGroups.forEach(group => {
    group.fields.forEach(field => {
      if (field.isMandatory) {
        mandatoryFields.push(field.id);
      }
    });
  });
  return mandatoryFields;
};

const getMandatoryFieldIdsInOverview = () => {
  const mandatoryFields: string[] = [];
  SIMULATION_CREATOR_FIELD_GROUPS?.[0]?.fields?.forEach(field => {
    if (field?.isMandatory) {
      mandatoryFields.push(field?.id);
    }
  });
  return mandatoryFields ?? [];
};

export const CreateSimulation: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [simulationId, setSimulationId] = useState<string | undefined>(id);
  const [currentStep, setCurrentStep] = useState(stepIds.overview);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSimulation, setPreviewSimulation] = useState<SimulationPreviewType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // API mutation for creating simulation
  const [createSimulationQuery, { isLoading: isCreatingSimulation }] =
    useCreateSimulationMutation();
  const [updateSimulationByIdQuery] = useUpdateSimulationByIdMutation();
  const [getAdminSimulationByIdQuery, { data: adminSimulationByIdData }] =
    useLazyGetAdminSimulationByIdQuery();
  const [deleteCoverImage] = useDeleteCoverImageMutation();

  const formMethods = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (simulationId) getAdminSimulationByIdQuery(simulationId);
  }, [simulationId, getAdminSimulationByIdQuery]);

  useEffect(() => {
    if (adminSimulationByIdData) {
      formMethods.reset(formatSimulationResponseData(adminSimulationByIdData));
    }
  }, [adminSimulationByIdData, formMethods]);

  const {
    handleSubmit,
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
      if (fieldId === FORM_FIELD_IDS.STATE_INSTRUCTIONS) {
        const stateInstructions = value as stateInstruction[];
        if (
          stateInstructions.some(
            instruction =>
              instruction.instruction.trim() === "" || instruction.dialogues?.length === 0,
          )
        )
          return false;
      }
      if (fieldId === FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) {
        const behaviorInstructions = value as behaviourInstruction[];
        if (
          behaviorInstructions.some(
            instruction =>
              instruction.behaviors.length === 0 ||
              instruction.category.length === 0 ||
              instruction.instructions.length === 0,
          )
        )
          return false;
      }
      return true;
    });
  }, [formValues]);

  const areAllMandatoryFieldsFilledInOverview = useMemo(() => {
    const mandatoryFieldIds = getMandatoryFieldIdsInOverview();
    return mandatoryFieldIds.every(fieldId => {
      const value = formValues[fieldId];
      if (isEmpty(value)) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (value instanceof FileList && value.length === 0) return false;
      return true;
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
      if (!validateMaxTimeValue(formData.maxTimeValue, SESSION_TIMER_CONFIG.MAX_TIME)) {
        toast.error(
          en.simulation.maxTimeError(SESSION_TIMER_CONFIG.MIN_TIME, SESSION_TIMER_CONFIG.MAX_TIME),
        );
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
      triggerWarningIds,
      customFields,
      agentDialogues,
      stateInstructions,
      behaviorInstructions,
      ...restForm
    } = formData;

    const openingStatementsArray = isNonEmptyString(openingStatements)
      ? openingStatements
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
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
    }));

    const normalizeInstructions = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
        : String(value ?? "")
            .split("\n")
            .map(text => text.trim())
            .filter(Boolean);

    const behaviourInstructionsArray = isNonEmptyArray(behaviorInstructions)
      ? (behaviorInstructions as behaviourInstruction[])
          .filter(
            instruction =>
              isNonEmptyString(instruction.category) ||
              isNonEmptyArray(instruction.behaviors) ||
              normalizeInstructions(instruction.instructions).length > 0,
          )
          .map(instruction => ({
            ...(instruction.id && { id: instruction.id }),
            category: instruction.category,
            behaviors: instruction.behaviors.map((behavior: any) => behavior?.id ?? behavior),
            instructions: normalizeInstructions(instruction.instructions),
          }))
      : [];

    const simulationData = {
      ...(FEATURE_FLAGS_MAP.SIMULATION_CREATOR_FLAG
        ? extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, restForm)
        : extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, restForm)),
      openingStatements: openingStatementsArray,
      agentDialogues: agentDialoguesArray,
      customFields: customFieldGroupList,
      triggerWarningIds: triggerWarning,
      status,
      ...(FEATURE_FLAGS_MAP.ADDITIONAL_CONFIG_FLAG && { stateInstructions }),
      ...(FEATURE_FLAGS_MAP.ADDITIONAL_CONFIG_FLAG && {
        behaviorInstructions: behaviourInstructionsArray,
      }),
      ...(FEATURE_FLAGS_MAP.ADDITIONAL_CONFIG_FLAG && { competencyId: restForm.competency?.id }),
    };

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

  const handlePublish = async () => {
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
    if (currentStep === stepIds.overview) {
      if (!areAllMandatoryFieldsFilledInOverview) {
        toast.error(en.errors.overviewMandatoryFieldsNotFilled);
        return;
      }
    }
    //TODO: add report step to the requiresSave condition
    const requiresSave =
      stepId === stepIds.advancedSettings ||
      (FEATURE_FLAGS_MAP.SIMULATION_REPORT_FLAG && stepId === stepIds.report);

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

  const handlePrevious = () => {
    const currentIndex = StepperList.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const previousStep = StepperList[currentIndex - 1];
      handleStepClick(previousStep.id);
    }
  };

  const renderStep = (title: string, component: React.ReactNode) => {
    return (
      <div className="flex flex-col h-full w-100%">
        <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
          <h2 className="text-lg font-medium text-typography-900">{title}</h2>
        </div>
        <div ref={containerRef} className="p-6 pt-4 overflow-y-auto h-full custom-scrollbar">
          {component}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case stepIds.overview:
      case stepIds.basicSettings: {
        const simulationSubSectionData = getCreateSimulationSubSectionById(currentStep);
        return renderStep(
          simulationSubSectionData.label,
          <CreateSimulationSubSection
            items={simulationSubSectionData.fields}
            formMethods={formMethods}
          />,
        );
      }
      case stepIds.advancedSettings:
        return <SimulationEventMapTable simulationId={simulationId} />;
      case stepIds.report:
        if (FEATURE_FLAGS_MAP.SIMULATION_REPORT_FLAG) {
          return <ReportSection scenarioId={simulationId} />;
        }
        return null;
      default:
        return null;
    }
  };

  const isLastStep = FEATURE_FLAGS_MAP.SIMULATION_REPORT_FLAG
    ? currentStep === stepIds.report
    : currentStep === stepIds.advancedSettings;

  const handleNext = async () => {
    if (currentStep === stepIds.overview) {
      if (!areAllMandatoryFieldsFilledInOverview) {
        toast.error(en.errors.overviewMandatoryFieldsNotFilled);
        return;
      }
    }
    if (isLastStep) {
      handleSubmit(handlePublish)();
    } else {
      const nextStep = StepperList.findIndex(step => step.id === currentStep) + 1;
      handleStepClick(StepperList[nextStep].id);
    }
  };

  const handlePreview = async () => {
    const response = await saveSimulationChanges(
      adminSimulationByIdData?.status || SimulationStatus.DRAFT,
    );
    const id = simulationId || (response && response?.data?.[0]?.id);
    if (id) {
      const formData = formMethods.getValues();
      const simulation = {
        id: String(id),
        title: formData.title,
        description: formData.description,
        coverImageUrl: formData.coverImageUrl,
        triggerWarnings: formData.triggerWarningIds,
        status: adminSimulationByIdData?.status || SimulationStatus.DRAFT,
      };

      setPreviewSimulation(simulation);
      setIsPreviewOpen(true);
    }
  };

  return (
    <div className="h-[100vh] font-primary ml-[-10px] lg:ml-0">
      <Header
        isValid={areAllMandatoryFieldsFilled}
        onBack={handlePageBack}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onPreview={handlePreview}
        isPublishing={isCreatingSimulation}
        title={simulationId ? en.simulation.editSimulation : en.simulation.createNewSimulation}
        type="Simulation"
      />

      <div className="flex h-[calc(100vh-100px)]">
        <VerticalStepper
          steps={StepperList}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        <div className="flex-1 flex flex-col h-[calc(100vh-160px)]">
          <div className="flex-1 overflow-hidden">{renderCurrentStep()}</div>
          <Footer
            onPrevious={handlePrevious}
            onNext={handleNext}
            showPrevious={currentStep !== stepIds.overview}
            showNext={true}
            isNextDisabled={false}
            isLastStep={isLastStep}
          />
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

      {previewSimulation && (
        <SimulationPreview
          simulation={previewSimulation}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
