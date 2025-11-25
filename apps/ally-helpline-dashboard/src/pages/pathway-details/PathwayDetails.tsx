import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { logger, SimulationDetailsModal, CustomImage } from "@ally-ui-mono/ui-shared";
import {
  useEndSimulationMutation,
  useGetScenarioPathwayDetailsQuery,
  useStartPathwaySimulationMutation,
  useStartSimulationMutation,
} from "@api";
import { ArrowRight, Lock, TickGreenBackground } from "@assets";
import { CreditsDisplay } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { PathwayScenarioStatus, PathwayScenario } from "@types";

interface ScenarioCardProps {
  scenario: PathwayScenario;
  index: number;
  onScenarioClick: (scenarioId: number, status: PathwayScenarioStatus) => void;
}

const ScenarioCard: FC<ScenarioCardProps> = ({ scenario, index, onScenarioClick }) => {
  const navigate = useNavigate();
  const isLocked = scenario.status === PathwayScenarioStatus.LOCKED;
  const isCompleted = scenario.status === PathwayScenarioStatus.COMPLETED;

  const getStatusBadge = (status: PathwayScenarioStatus) => {
    switch (status) {
      case PathwayScenarioStatus.COMPLETED:
        return (
          <div className="inline-flex items-center gap-1 ml-2">
            <TickGreenBackground className="w-4 h-4" />
          </div>
        );
      case PathwayScenarioStatus.UNLOCKED:
        return (
          <span className="ml-2 px-[8px] py-[2px] text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            Next
          </span>
        );
      default:
        return null;
    }
  };

  const handleViewSummary = (event: React.MouseEvent<HTMLButtonElement>, scenarioId: number) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/simulation-summary/${scenarioId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onScenarioClick(scenario.scenarioId, scenario.status)}
      className={`
        hover:bg-[#F8F9FA] border-b border-b-[0.5px] border-border-light overflow-hidden
        transition-all duration-200
        ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex gap-6 py-4 px-[10px] items-center">
        {/* Scenario Image */}
        <div className="relative flex-shrink-0">
          <CustomImage
            src={scenario.coverImageUrl}
            alt={scenario.title}
            className="w-[120px] h-[60px] object-cover rounded-[8px] bg-background-secondary"
          />
          {isLocked && (
            <div className="absolute inset-0 bg-black/40 rounded-[8px] flex items-center justify-center">
              <div className="w-12 h-12 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>

        {/* Scenario Content */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center mb-2">
            <p className="text-sm text-typography-700 font-tertiary">Simulation {index + 1}</p>
            {getStatusBadge(scenario.status)}
          </div>
          <h3 className="text-base font-semibold text-typography-900 leading-tight">
            {scenario.title}
          </h3>
        </div>

        {/* View Summary Link */}
        {isCompleted && (
          <button
            onClick={e => handleViewSummary(e, scenario.scenarioId)}
            className="text-primary-500 font-medium text-sm hover:underline whitespace-nowrap"
          >
            View summary
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const PathwayDetails: FC = () => {
  const { pathwayId } = useParams<{ pathwayId: string }>();
  const navigate = useNavigate();
  const { data: pathway, isLoading } = useGetScenarioPathwayDetailsQuery(pathwayId || "");
  const [selectedScenario, setSelectedScenario] = useState<PathwayScenario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [startSimulation] = useStartSimulationMutation();
  const [endSimulation] = useEndSimulationMutation();
  const [startPathwaySimulation] = useStartPathwaySimulationMutation();

  const handleStartOrContinueSimulation = () => {
    const nextScenario = pathway?.scenarios.find(
      scenario => scenario.status !== PathwayScenarioStatus.COMPLETED,
    );
    if (!pathway?.scenarioPathSessionId) startPathwaySimulation({ pathwayId });
    setSelectedScenario(nextScenario);
    setIsModalOpen(true);
  };

  const handleScenarioClick = (scenarioId: number, status: PathwayScenarioStatus) => {
    if (status !== PathwayScenarioStatus.LOCKED) {
      const scenario = pathway?.scenarios.find(scenario => scenario.scenarioId === scenarioId);
      if (!pathway?.scenarioPathSessionId) startPathwaySimulation({ pathwayId });
      if (scenario) {
        setSelectedScenario(scenario);
        setIsModalOpen(true);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedScenario(null);
  };

  const handleStartSimulation = async () => {
    if (!selectedScenario || isStarting) return;
    setIsStarting(true);

    try {
      const { data, error } = await startSimulation({
        scenarioId: selectedScenario.scenarioId,
        scenarioPathSessionItemId: selectedScenario?.sessionId || "",
      });
      // Handle success
      if (data) {
        const { scenarioSession, accessToken } = data;
        storeRoomDataAndNavigate(scenarioSession, accessToken);
      }
      // Handle error
      if (error) {
        const errorData = error as { data?: { statusCode?: number; entityId?: string } };
        if (errorData.data?.statusCode === 403) {
          toast.error("You are not authorized to start this simulation");
        } else if (errorData.data?.statusCode === 400 && errorData?.data?.entityId) {
          await endSimulation({ sessionId: errorData?.data?.entityId });
          toast.success("Previous simulation ended. Starting new one...");
          const retryResult = await startSimulation({
            scenarioId: selectedScenario?.scenarioId,
            scenarioPathSessionItemId: selectedScenario?.sessionId || "",
          });
          if (retryResult?.data) {
            const { scenarioSession, accessToken } = retryResult?.data || {};
            storeRoomDataAndNavigate(scenarioSession, accessToken);
          }
        } else {
          toast.error("Failed to start simulation");
        }
        setIsStarting(false);
        return;
      }
    } catch {
      logger.error(`Failed to start simulation`);
      setIsStarting(false);
    }
  };

  const storeRoomDataAndNavigate = (scenarioSession: any, accessToken: any) => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.ROOM_DATA,
      JSON.stringify({
        roomId: scenarioSession.id,
        name: selectedScenario?.title,
        coverImageUrl: selectedScenario?.coverImageUrl,
        accessToken: accessToken.token,
        createdAt: scenarioSession.startedAt,
        serverUrl: accessToken.serverUrl,
      }),
    );

    handleCloseModal();
    navigate(`/simulation/${scenarioSession.id}`);
  };

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

  // Calculate progress metrics after pathway validation
  const totalScenarios = pathway.totalScenarios || pathway.scenarios?.length || 0;
  const hasProgress = (pathway.completedScenarios || 0) > 0;
  const progressPercentage =
    totalScenarios > 0 ? ((pathway.completedScenarios || 0) / totalScenarios) * 100 : 0;
  const sortedScenarios = pathway.scenarios
    ? [...pathway.scenarios].sort((a, b) => a.order - b.order)
    : [];

  const renderHeaderSection = () => {
    return (
      <div className="relative w-full sticky top-0 z-10 bg-white pb-[10px] pt-4">
        {/* Breadcrumb */}
        <div className="pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-typography-700">
            <button
              onClick={() => navigate(ROUTES.LEARN)}
              className="hover:text-primary-500 transition-colors"
            >
              Path way
            </button>
            <ArrowRight />
            <span className="text-primary-500 font-medium">{pathway.title}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-typography-700">
            <CreditsDisplay />
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative h-[240px] w-full rounded-[8px] overflow-hidden">
          <CustomImage
            src={pathway.coverImageUrl}
            alt={pathway.title}
            className="w-full h-full object-cover bg-background-secondary"
          />
        </div>

        {/* Pathway Info */}
        <div className="pt-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-typography-900">{pathway.title}</h1>
            {hasProgress && (
              <div className="flex items-center gap-3">
                <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-typography-700 whitespace-nowrap">
                  {pathway.completedScenarios} of {totalScenarios} completed
                </span>
              </div>
            )}
          </div>
          {pathway.description && (
            <p className="text-base text-typography-800 mb-6 leading-relaxed">
              {pathway.description}
            </p>
          )}
          <button
            onClick={handleStartOrContinueSimulation}
            className="px-6 py-2 bg-primary-500 text-white rounded-full font-tertiary text-base font-medium hover:bg-primary-600 transition-colors"
          >
            {hasProgress ? "Continue" : "Start"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-white mx-[15%] font-primary">
        {renderHeaderSection()}
        {/* Scenarios List */}
        <div className="pb-6 pt-3">
          <div className="max-w-5xl mx-auto ml-[-10px] w-[calc(100%+20px)]">
            <div>
              {sortedScenarios?.map((scenario, index) => (
                <ScenarioCard
                  key={scenario.sessionItemId || `scenario-${scenario.scenarioId}-${index}`}
                  scenario={scenario}
                  index={index}
                  onScenarioClick={handleScenarioClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {selectedScenario && (
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
        />
      )}
    </>
  );
};
