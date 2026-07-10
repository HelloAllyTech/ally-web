import { FC, useState, useEffect, useRef } from "react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetScenarioCasesQuery, useGetSimulationsQuery } from "@api";
import { Search } from "@assets";
import { en } from "@constants";
import { GetScenarioType, Simulation, SimulationStatus } from "@types";
import { isNonEmptyArray } from "@utils";

import { Button } from "../button";
import { EmptyState } from "../empty-state";
import { SimulationCardItem } from "./SimulationItem";
import { ButtonVariant } from "../types";

/** Minimal shape the picker list needs — satisfied by Simulation and ScenarioPath (cases). */
interface PickerRow {
  id: number | string;
  title: string;
  description?: string;
  coverImageUrl: string;
}

interface SimulationProps {
  showSimulation: boolean;
  toggleSimulationModal: () => void;
  formMethods?: any;
  selectedSimulations: GetScenarioType[];
  setSelectedSimulations: (simulations: GetScenarioType[]) => void;
  isDisabled?: boolean;
  isCase?: boolean;
  /**
   * "multi" (default) keeps the historical checkbox + inline sortable list
   * behavior. "single" renders the picker modal only, with radio semantics —
   * used by the track builder's roleplay/case editors.
   */
  selectionMode?: "single" | "multi";
  /** Data source for the picker list: simulations (default) or library cases. */
  entityType?: "simulation" | "case";
}

const SIMULATIONS_PAGE_SIZE = 20;

