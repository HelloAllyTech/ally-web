import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetSimulationsQuery,
  useDeleteSimulationByIdMutation,
  useUpdateSimulationByIdMutation,
  useDuplicateSimulationMutation,
} from "@api";
import {
  en,
  ROUTES,
  SIMULATION_CATEGORY_FILTER_OPTIONS,
  SimulationStatus,
  SORT_BY,
  SORT_ORDER,
} from "@constants";
import { Simulation } from "@types";

const SIMULATIONS_PAGE_SIZE = 30;

// The filter dropdown mixes Status and Category checkboxes into one selected
// array; the ids are disjoint (ACTIVE/DRAFT/ARCHIVED vs ORIGINALS/DEMO/…), so
// membership here routes an id to the right query param. Resolved at call
// time (not module scope): the @constants barrel is circular with
// SimulationCreator, so its bindings aren't safe to read during module eval.
const isCategoryFilterId = (id: string) =>
  SIMULATION_CATEGORY_FILTER_OPTIONS.some(option => option.id === id);

interface UseSimulationsProps {
  selectedFilters?: Array<{ id: string; label: string }>;
  search?: string;
}

export const useSimulations = ({ selectedFilters, search }: UseSimulationsProps) => {
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
  const [simulationLimit, setSimulationLimit] = useState(SIMULATIONS_PAGE_SIZE);
  const [IsDuplicateSimulationPopupOpen, setIsDuplicateSimulationPopupOpen] = useState(false);

  const statusFilterIds = (selectedFilters ?? [])
    .filter(filter => !isCategoryFilterId(filter.id))
    .map(filter => filter.id);
  const categoryFilterIds = (selectedFilters ?? [])
    .filter(filter => isCategoryFilterId(filter.id))
    .map(filter => filter.id);

  const simulationParams = {
    limit: simulationLimit,
    offset: simulationsOffset,
    sortBy: SORT_BY.UPDATED_AT,
    order: SORT_ORDER.DESC,
    status: statusFilterIds.length > 0 ? statusFilterIds.join(",") : undefined,
    category: categoryFilterIds.length > 0 ? categoryFilterIds.join(",") : undefined,
    search: search || undefined,
  };

  const {
    data: simulationsResponse,
    isFetching: isSimulationsFetching,
    isLoading: isSimulationsLoading,
  } = useGetSimulationsQuery(simulationParams);

  const [deleteSimulationById] = useDeleteSimulationByIdMutation();
  const [updateSimulationById] = useUpdateSimulationByIdMutation();
  const [duplicateSimulation] = useDuplicateSimulationMutation();

  useEffect(() => {
    setSimulationsOffset(0);
  }, [selectedFilters, search]);

  useEffect(() => {
    if (!simulationsResponse) return;
    const nextData = simulationsResponse.data ?? [];
    setHasMore(nextData.length >= simulationLimit);
    if (simulationsOffset === 0) {
      setSimulations(nextData);
      setSimulationLimit(SIMULATIONS_PAGE_SIZE);
    } else {
      setSimulations(previousSimulations => {
        const existingIds = new Set(previousSimulations.map(simulation => simulation.id));
        const newItems = nextData.filter(simulation => !existingIds.has(simulation.id));
        return [...previousSimulations, ...newItems];
      });
    }
  }, [simulationsResponse, simulationsOffset]);

  const loadSimulations = (append = false) => {
    setSimulationsOffset(previousOffset => (append ? previousOffset + simulationLimit : 0));
  };

  const reLoadCurrentSimulations = () => {
    setSimulationsOffset(0);
    setSimulationLimit(simulationsOffset + SIMULATIONS_PAGE_SIZE);
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

  // Read-only inspection: never touches the scenario, so a published sim
  // stays published (no draft-confirmation popup, unlike onEditIconClick).
  const handleViewSimulation = (simulation: Simulation) => {
    navigate(ROUTES.VIEW_SIMULATION(simulation.id));
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
      toast.success(en.simulation.simulationDeletedSuccessfully);
      setSimulations(previousSimulations =>
        previousSimulations.filter(simulation => simulation.id !== currentSimulation?.id),
      );
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDeleteSimulation);
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
      setSimulations(previousSimulations =>
        previousSimulations.map(simulation => {
          if (simulation.id === currentSimulation?.id) {
            return { ...simulation, status };
          }
          return simulation;
        }),
      );
      toast.success(en.simulation.simulationStatusUpdatedSuccessfully + status);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedChangeSimulationStatus);
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

  const handleDuplicateSimulation = async (simulation: Simulation) => {
    try {
      await duplicateSimulation(simulation.id).unwrap();
      setIsDuplicateSimulationPopupOpen(false);
      setCurrentSimulation(null);
      reLoadCurrentSimulations();
      toast.success(en.simulation.simulationDuplicatedSuccessfully);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDuplicateSimulation);
    }
  };

  const onDuplicateSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setIsDuplicateSimulationPopupOpen(true);
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
    IsDuplicateSimulationPopupOpen,
    setIsDuplicateSimulationPopupOpen,

    // Actions
    loadSimulations,
    handleNewSimulation,
    handleCreateSimulation,
    onEditIconClick,
    handleEditSimulation,
    handleViewSimulation,
    handleDeleteSimulation,
    onDeleteSimulation,
    handleChangeSimulationStatus,
    onArchiveSimulation,
    onUnarchiveSimulation,
    onPreviewSimulation,
    onUnpublishSimulation,
    onDuplicateSimulation,
    handleDuplicateSimulation,
  };
};
