import React, { useEffect, useState, FC } from "react";

import { useGetSimulationsQuery } from "@api";
import { ListToolbar, EmptyState, SimulationAndPathToggleCard } from "@components";
import { en, SORT_BY, SORT_ORDER } from "@constants";
import { Simulation, SimulationStatus } from "@types";
import { isNonEmptyArray } from "@utils";

const SIMULATIONS_PAGE_SIZE = 30;

interface SimulationsTabProps {
  organizationId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  simulationAccess: Record<string, boolean>;
  onToggleAccess: (simulationId: number, enabled: boolean) => void;
  onSimulationsLoaded?: (simulationIds: string[]) => void;
}

export const SimulationsTab: FC<SimulationsTabProps> = ({
  searchValue,
  onSearchChange,
  simulationAccess,
  onToggleAccess,
  onSimulationsLoaded,
}) => {
  const [simulationsOffset, setSimulationsOffset] = useState(0);
  const [simulations, setSimulations] = useState<Simulation[]>([]);

  const simulationParams = {
    limit: SIMULATIONS_PAGE_SIZE,
    offset: simulationsOffset,
    sortBy: SORT_BY.UPDATED_AT,
    order: SORT_ORDER.DESC,
    search: searchValue,
  };

  const {
    data: simulationsResponse,
    isFetching: isSimulationsFetching,
    isLoading: isSimulationsLoading,
  } = useGetSimulationsQuery(simulationParams);

  useEffect(() => {
    if (!simulationsResponse) return;
    const nextData = simulationsResponse.data ?? [];
    const published = nextData.filter(simulation => simulation.status === SimulationStatus.ACTIVE);
    if (simulationsOffset === 0) {
      setSimulations(published);
    } else {
      setSimulations(prev => {
        const existingIds = new Set(prev.map(simulation => simulation.id));
        const newItems = published.filter(simulation => !existingIds.has(simulation.id));
        return [...prev, ...newItems];
      });
    }
  }, [simulationsResponse, simulationsOffset]);

  // Separate effect to notify parent of loaded simulations
  useEffect(() => {
    if (isNonEmptyArray(simulations) && onSimulationsLoaded) {
      onSimulationsLoaded(simulations.map(simulation => simulation.id.toString()));
    }
  }, [simulations.length]); // Only run when the count changes, not on every simulation change

  React.useEffect(() => {
    setSimulationsOffset(0);
  }, [searchValue]);

  const loadMore = () => {
    setSimulationsOffset(prev => prev + SIMULATIONS_PAGE_SIZE);
  };

  const hasMore = simulationsResponse?.count
    ? simulations.length < simulationsResponse.count
    : simulations.length >= SIMULATIONS_PAGE_SIZE;

  const filteredSimulations = simulations.filter(
    simulation =>
      simulation.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      simulation.description?.toLowerCase().includes(searchValue.toLowerCase()),
  );

  if (isSimulationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">{en.common.loading}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white pb-2">
        <ListToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          placeholder={en.common.search}
        />
      </div>
      {!isNonEmptyArray(filteredSimulations) && isSimulationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(filteredSimulations) ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-10 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">
              {en.userManagement.simulations}
            </div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {filteredSimulations?.map(simulation => (
              <SimulationAndPathToggleCard
                key={simulation.id}
                simulation={simulation}
                hasAccess={simulationAccess[simulation.id] ?? false}
                onToggleAccess={enabled => onToggleAccess(simulation.id, enabled)}
              />
            ))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isSimulationsFetching}
                  className="inline-flex font-tertiary items-center disabled:opacity-50 text-sm text-typography-600 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isSimulationsFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