export const SimulationSelectionModal: FC<SimulationProps> = ({
  showSimulation,
  toggleSimulationModal,
  formMethods,
  selectedSimulations,
  setSelectedSimulations,
  isDisabled = false,
  isCase = false,
  selectionMode = "multi",
  entityType = "simulation",
}) => {
  const [checkedSimulation, setCheckedSimulation] = useState<GetScenarioType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMessageIndex, setOpenMessageIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [allSimulations, setAllSimulations] = useState<PickerRow[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const isSingleSelect = selectionMode === "single";
  const isCasePicker = entityType === "case";

  const simulationParams = {
    limit: SIMULATIONS_PAGE_SIZE,
    offset: (page - 1) * SIMULATIONS_PAGE_SIZE,
    search: searchQuery,
    status: SimulationStatus.ACTIVE,
  };

  const { data: simulationsResponse, isFetching: isFetchingSimulations } = useGetSimulationsQuery(
    simulationParams,
    { skip: isCasePicker },
  );
  const { data: casesResponse, isFetching: isFetchingCases } = useGetScenarioCasesQuery(
    simulationParams,
    { skip: !isCasePicker },
  );
  const listResponse = isCasePicker ? casesResponse : simulationsResponse;
  const isFetching = isCasePicker ? isFetchingCases : isFetchingSimulations;
  const simulationList = allSimulations;

  const mapToGetScenarioType = (simulation: PickerRow, order: number): GetScenarioType => {
    return {
      scenarioId: simulation.id as number,
      order,
      coverImageUrl: simulation.coverImageUrl,
      title: simulation.title,
      description: simulation.description ?? "",
      minimumScore: 0,
      messageTitle: "",
      messageContent: "",
    };
  };

  const clearAndToggle = () => {
    setSearchQuery("");
    toggleSimulationModal();
  };

  const toggleSelection = () => {
    setSelectedSimulations(checkedSimulation);
    clearAndToggle();
  };

  const handleCheckBoxClick = (simulation: GetScenarioType) => {
    setCheckedSimulation(prev => {
      const exists = prev.some(item => item.scenarioId === simulation.scenarioId);

      // Radio semantics in single-select mode: clicking replaces the selection.
      if (isSingleSelect) {
        return exists ? [] : [{ ...simulation, order: 1 }];
      }

      if (exists) {
        const filtered = prev.filter(item => item.scenarioId !== simulation.scenarioId);
        return filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
      } else {
        return [...prev, { ...simulation, order: prev.length + 1 }];
      }
    });
  };

  const handleMessageClick = (index: number) => {
    setOpenMessageIndex(prev => (prev === index ? null : index));
  };

  const handleDeleteMessage = (index: number) => {
    const updated = [...selectedSimulations];

    updated[index] = {
      ...updated[index],
      messageTitle: "",
      messageContent: "",
    };

    setSelectedSimulations(updated);
  };

  // Sync with form when simulations change
  useEffect(() => {
    if (formMethods) {
      // Map simulations to the expected payload format
      const scenarios = selectedSimulations.map(simulation => ({
        scenarioId: simulation.scenarioId,
        order: simulation.order,
        minimumScore: simulation.minimumScore,
        messageTitle: simulation.messageTitle || "",
        messageContent: simulation.messageContent || "",
        coverImageUrl: simulation.coverImageUrl,
        title: simulation.title,
        description: simulation.description,
      }));

      formMethods.setValue("scenarios", scenarios);
    }
  }, [selectedSimulations, formMethods]);

  useEffect(() => {
    if (showSimulation) setCheckedSimulation(selectedSimulations);
  }, [showSimulation, selectedSimulations]);

  // Reset pagination when search query changes
  useEffect(() => {
    setPage(1);
    setAllSimulations([]);
    setHasMore(true);
  }, [searchQuery]);

  // Load simulations data
  useEffect(() => {
    if (listResponse?.data) {
      const newSimulations = listResponse.data;

      if (page === 1) {
        setAllSimulations(newSimulations);
      } else {
        setAllSimulations(prev => {
          const existingIds = new Set(prev.map(opt => opt.id));
          const addSimulation = newSimulations.filter(opt => !existingIds.has(opt.id));
          return [...prev, ...addSimulation];
        });
      }

      // Check if there are more items to load
      if (newSimulations.length < SIMULATIONS_PAGE_SIZE) {
        setHasMore(false);
      }
    }
  }, [listResponse, page]);

  // Intersection Observer for infinite scroll
  const handleObserver = (entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    const element = loadingRef.current;
    const option = {
      root: scrollContainerRef.current,
      rootMargin: "20px",
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    if (element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [handleObserver]);

  const renderEmptyScreen = () => (
    <EmptyState
      title={en.simulation.noSimulationsAddedYet}
      subtitle={en.simulation.newPathwayDescription}
      actionLabel={en.simulation.addSimulation}
      onAction={toggleSimulationModal}
    />
  );

  const renderMessage = (messageTitle: string, messageContent: string, index: number) => (
    <div className="rounded-md flex flex-col justify-center border mx-auto my-3 w-[800px] group">
      <div
        ref={element => (messageRefs.current[index] = element)}
        className="w-full bg-secondary-50 px-2 py-2 rounded-t-md flex justify-between items-center"
      >
        <p className="text-base text-typography-900 font-medium">{en.simulation.message}</p>
        {!isDisabled && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex cursor-pointer gap-2">
            <button className="text-xs text-primary-500" onClick={() => handleMessageClick(index)}>
              {en.common.edit}
            </button>

            <button className="text-xs" onClick={() => handleDeleteMessage(index)}>
              {en.common.delete}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col p-3">
        <p className="text-xs font-semibold text-typography-900 ">{messageTitle}</p>
        <p className="text-xs text-typography-800  break-words">{messageContent}</p>
      </div>
    </div>
  );
  const handleDragEnd = event => {
    if (isDisabled) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = selectedSimulations.findIndex(i => String(i.scenarioId) === active.id);
    const newIndex = selectedSimulations.findIndex(i => String(i.scenarioId) === over.id);

    const newOrder = arrayMove(selectedSimulations, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setSelectedSimulations(newOrder);
  };

  const renderSimulationList = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={selectedSimulations.map(scenario => String(scenario.scenarioId))}
        strategy={verticalListSortingStrategy}
      >
        {selectedSimulations.map((simulation, index) => (
          <SimulationCardItem
            key={simulation.scenarioId}
            simulation={simulation}
            index={index}
            selectedSimulations={selectedSimulations}
            setSelectedSimulations={setSelectedSimulations}
            openMessageIndex={openMessageIndex}
            setOpenMessageIndex={setOpenMessageIndex}
            handleMessageClick={handleMessageClick}
            renderMessage={renderMessage}
            addMessageRef={messageRefs}
            isDisabled={isDisabled}
          />
        ))}
      </SortableContext>
    </DndContext>
  );

  const renderSimulationModal = () => (
    <div className="fixed inset-0 z-50" onClick={toggleSimulationModal}>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-xl w-full animate-in fade-in-0 zoom-in-95 duration-200 px-6 py-4"
          onClick={event => event.stopPropagation()}
        >
          <h1 className="text-lg">
            {isSingleSelect
              ? `Select ${isCasePicker ? "case" : "simulation"}`
              : isCase
                ? en.simulation.addSimulationToCase
                : en.simulation.addSimulationToPath}
          </h1>

          <div className="relative w-full mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
            <input
              type="text"
              placeholder={isCasePicker ? "Search case" : "Search simulation"}
              className="w-full !outline-none border rounded-md py-1 px-8 text-base"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div ref={scrollContainerRef} className="mt-4 h-80 overflow-y-auto custom-scrollbar">
            {!isNonEmptyArray(simulationList) && !isFetching ? (
              <p className="text-center text-typography-600 py-8">
                {en.simulation.noSimulationFound}
              </p>
            ) : (
              <>
                {simulationList?.map(simulation => {
                  const isSelected = checkedSimulation.some(
                    item => item.scenarioId === simulation.id,
                  );

                  const nextOrder = checkedSimulation.length + 1;

                  return (
                    <div
                      key={simulation.id}
                      className="flex items-center gap-5 py-2 hover:bg-secondary-50 rounded-md px-2 cursor-pointer"
                      onClick={() =>
                        handleCheckBoxClick(mapToGetScenarioType(simulation, nextOrder))
                      }
                    >
                      <input
                        type={isSingleSelect ? "radio" : "checkbox"}
                        checked={isSelected}
                        onChange={() =>
                          handleCheckBoxClick(mapToGetScenarioType(simulation, nextOrder))
                        }
                        onClick={event => event.stopPropagation()}
                        className="cursor-pointer"
                      />
                      <div className="w-20 h-10 rounded-md overflow-hidden flex-shrink-0">
                        <CustomImage
                          src={simulation.coverImageUrl}
                          alt={simulation.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-typography-900 font-primary truncate max-w-[200px]">
                        {simulation.title}
                      </span>
                    </div>
                  );
                })}

                {/* Loading indicator and intersection observer target */}
                {hasMore && (
                  <div ref={loadingRef} className="text-center py-2">
                    {isFetching && (
                      <span className="text-sm text-typography-600">Loading more...</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t pt-3">
            <Button
              variant={ButtonVariant.SECONDARY}
              className="w-1/3 !text-base"
              onClick={clearAndToggle}
            >
              {en.common.cancel}
            </Button>
            <Button className="w-1/3 !text-base" onClick={toggleSelection}>
              {isSingleSelect ? "Select" : en.simulation.addSelected}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Single-select mode renders only the picker modal — the caller owns the
  // "selected card + Change" presentation (track builder editors).
  if (isSingleSelect) {
    return <>{showSimulation && renderSimulationModal()}</>;
  }

  return (
    <>
      {selectedSimulations.length > 0 ? renderSimulationList() : renderEmptyScreen()}
      {showSimulation && renderSimulationModal()}
    </>
  );
};
