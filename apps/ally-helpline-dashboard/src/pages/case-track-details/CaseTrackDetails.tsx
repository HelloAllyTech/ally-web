import { FC, useState, useCallback } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { SimulationDetailsModal, CustomImage, DropdownField } from "@ally-ui-mono/ui-shared";
import {
  useGetScenarioPathwayDetailsQuery,
  useLazyGetScenarioSessionByPathItemQuery,
  useStartPathwaySimulationMutation,
  useGetScenarioCaseDetailsQuery,
  useLazyGetScenarioSessionByCaseItemQuery,
  useStartCaseSimulationMutation,
} from "@api";
import { ArrowRight } from "@assets";
import {
  CreditsDisplay,
  PathwayScenarioCard,
  ConfirmationDialog,
  ButtonVariant,
} from "@components";
import { ROUTES } from "@constants";
import { useStartSimulation } from "@hooks";
import { PathwayScenarioStatus, PathwayScenario, LanguageOption, pageType } from "@types";

type CaseTrackDetailsType = "case" | "track";

interface CaseTrackDetailsProps {
  type: CaseTrackDetailsType;
}

export const CaseTrackDetails: FC<CaseTrackDetailsProps> = ({ type }) => {
  const { pathwayId, caseId } = useParams<{ pathwayId?: string; caseId?: string }>();
  const id = type === pageType.CASE ? caseId : pathwayId;
  const navigate = useNavigate();
  const { state } = useLocation();

  // Use languages from location state or fallback to empty array
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(
    state?.selectedLanguage || null,
  );
  const [selectedScenario, setSelectedScenario] = useState<PathwayScenario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const { data: caseData, isLoading: isCaseLoading } = useGetScenarioCaseDetailsQuery(id || "", {
    skip: type !== pageType.CASE,
  });
  const [startCaseSimulation] = useStartCaseSimulationMutation();
  const [getScenarioSessionByCaseItem] = useLazyGetScenarioSessionByCaseItemQuery();

  const { data: pathwayData, isLoading: isPathwayLoading } = useGetScenarioPathwayDetailsQuery(
    id || "",
    { skip: type !== pageType.TRACK },
  );
  const [startSimulationMutation] = useStartPathwaySimulationMutation();
  const [getScenarioSessionByPathItem] = useLazyGetScenarioSessionByPathItemQuery();

  const data = type === pageType.CASE ? caseData : pathwayData;
  const isLoading = type === pageType.CASE ? isCaseLoading : isPathwayLoading;

  const handleLanguageChange = useCallback(
    (value: string) => {
      const selected = state?.languages?.find(lang => lang.label === value) || null;
      setSelectedLanguage(selected);
    },
    [state?.languages],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedScenario(null);
  }, []);

  const { startSimulation, isStarting } = useStartSimulation({
    onSuccess: handleCloseModal,
  });

  const enrollSession = async () => {
    if (type === pageType.CASE) {
      if (!caseData?.scenarioCaseSessionId) {
        await startCaseSimulation({ caseId: id });
      }
    } else {
      if (!pathwayData?.scenarioPathSessionId) {
        await startSimulationMutation({ pathwayId: id });
      }
    }
  };

  const handleViewSummary = useCallback(
    async (sessionId: string) => {
      try {
        const response =
          type === pageType.CASE
            ? await getScenarioSessionByCaseItem({
                caseSessionItemId: sessionId,
              }).unwrap()
            : await getScenarioSessionByPathItem({
                pathSessionItemId: sessionId,
              }).unwrap();

        if (response?.id) {
          navigate(`/simulation-summary/${response.id}`);
        } else {
          toast.error("Failed to load simulation details");
        }
      } catch {
        toast.error("Failed to load simulation details");
      }
    },
    [getScenarioSessionByPathItem, getScenarioSessionByCaseItem, navigate],
  );

  const handleStartOrContinueSimulation = async () => {
    await enrollSession();
    const nextScenario = data?.scenarios.find(
      scenario => scenario.status === PathwayScenarioStatus.UNLOCKED,
    );
    if (!nextScenario) {
      toast.error("Upcoming simulation is locked");
      return;
    }
    setSelectedScenario(nextScenario);
    setIsModalOpen(true);
  };

  const handleScenarioClick = async (scenarioId: number, status: PathwayScenarioStatus) => {
    if (status === PathwayScenarioStatus.LOCKED) return;

    await enrollSession();
    const scenario = data?.scenarios.find(s => s.scenarioId === scenarioId);
    if (scenario) {
      setSelectedScenario(scenario);
      setIsModalOpen(true);
    }
  };

  const handleStartSimulation = () => {
    if (!selectedScenario || isStarting) return;
    setShowNotification(true);
  };

  const handleProceedWithSimulation = async () => {
    setShowNotification(false);
    if (!selectedScenario || isStarting) return;

    const updatedSelectedScenario = data?.scenarios.find(
      scenario => scenario.scenarioId === selectedScenario.scenarioId,
    );
    if (!updatedSelectedScenario) return;
    const { scenarioId, sessionId, title, coverImageUrl } = updatedSelectedScenario;
    await startSimulation({
      params: {
        scenarioId,
        ...(type === pageType.CASE
          ? { scenarioCaseSessionItemId: sessionId }
          : { scenarioPathSessionItemId: sessionId }),
        ...(state?.languages?.length > 0 && {
          languageId: selectedLanguage?.language_id || state?.defaultLanguage,
        }),
      },
      metadata: {
        title,
        coverImageUrl,
      },
    });
  };

  const renderLanguageDropdown = useCallback(() => {
    if (!state?.languages?.length) return null;

    return (
      <div className="w-full flex justify-start">
        <div className="flex flex-col">
          <div className="relative w-48">
            <DropdownField
              options={state.languages.map(option => option.label)}
              value={selectedLanguage?.label || state.languages[0]?.label || ""}
              onChange={handleLanguageChange}
              label=""
              valueClassName="font-primary text-base text-typography-700"
            />
          </div>
        </div>
      </div>
    );
  }, [handleLanguageChange, selectedLanguage, state?.languages]);

  // Calculate progress metrics
  const totalScenarios = data?.totalScenarios || data?.scenarios?.length || 0;
  const completedScenarios = data?.completedScenarios || 0;
  const hasProgress = completedScenarios > 0;
  const isComplete = totalScenarios > 0 && completedScenarios === totalScenarios;
  const progressPercentage = totalScenarios > 0 ? (completedScenarios / totalScenarios) * 100 : 0;
  const sortedScenarios = data?.scenarios
    ? [...data.scenarios].sort((a, b) => a.order - b.order)
    : [];

  // Type-specific labels
  const labels = {
    case: {
      breadcrumb: "Cases",
      notFound: "Case not found",
    },
    track: {
      breadcrumb: "Tracks",
      notFound: "Track not found",
    },
  };

  const currentLabels = labels[type];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="text-typography-700 text-lg mb-4">{currentLabels.notFound}</div>
        <button
          onClick={() => navigate(ROUTES.LEARN)}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          Back to Learn
        </button>
      </div>
    );
  }

  const renderBreadcrumb = () => (
    <div className="pt-6 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-typography-700">
        <button onClick={() => navigate(-1)} className="hover:text-primary-500 transition-colors">
          {currentLabels.breadcrumb}
        </button>
        <ArrowRight />
        <span className="text-primary-500 font-medium">{data.title}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-typography-700">
        <CreditsDisplay />
      </div>
    </div>
  );

  const renderCoverImage = () => (
    <div className="relative h-[240px] w-full rounded-[8px] overflow-hidden">
      <CustomImage
        src={data.coverImageUrl}
        alt={data.title}
        className="w-full h-full object-cover bg-background-secondary"
      />
    </div>
  );

  const renderProgressBar = () => {
    if (!hasProgress) return null;

    return (
      <div className="flex items-center gap-3">
        <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${isComplete ? "bg-[#81C784]" : "bg-primary-500"} rounded-full transition-all duration-300`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-sm text-typography-700 whitespace-nowrap">
          {completedScenarios} of {totalScenarios} completed
        </span>
      </div>
    );
  };

  const renderInfo = () => (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-typography-900">{data.title}</h1>
        {renderProgressBar()}
      </div>
      {data.description && (
        <p className="text-base text-typography-800 mb-6 leading-relaxed">{data.description}</p>
      )}
      {!isComplete && (
        <button
          onClick={handleStartOrContinueSimulation}
          className="px-6 py-2 bg-primary-500 text-white rounded-full font-tertiary text-base font-medium hover:bg-primary-600 transition-colors"
        >
          {hasProgress ? "Continue" : "Start"}
        </button>
      )}
    </div>
  );

  const renderHeaderSection = () => (
    <div className="relative w-full sticky top-0 z-10 bg-white pb-[10px] pt-4">
      {renderBreadcrumb()}
      {renderCoverImage()}
      {renderInfo()}
    </div>
  );

  const renderScenariosList = () => (
    <div className="pb-6 pt-3">
      <div className="mx-auto ml-[-10px] w-[calc(100%+20px)]">
        <div>
          {sortedScenarios.map((scenario, index) => (
            <PathwayScenarioCard
              key={scenario.sessionItemId || `scenario-${scenario.scenarioId}-${index}`}
              scenario={scenario}
              index={index}
              onScenarioClick={handleScenarioClick}
              onViewSummary={handleViewSummary}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!selectedScenario) return null;

    return (
      <SimulationDetailsModal
        isOpen={isModalOpen}
        title={selectedScenario.title}
        description={selectedScenario.description}
        coverImageUrl={selectedScenario.coverImageUrl}
        coverVideoUrl={selectedScenario.coverVideoUrl}
        headerTitle="Simulation"
        headerSubtitle="Details"
        scenarioLabel="Scenario:"
        primaryButtonText={isStarting ? "Starting..." : "Start Simulation"}
        secondaryButtonText="Close"
        onPrimaryClick={handleStartSimulation}
        onSecondaryClick={handleCloseModal}
        onClickOutside={handleCloseModal}
        isPrimaryLoading={isStarting}
        triggerWarnings={selectedScenario.triggerWarnings}
        renderAdditionalContent={renderLanguageDropdown}
      />
    );
  };

  return (
    <>
      <div className="min-h-screen bg-white mx-[15%] font-primary">
        {renderHeaderSection()}
        {renderScenariosList()}
      </div>
      {renderModal()}
      <ConfirmationDialog
        isOpen={showNotification}
        title={{ normal: "Before you get started", italic: "" }}
        content="At times, the bot may be unresponsive, or have unusual lag times. We are always working to improve the experience!"
        buttonText="Start Session"
        onButtonClick={handleProceedWithSimulation}
        buttonVariant={ButtonVariant.PRIMARY}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};
