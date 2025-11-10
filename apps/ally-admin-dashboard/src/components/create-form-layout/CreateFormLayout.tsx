import { FC, useMemo, useRef } from "react";

import { UseFormReturn } from "react-hook-form";

import { Header, Footer, VerticalStepper, CreateSimulationSubSection } from "@components";
import { Step } from "@components/types";
import { getCreateSubSectionById, getMandatoryFieldIds } from "@utils";

interface CreateFormLayoutProps {
  formMethods: UseFormReturn<any>;
  stepperList: Step[];
  onStepClick?: (stepId: string) => void;
  fieldGroups: any[];
  currentStep: string;
  onBack?: () => void;
  onSaveDraft?: () => Promise<any>;
  onPublish?: () => void;
  onPreview?: () => void;
  isPublishing?: boolean;
  renderCustomStep?: (stepId: string) => React.ReactNode;
  showPreview?: boolean;
  header?: string;
  handleStepClick: (id: string) => void;
}

export const CreateFormLayout: FC<CreateFormLayoutProps> = ({
  formMethods,
  stepperList,
  fieldGroups,
  currentStep,
  onBack,
  onSaveDraft,
  onPublish,
  onPreview,
  isPublishing,
  renderCustomStep,
  showPreview = true,
  header,
  handleStepClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { handleSubmit, watch } = formMethods;

  const formValues = watch();

  // ✅ Check if all mandatory fields filled
  const areAllMandatoryFieldsFilled = useMemo(() => {
    const mandatoryFieldIds = getMandatoryFieldIds(fieldGroups);
    return mandatoryFieldIds.every(fieldId => {
      const value = formValues[fieldId];
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  }, [fieldGroups, formValues]);

  const handlePrevious = () => {
    const currentIndex = stepperList.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const previousStep = stepperList[currentIndex - 1];
      handleStepClick(previousStep.id);
    }
  };

  const isLastStep = currentStep === stepperList[stepperList.length - 1].id;

  const handleNext = async () => {
    if (isLastStep) {
      handleSubmit(onPublish)();
    } else {
      const nextStep = stepperList.findIndex(step => step.id === currentStep) + 1;
      handleStepClick(stepperList[nextStep].id);
    }
  };

  const renderStep = (title: string, component: React.ReactNode) => (
    <div className="flex flex-col h-full w-full">
      <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
        <h2 className="text-lg font-medium text-typography-900">{title}</h2>
      </div>
      <div ref={containerRef} className="p-6 pt-4 overflow-y-auto h-full">
        {component}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    const currentStepData = getCreateSubSectionById(currentStep, fieldGroups);

    // allow parent to override this step
    if (renderCustomStep) {
      const custom = renderCustomStep(currentStep);
      if (custom) return custom;
    }

    return renderStep(
      currentStepData.label,
      <CreateSimulationSubSection items={currentStepData.fields} formMethods={formMethods} />,
    );
  };

  return (
    <div className="h-[100vh] overflow-hidden font-primary ml-[-10px] lg:ml-0">
      <Header
        isValid={areAllMandatoryFieldsFilled}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
        onPreview={onPreview}
        isPublishing={isPublishing}
        showPreview={showPreview}
        title={header}
      />

      <div className="flex h-[calc(100vh-100px)]">
        <VerticalStepper
          steps={stepperList}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />

        <div className="flex-1 flex flex-col h-[calc(100vh-160px)]">
          <div className="flex-1 overflow-hidden">{renderCurrentStep()}</div>
          <Footer
            onPrevious={handlePrevious}
            onNext={handleNext}
            showPrevious={currentStep !== stepperList[0].id}
            showNext={true}
            isNextDisabled={false}
            isLastStep={isLastStep}
          />
        </div>
      </div>
    </div>
  );
};
