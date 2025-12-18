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
  Header,
  VerticalStepper,
  Footer,
  ActionConfirmationPopup,
  SimulationPreview,
} from "@components";
import { CreateSimulationSubSection, SimulationEventMapTable } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  ROUTES,
  StepperList,
  StepperListOld,
  SIMULATION_CREATOR_FIELD_GROUPS,
  SIMULATION_CREATOR_STEP_IDS,
  SIMULATION_CREATOR_STEP_IDS_OLD,
  SIMULATION_CREATOR_FIELD_GROUPS_OLD,
} from "@constants";
import { useDebounce } from "@hooks";
import { SimulationStatus, SimulationPreviewType, triggerWarning } from "@types";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
  isNonEmptyString,
  extractValidData,
  isEmpty,
  isNonEmptyArray,
} from "@utils";

// TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
const stepIds: any = FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
  ? SIMULATION_CREATOR_STEP_IDS
  : SIMULATION_CREATOR_STEP_IDS_OLD;

// Get all mandatory field IDs from the configuration
const getMandatoryFieldIds = () => {
  const mandatoryFields: string[] = [];
  // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
  (FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
    ? SIMULATION_CREATOR_FIELD_GROUPS
    : SIMULATION_CREATOR_FIELD_GROUPS_OLD
  ).forEach(group => {
    group.fields.forEach(field => {
      if (field.isMandatory) {
        mandatoryFields.push(field.id);
      }
    });
  });
  return mandatoryFields;
};

export const CreateSimulation: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [simulationId, setSimulationId] = useState<string | undefined>(id);
  // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
  const [currentStep, setCurrentStep] = useState(
    FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? stepIds.overview : stepIds.basicInfo,
  );
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
    if (simulationId) {
      getAdminSimulationByIdQuery(simulationId);
    }
  }, [simulationId, getAdminSimulationByIdQuery]);

  useEffect(() => {
    if (adminSimulationByIdData) {
      const formattedData = formatSimulationResponseData(adminSimulationByIdData);
      formMethods.reset(formattedData);
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
      // Check if value exists and is not empty
      if (isEmpty(value)) {
        return false;
      }
      // For arrays, check if they have content
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      // For FileList objects (file uploads), check if they have files
      if (value instanceof FileList && value.length === 0) {
        return false;
      }
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
    if (!formData.title) {
      toast.error(en.errors.titleIsRequired);
      return null;
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

    const { openingStatements, triggerWarningIds, customFieldGroup, agentDialogues, ...restForm } =
      formData;

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

    const customFieldGroupList = customFieldGroup?.map((field: any) => ({
      name: field.name,
      value: field.value,
    }));

    const simulationData = {
      // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
      ...extractValidData(
        FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
          ? SIMULATION_CREATOR_FIELD_GROUPS
          : SIMULATION_CREATOR_FIELD_GROUPS_OLD,
        restForm,
      ),
      openingStatements: openingStatementsArray,
      agentDialogues: agentDialoguesArray,
      customFields: customFieldGroupList,
      triggerWarningIds: triggerWarning,
      status,
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

      // Navigate to simulation studio or the created simulation
      if (response) navigate(ROUTES.SIMULATION_STUDIO);
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
    // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
    if (
      stepId ===
        (FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
          ? stepIds.advancedSettings
          : stepIds.eventConfiguration) &&
      !simulationId
    ) {
      const response = await handleSaveDraft();
      if (response) {
        setCurrentStep(stepId);
      } else {
        toast.error(en.errors.failedToProceed);
      }
    } else {
      setCurrentStep(stepId);
    }
    // Scroll to top when moving to next step
    containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
    const currentIndex = (
      FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? StepperList : StepperListOld
    ).findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const previousStep = (
        FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? StepperList : StepperListOld
      )[currentIndex - 1];
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
    const simulationSubSectionData = getCreateSimulationSubSectionById(currentStep);
    switch (currentStep) {
      // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed (basicInfo, characterIdentity, traitsNeeds, conversationStyle)
      case stepIds.basicInfo:
      case stepIds.characterIdentity:
      case stepIds.traitsNeeds:
      case stepIds.conversationStyle:
      case stepIds.overview:
      case stepIds.basicSettings:
        return renderStep(
          simulationSubSectionData.label,
          <CreateSimulationSubSection
            items={simulationSubSectionData.fields}
            formMethods={formMethods}
          />,
        );
      // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed (eventConfiguration)
      case stepIds.eventConfiguration:
      case stepIds.advancedSettings:
        return <SimulationEventMapTable simulationId={simulationId} />;
      default:
        return null;
    }
  };

  // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
  const isLastStep =
    currentStep ===
    (FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG
      ? stepIds.advancedSettings
      : stepIds.eventConfiguration);

  const handleNext = async () => {
    if (isLastStep) {
      handleSubmit(handlePublish)();
    } else {
      // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
      const nextStep =
        (FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? StepperList : StepperListOld).findIndex(
          step => step.id === currentStep,
        ) + 1;
      handleStepClick(
        (FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? StepperList : StepperListOld)[nextStep].id,
      );
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
      />

      <div className="flex h-[calc(100vh-100px)]">
        <VerticalStepper
          // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
          steps={FEATURE_FLAGS_MAP.NEW_CREATE_SIMULATION_FLAG ? StepperList : StepperListOld}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        <div className="flex-1 flex flex-col h-[calc(100vh-160px)]">
          <div className="flex-1 overflow-hidden">{renderCurrentStep()}</div>
          <Footer
            onPrevious={handlePrevious}
            onNext={handleNext}
            // TODO: remove when NEW_CREATE_SIMULATION_FLAG is removed
            showPrevious={currentStep !== stepIds.overview && currentStep !== stepIds.basicInfo}
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
