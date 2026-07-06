import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCreateSimulationPathMutation,
  useDeleteCoverImageMutation,
  useLazyGetScenarioPathByIdQuery,
  useUpdateSimulationPathByIdMutation,
} from "@api";
import { Plus, Eye } from "@assets";
import {
  Header,
  VerticalStepper,
  Footer,
  ActionConfirmationPopup,
  Button,
  SimulationSelectionModal,
  CreateSimulationSubSection,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  PATH_CREATOR_FIELD_GROUPS,
  PATH_CREATOR_STEP_IDS,
  SimulationStatus,
  PathStepperList,
  getCreatePathSubSectionById,
} from "@constants";
import { useDebounce } from "@hooks";
import { GetScenarioType } from "@types";
import {
  extractValidData,
  isEmpty,
  isNonEmptyArray,
  isNonEmptyObject,
  isNonEmptyString,
} from "@utils";

// Get all mandatory field IDs from the configuration
const getMandatoryFieldIds = () => {
  const mandatoryFields: string[] = [];
  PATH_CREATOR_FIELD_GROUPS.forEach(group => {
    group.fields.forEach(field => {
      if (field.isMandatory) {
        mandatoryFields.push(field.id);
      }
    });
  });
  return mandatoryFields;
};

const DEBOUNCE_TIME = 1000;

