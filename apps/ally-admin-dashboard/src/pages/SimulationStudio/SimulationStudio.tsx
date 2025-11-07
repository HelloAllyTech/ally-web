import React, { useEffect, useState } from "react";

import { ButtonVariant } from "@src/components/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetSimulationsQuery,
  useDeleteSimulationByIdMutation,
  useUpdateSimulationByIdMutation,
} from "@api";
import { Add, Close, Filter } from "@assets";
import {
  ActionConfirmationPopup,
  DeleteSimulationPopup,
  SimulationList,
  SimulationListSkeleton,
  SimulationPreview,
  FilterList,
  EmptyState,
} from "@components";
import { en, ROUTES, SimulationStatus, SORT_BY, SORT_ORDER } from "@constants";
import { Simulation } from "@types";
import { isNonEmptyArray } from "@utils";

const SIMULATIONS_PAGE_SIZE = 30;

export const SimulationStudio: React.FC = () => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUnpublishPopupOpen, setIsUnpublishPopupOpen] = useState(false);
  const [isArchivePopupOpen, setIsArchivePopupOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Array<{ id: string; label: string }>>([]);
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

  const handleFilterClick = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterItemClose = (filter: { id: string; label: string }) => {
    setSelectedFilters(selectedFilters.filter(selectedFilter => selectedFilter.id !== filter.id));
  };

  const handleFilterClose = () => {
    setIsFilterOpen(false);
  };

  const handleApplyFilters = (filters: Array<{ id: string; label: string }>) => {
    setSelectedFilters(filters);
    setIsFilterOpen(false);
  };

  const renderSimulationEmptyState = () => {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-typography-900 mb-4">
            {en.simulation.createYourFirstSimulation}{" "}
            <span className="italic">{en.simulation.simulation}</span>
          </h2>
          <p className="text-typography-600 text-base mb-8 leading-relaxed font-primary">
            {en.simulation.newSimulationDescription}
          </p>
          <button
            onClick={handleCreateSimulation}
            className="bg-primary hover:bg-primary-600 text-base text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-primary transition-colors"
          >
            <Add />
            {en.simulation.createSimulation}
          </button>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <div className="flex justify-start mt-2 px-4">
        <button
          onClick={() => loadSimulations(true)}
          disabled={isSimulationsFetching}
          className="inline-flex font-tertiary items-center disabled:opacity-50 text-sm text-typography-600 font-medium py-1 px-1 hover:text-typography-700"
        >
          + {isSimulationsFetching ? en.common.loading : en.common.loadMore}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-full font-secondary">
      <div className="flex justify-between items-center mb-4 border-b border-border-light pb-4">
        <h1 className="text-2xl text-typography-900 font-primary">
          {en.simulation.simulationstudio}
        </h1>
        <button
          onClick={handleNewSimulation}
          className="font-tertiary bg-primary hover:bg-primary-600 text-white text-base pl-4 pr-5 py-2 rounded-full flex items-center gap-2 transition-colors h-[40px]"
        >
          <Add />
          {en.simulation.newSimulation}
        </button>
      </div>
      <div className="flex flex-row items-center border-b border-border-light pb-4 pl-5 relative">
        <button onClick={handleFilterClick}>
          <Filter />
        </button>
        <div className="flex flex-row items-center gap-2 ml-3 h-[18px]">
          {selectedFilters.length > 0 &&
            selectedFilters.map(filter => (
              <div
                key={filter.id}
                className="flex flex-row items-center gap-1 border border-border-light rounded-full px-2 py-1"
              >
                <span className="text-xs text-typography-500">{filter.label}</span>

                <button onClick={() => handleFilterItemClose(filter)}>
                  <Close />
                </button>
              </div>
            ))}
        </div>
        <FilterList
          isOpen={isFilterOpen}
          onClose={handleFilterClose}
          selectedFilters={selectedFilters}
          onApply={handleApplyFilters}
        />
      </div>
      {isSimulationsLoading ||
      (simulationsOffset === 0 &&
        simulations.length === 0 &&
        simulationsResponse &&
        isNonEmptyArray(simulationsResponse.data)) ? (
        <SimulationListSkeleton />
      ) : simulations.length > 0 ? (
        <SimulationList
          simulations={simulations}
          onEdit={onEditIconClick}
          onDelete={handleDeleteSimulation}
          onPreview={onPreviewSimulation}
          onArchive={onArchiveSimulation}
          onUnpublish={onUnpublishSimulation}
          onUnarchive={onUnarchiveSimulation}
          footer={renderFooter()}
        />
      ) : selectedFilters.length > 0 ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        renderSimulationEmptyState()
      )}
      <ActionConfirmationPopup
        isOpen={isUnpublishPopupOpen}
        onClose={() => setIsUnpublishPopupOpen(false)}
        title={en.simulation.unpublish}
        titleItalic={`${en.simulation.simulation}?`}
        description={en.simulation.unpublishDescription}
        primaryButton={{
          label: en.simulation.unpublish,
          onClick: () => handleChangeSimulationStatus(SimulationStatus.DRAFT),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsUnpublishPopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      <ActionConfirmationPopup
        isOpen={isUnarchivePopupOpen}
        onClose={() => setIsUnarchivePopupOpen(false)}
        title={en.simulation.unarchive}
        titleItalic={`${en.simulation.simulation}?`}
        description={en.simulation.unarchiveDescription}
        primaryButton={{
          label: en.simulation.unarchive,
          onClick: () => handleChangeSimulationStatus(SimulationStatus.DRAFT),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsUnarchivePopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      <ActionConfirmationPopup
        isOpen={isArchivePopupOpen}
        onClose={() => setIsArchivePopupOpen(false)}
        title={en.simulation.archive}
        titleItalic={`${en.simulation.simulation}?`}
        description={en.simulation.archiveDescription}
        primaryButton={{
          label: en.simulation.archive,
          onClick: () => handleChangeSimulationStatus(SimulationStatus.ARCHIVED),
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsArchivePopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />
      {currentSimulation && (
        <SimulationPreview
          simulation={currentSimulation}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
      <DeleteSimulationPopup
        isOpen={isDeletePopupOpen}
        onClose={() => setIsDeletePopupOpen(false)}
        simulation={currentSimulation}
        onConfirmDelete={onDeleteSimulation}
      />
      {currentSimulation && (
        <ActionConfirmationPopup
          isOpen={isEditPopupOpen}
          onClose={() => setIsEditPopupOpen(false)}
          title={en.simulation.edit}
          titleItalic={en.simulation.simulation}
          description={en.simulation.editDescription}
          primaryButton={{
            label: en.simulation.edit,
            onClick: () => handleEditSimulation(currentSimulation),
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.simulation.cancel,
            onClick: () => setIsEditPopupOpen(false),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}
    </div>
  );
};
