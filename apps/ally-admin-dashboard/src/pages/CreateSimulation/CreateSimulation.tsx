import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateSimulationMutation,
  useDeleteCoverImageMutation,
  useLazyGetAdminSimulationByIdQuery,
  useUpdateSimulationByIdMutation,
} from "@api";
import {
  ActionConfirmationPopup,
  CreateFormLayout,
  MoreOptionsPopup,
  SimulationEventMapTable,
  SimulationPreview,
} from "@components";
import { ButtonVariant } from "@components/types";
import { SIMULATION_CREATOR_FIELD_GROUPS, SimulationStepperList, ROUTES, en } from "@constants";
import { useDebounce } from "@hooks";
import { SimulationPreviewType, SimulationStatus } from "@types";
import { extractValidData, formatSimulationResponseData, isNonEmptyString } from "@utils";
const stepIds = {
  basicInfo: "basic-info",
  characterIdentity: "character-identity",
  traitsNeeds: "traits-and-needs",
  conversationStyle: "conversation-style",
  eventConfiguration: "event-configuration",
};

export const CreateSimulation: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [simulationId, setSimulationId] = useState<string | undefined>(id);
  const [currentStep, setCurrentStep] = useState(stepIds.basicInfo);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSimulation, setPreviewSimulation] = useState<SimulationPreviewType | null>(null);

  const moreOptionsRef = useRef<HTMLButtonElement>(null);
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
    formState: { dirtyFields },
  } = formMethods;
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

    // Delete cover image from s3 if it is changed
    if (
      isNonEmptyString(adminSimulationByIdData?.coverImageUrl) &&
      adminSimulationByIdData?.coverImageUrl !== formData.coverImageUrl
    ) {
      try {
        await deleteCoverImage({ coverImageUrl: adminSimulationByIdData.coverImageUrl }).unwrap();
      } catch {
        toast.error("Failed to delete cover image. Please try again.");
      }
    }

    const { openingStatements, ...restForm } = formData as any;

    const openingStatementsArray = isNonEmptyString(openingStatements)
      ? openingStatements
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
      : null;

    const simulationData = {
      ...extractValidData(restForm),
      openingStatements: openingStatementsArray,
      status,
    };
    let response;
    if (simulationId) {
      response = await updateSimulationByIdQuery({
        id: simulationId,
        simulation: simulationData,
      });
    } else {
      response = await createSimulationQuery({
        scenarios: [simulationData],
      });
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
        // Refetch to ensure form is in sync with saved data
        if (simulationId) {
          getAdminSimulationByIdQuery(simulationId);
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
    // TODO: Handle any navigations here
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
    if (stepId === stepIds.eventConfiguration && !simulationId) {
      const response = await handleSaveDraft();
      if (response) {
        setCurrentStep(stepId);
      } else {
        toast.error("Fill atleast name field to proceed to Event Configuration!");
      }
    } else {
      setCurrentStep(stepId);
    }
    // Scroll to top when moving to next step
    containerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const moreOptionsPosition = useMemo(() => getMoreOptionsPosition(), []);

  const handlePreview = async () => {
    const response = await saveSimulationChanges(SimulationStatus.DRAFT);
    const id = simulationId || (response && response?.data?.[0]?.id);
    if (id) {
      const formData = formMethods.getValues();
      const simulation = {
        id: String(id),
        title: formData.title,
        description: formData.description,
        coverImageUrl: formData.coverImageUrl,
      };

      setPreviewSimulation(simulation);
      setIsPreviewOpen(true);
    }
  };
  const renderCustomStep = (stepId: string) =>
    stepId === stepIds.eventConfiguration ? (
      <SimulationEventMapTable simulationId={simulationId} />
    ) : null;

  return (
    <>
      <CreateFormLayout
        formMethods={formMethods}
        stepperList={SimulationStepperList}
        fieldGroups={SIMULATION_CREATOR_FIELD_GROUPS}
        currentStep={currentStep}
        onBack={handlePageBack}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onPreview={handlePreview}
        isPublishing={isCreatingSimulation}
        renderCustomStep={renderCustomStep}
        handleStepClick={handleStepClick}
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
      <MoreOptionsPopup
        isOpen={showMoreOptions}
        onClose={handleCloseMoreOptions}
        onDiscardSimulation={handleDiscardSimulation}
        position={moreOptionsPosition}
      />
      {previewSimulation && (
        <SimulationPreview
          simulation={previewSimulation}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};
