import { FC, useState, useCallback } from "react";

import {
  useGetScenarioPathwayDetailsQuery,
  useLazyGetScenarioSessionByPathItemQuery,
  useStartPathwaySimulationMutation,
} from "@api";
import { ArrowRight } from "@assets";
import { CreditsDisplay, PathwayScenarioCard } from "@components";
import { ROUTES } from "@constants";
import { useStartSimulation } from "@hooks";
import { PathwayScenarioStatus, PathwayScenario } from "@types";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { SimulationDetailsModal, CustomImage } from "@ally-ui-mono/ui-shared";

export const PathwayDetails: FC = () => {
  const { pathwayId } = useParams<{ pathwayId: string }>();
  const navigate = useNavigate();
  const { data: pathway, isLoading } = useGetScenarioPathwayDetailsQuery(pathwayId || "");
  const [selectedScenario, setSelectedScenario] = useState<PathwayScenario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [startPathwaySimulation] = useStartPathwaySimulationMutation();
  const [getScenarioSessionByPathItem] = useLazyGetScenarioSessionByPathItemQuery();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedScenario(null);
  }, []);

  const { startSimulation, isStarting } = useStartSimulation({
    onSuccess: handleCloseModal,
  });

  const enrollPathwaySession = async () => {
    if (!pathway?.scenarioPathSessionId) {
      await startPathwaySimulation({ pathwayId });
    }
  };

  const handleViewSummary = useCallback(
    async (sessionId: string) => {
      try {
        const response = await getScenarioSessionByPathItem({
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
    [getScenarioSessionByPathItem, navigate],
  );

  const handleStartOrContinueSimulation = async () => {
    await enrollPathwaySession();
    const nextScenario = pathway?.scenarios.find(
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

    await enrollPathwaySession();
    const scenario = pathway?.scenarios.find(s => s.scenarioId === scenarioId);
    if (scenario) {
      setSelectedScenario(scenario);
      setIsModalOpen(true);
    }
  };

  const handleStartSimulation = async () => {
    if (!selectedScenario || isStarting) return;

    const updatedSelectedScenario = pathway?.scenarios.find(
      scenario => scenario.scenarioId === selectedScenario.scenarioId,
    );
    if (!updatedSelectedScenario) return;
    const { scenarioId, sessionId, title, coverImageUrl } = updatedSelectedScenario;
    await startSimulation({
      params: {
        scenarioId,
        scenarioPathSessionItemId: sessionId,
      },
      metadata: {
        title,
        coverImageUrl,
      },
    });
  };

  // Calculate progress metrics
  const totalScenarios = pathway?.totalScenarios || pathway?.scenarios?.length || 0;
  const completedScenarios = pathway?.completedScenarios || 0;
  const hasProgress = completedScenarios > 0;
  const isPathwayComplete = totalScenarios > 0 && completedScenarios === totalScenarios;
  const progressPercentage = totalScenarios > 0 ? (completedScenarios / totalScenarios) * 100 : 0;
  const sortedScenarios = pathway?.scenarios
    ? [...pathway.scenarios].sort((a, b) => a.order - b.order)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="text-typography-700 text-lg mb-4">Pathway not found</div>
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
          Track way
        </button>
        <ArrowRight />
        <span className="text-primary-500 font-medium">{pathway.title}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-typography-700">
        <CreditsDisplay />
      </div>
    </div>
  );

  const renderCoverImage = () => (
    <div className="relative h-[240px] w-full rounded-[8px] overflow-hidden">
      <CustomImage
        src={pathway.coverImageUrl}
        alt={pathway.title}
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
            className={`h-full ${isPathwayComplete ? "bg-[#81C784]" : "bg-primary-500"} rounded-full transition-all duration-300`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-sm text-typography-700 whitespace-nowrap">
          {completedScenarios} of {totalScenarios} completed
        </span>
      </div>
    );
  };

  const renderPathwayInfo = () => (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-typography-900">{pathway.title}</h1>
        {renderProgressBar()}
      </div>
      {pathway.description && (
        <p className="text-base text-typography-800 mb-6 leading-relaxed">{pathway.description}</p>
      )}
      {!isPathwayComplete && (
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
      {renderPathwayInfo()}
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
    </>
  );
};