export const CreatePath: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pathId, setPathId] = useState<string | null>(id);
  const [currentStep, setCurrentStep] = useState(PATH_CREATOR_STEP_IDS.basicInfo);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [selectedSimulations, setSelectedSimulations] = useState<GetScenarioType[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const title = id ? en.simulation.editPath : en.simulation.createPath;

  const [getScenarioPathByIdQuery, { data: individualPath }] = useLazyGetScenarioPathByIdQuery();
  const [createSimulationPathMutation] = useCreateSimulationPathMutation();
  const [updateSimulationPathByIdQuery] = useUpdateSimulationPathByIdMutation();
  const [deleteCoverImage] = useDeleteCoverImageMutation();

  const formatScenarios = (scenarios?: GetScenarioType[]) => {
    if (!isNonEmptyArray(scenarios)) return [];

    const sortedScenarios = [...scenarios].sort((a, b) => a.order - b.order);

    return sortedScenarios?.map((scenario, index) => ({
      ...scenario,
      order: index + 1,
    }));
  };

  const formMethods = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const {
    handleSubmit,
    formState: { dirtyFields },
    watch,
  } = formMethods;

  useEffect(() => {
    if (pathId) getScenarioPathByIdQuery(pathId);
  }, [pathId, getScenarioPathByIdQuery]);

  useEffect(() => {
    if (individualPath) formMethods.reset(individualPath);
    if (individualPath?.scenarios)
      setSelectedSimulations(formatScenarios(individualPath.scenarios));
  }, [individualPath, formMethods]);
  // Watch all form values to check mandatory fields
  const formValues = watch();

  // Custom validation to check if all mandatory fields are filled
  const areAllMandatoryFieldsFilled = useMemo(() => {
    const mandatoryFieldIds = getMandatoryFieldIds();
    const allMandatoryFormFieldsFilled = mandatoryFieldIds.every(fieldId => {
      const value = formValues[fieldId];
      // Check if value exists and is not empty
      if (isEmpty(value)) return false;

      if (Array.isArray(value)) return !isNonEmptyArray(value);

      if (value instanceof FileList && value.length === 0) return false;

      return true;
    });
    return allMandatoryFormFieldsFilled && formValues?.scenarios?.length > 1; // at least one simulation is required
  }, [formValues]);

  const toggleSimulationModal = () => {
    setShowSimulationModal(prev => !prev);
  };

  const handlePageBack = () => {
    if (isNonEmptyObject(dirtyFields)) setShowDiscardPopup(true);
    else navigate(-1);
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
      isNonEmptyString(individualPath?.coverImageUrl) &&
      individualPath?.coverImageUrl !== formData.coverImageUrl
    ) {
      try {
        await deleteCoverImage({ coverImageUrl: individualPath.coverImageUrl }).unwrap();
      } catch {
        toast.error(en.errors.fileUploadFailed);
      }
    }

    const simulationPath: any = {
      ...extractValidData(PATH_CREATOR_FIELD_GROUPS, formData),
      status,
    };
    let response;

    if (pathId) {
      response = await updateSimulationPathByIdQuery({
        id: pathId,
        data: simulationPath,
      });
    } else {
      response = await createSimulationPathMutation(simulationPath);
    }
    return response;
  };

  // Debounced version to prevent duplicate simulation creation with a delay
  const saveSimulationChanges = useDebounce(saveSimulationChangesCore, DEBOUNCE_TIME);

  const handleSaveDraft = async () => {
    try {
      const response = await saveSimulationChanges(SimulationStatus.DRAFT);
      const responseData = response?.data;
      if (!response?.error) {
        if (responseData?.id && !pathId) setPathId(responseData?.id);
        const currentFormValues = formMethods.getValues();
        formMethods.reset(currentFormValues);
        return response?.data;
      } else if (response?.error) {
        toast.error(response?.error?.data?.message || en.errors.failedSaveDraft);
        return null;
      }
      return responseData;
    } catch {
      toast.error(en.errors.failedSaveDraft);
      return null;
    }
  };

  const handlePublish = async () => {
    try {
      const response = await saveSimulationChanges(SimulationStatus.ACTIVE);

      if (response) navigate(-1);
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedSimulationCreation);
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
      toast.success(en.simulation.saveSimulation);
    } else {
      toast.error(en.errors.failedPathwayChange);
    }
  };

  const handleCloseDiscardPopup = () => {
    setShowDiscardPopup(false);
  };

  const handleStepClick = async (stepId: string) => {
    setCurrentStep(stepId);
    containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    const currentIndex = PathStepperList.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const previousStep = PathStepperList[currentIndex - 1];
      handleStepClick(previousStep.id);
    }
  };

  const renderStep = (title: string, component: React.ReactNode, addButton?: boolean) => {
    return (
      <div className="flex flex-col h-full w-100%">
        <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
          <h2 className="text-lg text-typography-900 font-semibold">{title}</h2>
          {addButton &&
            (!(individualPath?.status === SimulationStatus.ACTIVE) ? (
              <Button variant={ButtonVariant.SECONDARY} onClick={toggleSimulationModal}>
                <Plus />
                {en.simulation.addSimulation}
              </Button>
            ) : (
              <Tooltip label={en.simulation.viewOnlyTooltip} align="left">
                <Button variant={ButtonVariant.SECONDARY}>
                  <Eye />
                  {en.simulation.viewOnly}
                </Button>
              </Tooltip>
            ))}
        </div>
        <div ref={containerRef} className="p-6 pt-4 overflow-y-auto h-full custom-scrollbar">
          {component}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    const simulationSubSectionData = getCreatePathSubSectionById(currentStep);
    switch (currentStep) {
      case PATH_CREATOR_STEP_IDS.basicInfo:
        return renderStep(
          simulationSubSectionData.label,
          <CreateSimulationSubSection
            items={simulationSubSectionData.fields}
            formMethods={formMethods}
          />,
        );
      case PATH_CREATOR_STEP_IDS.simulations:
        return renderStep(
          simulationSubSectionData.label,
          <SimulationSelectionModal
            toggleSimulationModal={toggleSimulationModal}
            showSimulation={showSimulationModal}
            formMethods={formMethods}
            selectedSimulations={selectedSimulations}
            setSelectedSimulations={setSelectedSimulations}
            isDisabled={individualPath?.status === SimulationStatus.ACTIVE}
          />,
          isNonEmptyArray(formValues.scenarios),
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === PATH_CREATOR_STEP_IDS.simulations;

  const handleNext = async () => {
    if (isLastStep) {
      handleSubmit(handlePublish)();
    } else {
      const nextStep = PathStepperList.findIndex(step => step.id === currentStep) + 1;
      handleStepClick(PathStepperList[nextStep].id);
    }
  };

  return (
    <div className="h-[100vh] overflow-hidden font-primary ml-[-10px] lg:ml-0">
      <Header
        isValid={areAllMandatoryFieldsFilled}
        onBack={handlePageBack}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        title={title}
        showPreview={false}
        type="Track"
      />

      <div className="flex h-[calc(100vh-100px)]">
        <VerticalStepper
          steps={PathStepperList}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        <div className="flex-1 flex flex-col h-[calc(100vh-160px)]">
          <div className="flex-1 overflow-hidden">{renderCurrentStep()}</div>
          <Footer
            onPrevious={handlePrevious}
            onNext={handleNext}
            showPrevious={currentStep !== PATH_CREATOR_STEP_IDS.basicInfo}
            showNext
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
    </div>
  );
};
