import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateSimulationPathMutation,
  useGetScenarioPathByIdQuery,
  useUpdateSimulationPathByIdMutation,
} from "@api";
import { Plus } from "@assets";
import {
  Header,
  VerticalStepper,
  Footer,
  MoreOptionsPopup,
  ActionConfirmationPopup,
  Button,
  SimulationSelectionModal,
} from "@components";
import { CreateSimulationSubSection } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  ROUTES,
  PATH_CREATOR_FIELD_GROUPS,
  PATH_CREATOR_STEP_IDS,
  SimulationStatus,
  PathStepperList,
  getCreatePathSubSectionById,
} from "@constants";
import { useDebounce } from "@hooks";
import { GetScenarioType } from "@types";
import { extractValidData, isEmpty, isNonEmptyArray, isNonEmptyObject } from "@utils";

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

export const CreatePath: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pathId, setPathId] = useState<string | undefined>(id);
  const [currentStep, setCurrentStep] = useState(PATH_CREATOR_STEP_IDS.basicInfo);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const moreOptionsRef = useRef<HTMLButtonElement>(null);

  const title = id ? en.simulation.editPath : en.simulation.createPath;

  // TODO:API mutation for creating path

  const { data: individualPath } = useGetScenarioPathByIdQuery(id);
  const [createSimulationPathMutation] = useCreateSimulationPathMutation();
  const [updateSimulationPathByIdQuery] = useUpdateSimulationPathByIdMutation();

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
    if (individualPath) {
      formMethods.reset(individualPath);
    }
  }, [individualPath, formMethods]);
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
      if (Array.isArray(value)) {
        //strings are getting false value otherwise
        return !isNonEmptyArray(value);
      }
      return true;
    });
  }, [formValues]);

  const handleDiscardSimulation = () => {
    setShowMoreOptions(false);
  };

  const handleCloseMoreOptions = () => {
    setShowMoreOptions(false);
  };

  const toggleSimulationModal = () => {
    setShowSimulationModal(prev => !prev);
  };

  const getMoreOptionsPosition = () => {
    if (moreOptionsRef.current) {
      const rect = moreOptionsRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      };
    }
    return { top: 0, right: 0 };
  };

  const handlePageBack = () => {
    if (isNonEmptyObject(dirtyFields)) {
      setShowDiscardPopup(true);
    } else {
      navigate("/");
    }
  };

  const formatScenarios = (scenarios?: GetScenarioType[]) => {
    if (!scenarios || scenarios.length === 0) return [];

    return scenarios.map((scenario, index) => ({
      ...scenario,
      order: index + 1,
    }));
  };

  // Core function to save simulation changes
  const saveSimulationChangesCore = async (status: SimulationStatus) => {
    const formData = formMethods.getValues();
    if (!formData.title) {
      toast.error(en.errors.titleIsRequired);
      return null;
    }
    const simulationPath = {
      ...extractValidData(PATH_CREATOR_FIELD_GROUPS, formData),
      status,
    };
    let response;
    console.log(simulationPath);
    console.log("formdata", formData);
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

  // Debounced version to prevent duplicate simulation creation (500ms delay)
  const saveSimulationChanges = useDebounce(saveSimulationChangesCore, 500);

  const handleSaveDraft = async () => {
    // TODO: API and Handle any navigations here
    try {
      const response = await saveSimulationChanges(SimulationStatus.DRAFT);
      if (response && !response.error) {
        if (response?.data?.[0]?.id && !pathId) {
          setPathId(response?.data?.[0]?.id);
        }
        const currentFormValues = formMethods.getValues();
        formMethods.reset(currentFormValues);
        if (pathId) {
          // getScenarioPathById(pathId);
        }
        return response?.data;
      } else if (response?.error) {
        toast.error("Failed to save draft. Please try again.");
        return null;
      }
      return response?.data;
    } catch {
      toast.error("Failed to save draft. Please try again.");
      return null;
    }
  };

  const handlePublish = async () => {
    try {
      const response = await saveSimulationChanges(SimulationStatus.ACTIVE);

      // Navigate to simulation studio or the created simulation
      if (response) navigate(ROUTES.SIMULATION_STUDIO);
    } catch {
      toast.error("Failed to create simulation. Please try again.");
    }
  };

  const handleDiscardChanges = () => {
    setShowDiscardPopup(false);
    navigate("/");
  };

  const handleSaveAndExit = async () => {
    const response = await saveSimulationChanges(SimulationStatus.DRAFT);
    if (response) {
      setShowDiscardPopup(false);
      navigate("/");
      toast.success("Simulation changes saved successfully!");
    } else {
      toast.error("Failed to save simulation changes!");
    }
  };

  const handleCloseDiscardPopup = () => {
    setShowDiscardPopup(false);
  };

  const handleStepClick = async (stepId: string) => {
    setCurrentStep(stepId);
    // Scroll to top when moving to next step
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
          <h2 className="text-lg font-medium text-typography-900">{title}</h2>
          {addButton && (
            <Button variant="secondary" onClick={toggleSimulationModal}>
              <Plus />
              {en.simulation.addSimulation}
            </Button>
          )}
        </div>
        <div ref={containerRef} className="p-6 pt-4 overflow-y-auto h-full">
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
            data={formatScenarios(individualPath?.scenarios)}
            formMethods={formMethods}
          />,
          true,
        );
      default:
        return null;
    }
  };

  const moreOptionsPosition = useMemo(() => getMoreOptionsPosition(), []);

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
      <MoreOptionsPopup
        isOpen={showMoreOptions}
        onClose={handleCloseMoreOptions}
        onDiscardSimulation={handleDiscardSimulation}
        position={moreOptionsPosition}
      />
    </div>
  );
};
