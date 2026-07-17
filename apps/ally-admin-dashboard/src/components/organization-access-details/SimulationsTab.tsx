import { useEffect, useState, FC } from "react";

import { useGetSimulationsQuery } from "@api";
import { ListToolbar, EmptyState, EntityToggleCard } from "@components";
import { en, SORT_BY, SORT_ORDER } from "@constants";
import { AccessFilterValue, Simulation, SimulationStatus } from "@types";
import { isNonEmptyArray, toAssignmentStatus } from "@utils";

import { AccessFilter } from "./AccessFilter";

const SIMULATIONS_PAGE_SIZE = 30;

interface SimulationsTabProps {
  organizationId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleAccess: (simulationId: number, enabled: boolean) => Promise<void>;
}

export const SimulationsTab: FC<SimulationsTabProps> = ({
  organizationId,
  searchValue,
  onSearchChange,
  onToggleAccess,
}) => {
  const [simulationsOffset, setSimulationsOffset] = useState(0);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [accessFilter, setAccessFilter] = useState<AccessFilterValue>(AccessFilterValue.ALL);

  const handleToggleAccess = async (simulationId: number, enabled: boolean) => {
    setSimulations(prev =>
      prev.map(simulation =>
        simulation.id === simulationId
          ? { ...simulation, isAssignedToTenant: enabled }
          : simulation,
      ),
    );
    try {
      await onToggleAccess(simulationId, enabled);
      const matchesFilter =
        accessFilter === AccessFilterValue.ALL ||
        (accessFilter === AccessFilterValue.ENABLED) === enabled;
      if (!matchesFilter) {
        setSimulations(prev => prev.filter(simulation => simulation.id !== simulationId));
      }
    } catch {
      setSimulations(prev =>
        prev.map(simulation =>
          simulation.id === simulationId
            ? { ...simulation, isAssignedToTenant: !enabled }
            : simulation,
        ),
      );
    }
  };

  const simulationParams = {
    limit: SIMULATIONS_PAGE_SIZE,
    offset: simulationsOffset,
    sortBy: SORT_BY.UPDATED_AT,
    order: SORT_ORDER.DESC,
    search: searchValue,
    tenantId: organizationId,
    status: SimulationStatus.ACTIVE,
    assignmentStatus: toAssignmentStatus(accessFilter),
  };

  const {
    data: simulationsResponse,
    isFetching: isSimulationsFetching,
    isLoading: isSimulationsLoading,
  } = useGetSimulationsQuery(simulationParams);

  useEffect(() => {
    if (!simulationsResponse) return;
    const nextData = simulationsResponse?.data ?? [];
    if (simulationsOffset === 0) {
      setSimulations(nextData);
    } else {
      setSimulations(prev => {
        const existingIds = new Set(prev.map(simulation => simulation.id));
        const newItems = nextData.filter(simulation => !existingIds.has(simulation.id));
        return [...prev, ...newItems];
      });
    }
  }, [simulationsResponse, simulationsOffset]);

  // Separate effect to notify parent of loaded simulations

  useEffect(() => {
    setSimulationsOffset(0);
  }, [searchValue, accessFilter]);

  const loadMore = () => {
    setSimulationsOffset(prev => prev + SIMULATIONS_PAGE_SIZE);
  };

  const hasMore = simulationsResponse?.data?.length === SIMULATIONS_PAGE_SIZE;

  if (isSimulationsLoading && simulationsOffset === 0) {
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
          filter={<AccessFilter value={accessFilter} onChange={setAccessFilter} />}
        />
      </div>
      {!isNonEmptyArray(simulations) && isSimulationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(simulations) ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8 custom-scrollbar">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-10 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">
              {en.userManagement.simulations}
            </div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {simulations?.map(simulation => (
              <EntityToggleCard
                key={simulation.id}
                entity={{
                  imageUrl: simulation.coverImageUrl,
                  name: simulation.title,
                  description: simulation.description,
                }}
                hasAccess={simulation.isAssignedToTenant ?? false}
                onToggleAccess={enabled => handleToggleAccess(simulation.id, enabled)}
              />
            ))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isSimulationsFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
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
