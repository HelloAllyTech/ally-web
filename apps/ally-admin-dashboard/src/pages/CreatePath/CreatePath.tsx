import { FC, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { ActionConfirmationPopup, CreateFormLayout } from "@components";
import { en, ROUTES } from "@constants";
import { PATH_CREATOR_FIELD_GROUPS, PathStepperList } from "@constants/CreatePath";
import { useDebounce } from "@hooks";
import { ButtonVariant } from "@src/components/types";

export const CreatePath: FC = () => {
  const navigate = useNavigate();
  const id = useParams();
  const [currentStep, setCurrentStep] = useState(PathStepperList[0].id);
  const formMethods = useForm({ mode: "onChange", reValidateMode: "onChange" });
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    formState: { dirtyFields },
  } = formMethods;

  const savePathChangesCore = async (status: string) => {
    const formData = formMethods.getValues();
    // Basic validation: ensure name exists (path creator uses `name` field)
    if (!formData.name) {
      toast.error("Name should be filled to save as draft");
      return null;
    }

    //TODO:API integration
  };

  // Debounced version to prevent duplicate submissions
  const savePathChanges = useDebounce(savePathChangesCore, 500);

  const handleSaveDraft = async () => {
    try {
      const response = await savePathChanges("draft");
      if (response && !response.error) {
        // Reset form to clear dirty flags
        formMethods.reset(formMethods.getValues());
        toast.success("Draft saved");
        return response.data;
      } else {
        toast.error("Failed to save draft. Please try again.");
        return null;
      }
    } catch {
      toast.error("Failed to save draft. Please try again.");
      return null;
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await savePathChanges("active");
      if (res && !res.error) {
        toast.success("Path published successfully!");
        navigate(ROUTES.SIMULATION_STUDIO);
      } else {
        toast.error("Failed to publish path.");
      }
    } catch {
      toast.error("Failed to publish path.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePageBack = () => {
    if (Object.keys(dirtyFields).length > 0) {
      setShowDiscardPopup(true);
    } else {
      navigate("/");
    }
  };

  const handleStepClick = async (stepId: string) => {
    setCurrentStep(stepId);

    // Scroll to top when moving to next step
    containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseDiscardPopup = () => {
    setShowDiscardPopup(false);
  };

  const handleDiscardChanges = () => {
    setShowDiscardPopup(false);
    navigate("/");
  };

  const handleSaveAndExit = () => {
    //TODO:api integration
  };
  return (
    <>
      <CreateFormLayout
        formMethods={formMethods}
        stepperList={PathStepperList}
        fieldGroups={PATH_CREATOR_FIELD_GROUPS}
        currentStep={currentStep}
        onBack={handlePageBack}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        showPreview={false}
        handleStepClick={handleStepClick}
        header={id?.id ? en.simulation.editPath : en.simulation.createPath}
      />
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
    </>
  );
};

export default CreatePath;
