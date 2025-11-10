import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetSimulationsQuery,
  useDeleteSimulationByIdMutation,
  useUpdateSimulationByIdMutation,
} from "@api";
import { ROUTES, SimulationStatus, SORT_BY, SORT_ORDER } from "@constants";
import { Simulation } from "@types";

const SIMULATIONS_PAGE_SIZE = 30;

interface UseSimulationsProps {
  selectedFilters: Array<{ id: string; label: string }>;
}

export const useSimulations = ({ selectedFilters }: UseSimulationsProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUnpublishPopupOpen, setIsUnpublishPopupOpen] = useState(false);
  const [isArchivePopupOpen, setIsArchivePopupOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);
  const [isUnarchivePopupOpen, setIsUnarchivePopupOpen] = useState(false);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [simulationsOffset, setSimulationsOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);

  const simulationParams = {
    limit: SIMULATIONS_PAGE_SIZE,
    offset: simulationsOffset,
    sortBy: SORT_BY.UPDATED_AT,
    order: SORT_ORDER.DESC,
    status:
      selectedFilters.length > 0 ? selectedFilters?.map(filter => filter.id)?.join(",") : undefined,
  };

  const {
    data: simulationsResponse,
    isFetching: isSimulationsFetching,
    isLoading: isSimulationsLoading,
  } = useGetSimulationsQuery(simulationParams);

  const [deleteSimulationById] = useDeleteSimulationByIdMutation();
  const [updateSimulationById] = useUpdateSimulationByIdMutation();

  useEffect(() => {
    setSimulationsOffset(0);
  }, [selectedFilters]);

  useEffect(() => {
    if (!simulationsResponse) return;
    const nextData = simulationsResponse.data ?? [];
    setHasMore(nextData.length >= SIMULATIONS_PAGE_SIZE);
    if (simulationsOffset === 0) {
      setSimulations(nextData);
    } else {
      setSimulations(previousSimulations => {
        const existingIds = new Set(previousSimulations.map(simulation => simulation.id));
        const newItems = nextData.filter(simulation => !existingIds.has(simulation.id));
        return [...previousSimulations, ...newItems];
      });
    }
  }, [simulationsResponse, simulationsOffset]);

  const loadSimulations = (append = false) => {
    setSimulationsOffset(previousOffset => (append ? previousOffset + SIMULATIONS_PAGE_SIZE : 0));
  };

  const handleNewSimulation = () => {
    navigate(ROUTES.CREATE_SIMULATION);
  };

  const handleCreateSimulation = () => {
    navigate(ROUTES.CREATE_SIMULATION);
  };

  const onEditIconClick = (simulation: Simulation) => {
    if (simulation.status === SimulationStatus.DRAFT) {
      handleEditSimulation(simulation);
      return;
    }
    setCurrentSimulation(simulation);
    setIsEditPopupOpen(true);
  };

  const handleEditSimulation = (simulation: Simulation) => {
    navigate(ROUTES.EDIT_SIMULATION(simulation.id));
  };

  const handleDeleteSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsDeletePopupOpen(true);
  };

  const onDeleteSimulation = async () => {
    if (!currentSimulation) return;

    try {
      await deleteSimulationById(currentSimulation.id).unwrap();
      setIsDeletePopupOpen(false);
      setCurrentSimulation(null);
      toast.success("Simulation deleted successfully");
    } catch {
      toast.error("Failed to delete simulation");
    }
  };

  const handleChangeSimulationStatus = async (status: SimulationStatus) => {
    if (!currentSimulation) return;
    try {
      await updateSimulationById({
        id: currentSimulation.id,
        simulation: { status, title: currentSimulation.title },
      }).unwrap();
      setIsArchivePopupOpen(false);
      setIsUnpublishPopupOpen(false);
      setIsUnarchivePopupOpen(false);
      setCurrentSimulation(null);
      toast.success("Updated simulation status to " + status);
    } catch {
      toast.error("Failed to change simulation status");
    }
  };

  const onArchiveSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsArchivePopupOpen(true);
  };

  const onUnarchiveSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsUnarchivePopupOpen(true);
  };

  const onPreviewSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsPreviewOpen(true);
  };

  const onUnpublishSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsUnpublishPopupOpen(true);
  };

  return {
    // State
    simulations,
    currentSimulation,
    hasMore,
    isSimulationsLoading,
    isSimulationsFetching,
    simulationsResponse,
    simulationsOffset,

    // Popup states
    isPreviewOpen,
    setIsPreviewOpen,
    isUnpublishPopupOpen,
    setIsUnpublishPopupOpen,
    isArchivePopupOpen,
    setIsArchivePopupOpen,
    isDeletePopupOpen,
    setIsDeletePopupOpen,
    isUnarchivePopupOpen,
    setIsUnarchivePopupOpen,
    isEditPopupOpen,
    setIsEditPopupOpen,

    // Actions
    loadSimulations,
    handleNewSimulation,
    handleCreateSimulation,
    onEditIconClick,
    handleEditSimulation,
    handleDeleteSimulation,
    onDeleteSimulation,
    handleChangeSimulationStatus,
    onArchiveSimulation,
    onUnarchiveSimulation,
    onPreviewSimulation,
    onUnpublishSimulation,
  };
};
