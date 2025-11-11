import { FC, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  Header,
  VerticalStepper,
  Footer,
  MoreOptionsPopup,
  ActionConfirmationPopup,
  Simulations,
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
  const [currentStep, setCurrentStep] = useState(PATH_CREATOR_STEP_IDS.basicInfo);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const moreOptionsRef = useRef<HTMLButtonElement>(null);

  const title = id ? en.simulation.editPath : en.simulation.createPath;

  // TODO:API mutation for creating path

  const formMethods = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
  });

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
      if (value === undefined || value === null || value === "") {
        return false;
      }
      // For arrays or objects, check if they have content
      if (Array.isArray(value) && value.length === 0) {
        return false;
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
    if (Object.keys(dirtyFields).length > 0) {
      setShowDiscardPopup(true);
    } else {
      navigate("/");
    }
  };

  // Core function to save simulation changes
  const saveSimulationChangesCore = async (status: SimulationStatus) => {
    const formData = formMethods.getValues();
    if (!formData.title) {
      toast.error("Title should be filled to save as draft");
      return null;
    }

    //TODO: Api
  };

  // Debounced version to prevent duplicate simulation creation (500ms delay)
  const saveSimulationChanges = useDebounce(saveSimulationChangesCore, 500);

  const handleSaveDraft = async () => {
    // TODO: API and Handle any navigations here
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

  const renderStep = (title: string, component: React.ReactNode) => {
    return (
      <div className="flex flex-col h-full w-100%">
        <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
          <h2 className="text-lg font-medium text-typography-900">{title}</h2>
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
        return renderStep(simulationSubSectionData.label, <Simulations />);
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
