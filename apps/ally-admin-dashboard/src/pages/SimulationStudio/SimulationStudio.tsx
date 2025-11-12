import React, { useRef, useState } from "react";

import { Add, Close, Filter, Simulation as SimulationIcon, Pathway } from "@assets";
import {
  ActionConfirmationPopup,
  DeleteSimulationPopup,
  SimulationList,
  SimulationListSkeleton,
  SimulationPreview,
  FilterList,
  EmptyState,
  Button,
  Tabs,
  OptionsPopup,
} from "@components";
import { ButtonVariant } from "@components/types";
import { en, SimulationStatus } from "@constants";
import { useSimulations, useSimulationPathways } from "@hooks";
import { isNonEmptyArray } from "@utils";

const TABS = [
  { id: "simulations", label: "Simulations" },
  { id: "pathways", label: "Pathways" },
];

export const SimulationStudio: React.FC = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Array<{ id: string; label: string }>>([]);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);

  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Use the custom hook for simulations
  const {
    simulations,
    currentSimulation,
    hasMore,
    isSimulationsLoading,
    isSimulationsFetching,
    simulationsResponse,
    simulationsOffset,
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
  } = useSimulations({ selectedFilters });

  // Use the custom hook for pathways
  const {
    pathways,
    hasMore: hasMorePathways,
    isPathwaysLoading,
    isPathwaysFetching,
    loadPathways,
    handleNewPathway: handleNewPathwayFromHook,
    onEditPathway,
    handleDeletePathway,
    onPreviewPathway,
  } = useSimulationPathways({ selectedFilters });

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

  const openCreatePopup = () => {
    setIsCreatePopupOpen(true);
  };

  const handleNewPathway = () => {
    handleNewPathwayFromHook();
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedFilters([]);
  };

  const createOptions = [
    {
      id: en.simulation.newSimulation,
      label: en.simulation.newSimulation,
      icon: <SimulationIcon className="w-5 h-5" />,
      onClick: handleNewSimulation,
    },
    {
      id: en.simulation.newPathway,
      label: en.simulation.newPathway,
      icon: <Pathway className="w-5 h-5" />,
      onClick: handleNewPathway,
    },
  ];

  const renderSimulationEmptyState = () => {
    const isPathwaysTab = activeTab === "pathways";
    return (
      <div className="flex font-primary items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-typography-900 mb-4">
            {en.simulation.createYourFirst}{" "}
            <span className="italic">
              {isPathwaysTab ? en.simulation.pathway : en.simulation.simulation}
            </span>
          </h2>
          <p className="text-typography-600 text-base mb-8 leading-relaxed font-primary">
            {isPathwaysTab
              ? en.simulation.newPathwayDescription
              : en.simulation.newSimulationDescription}
          </p>
          <button
            onClick={isPathwaysTab ? handleNewPathway : handleCreateSimulation}
            className="bg-primary-500 hover:bg-primary-600 text-base text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-primary transition-colors"
          >
            <Add />
            {isPathwaysTab ? en.simulation.createPathway : en.simulation.createSimulation}
          </button>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    const isPathwaysTab = activeTab === "pathways";
    const hasMoreItems = isPathwaysTab ? hasMorePathways : hasMore;
    const isFetching = isPathwaysTab ? isPathwaysFetching : isSimulationsFetching;
    const loadMore = isPathwaysTab ? loadPathways : loadSimulations;

    if (!hasMoreItems) return null;
    return (
      <div className="flex justify-start mt-2 px-4">
        <button
          onClick={() => loadMore(true)}
          disabled={isFetching}
          className="inline-flex font-tertiary items-center disabled:opacity-50 text-sm text-typography-600 font-medium py-1 px-1 hover:text-typography-900"
        >
          + {isFetching ? en.common.loading : en.common.loadMore}
        </button>
      </div>
    );
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center">
        <h1 className="text-2xl text-typography-900 font-primary">
          {en.simulation.simulationstudio}
        </h1>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={openCreatePopup}
          ref={createButtonRef}
          className="transition-colors h-[40px] pr-[20px]"
        >
          <Add />
          {en.common.create}
        </Button>
      </div>
    );
  };

  const renderFilterSection = () => {
    return (
      <div className="flex flex-row items-center border-b border-border-light pb-2 pl-5 relative">
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
                <span className="text-xs text-typography-800">{filter.label}</span>

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
    );
  };

  const renderContent = () => {
    if (activeTab === "pathways") {
      // Pathways tab content
      if (isPathwaysLoading && pathways.length === 0) {
        return <SimulationListSkeleton />;
      }

      if (pathways.length > 0) {
        // TODO: Create a PathwayList component similar to SimulationList
        // For now, we'll use SimulationList as a placeholder
        return (
          <SimulationList
            simulations={pathways as any}
            onEdit={onEditPathway as any}
            onDelete={handleDeletePathway as any}
            onPreview={onPreviewPathway as any}
            onArchive={() => {}}
            onUnpublish={() => {}}
            onUnarchive={() => {}}
            footer={renderFooter()}
          />
        );
      }

      if (selectedFilters.length > 0) {
        return (
          <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
        );
      }

      return renderSimulationEmptyState();
    }

    // Simulations tab content
    if (
      isSimulationsLoading ||
      (simulationsOffset === 0 &&
        simulations.length === 0 &&
        simulationsResponse &&
        isNonEmptyArray(simulationsResponse.data))
    ) {
      return <SimulationListSkeleton />;
    }

    if (simulations.length > 0) {
      return (
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
      );
    }

    if (selectedFilters.length > 0) {
      return (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      );
    }

    return renderSimulationEmptyState();
  };

  return (
    <div className="min-h-full font-secondary">
      {renderHeader()}
      <Tabs
        items={TABS}
        className="mb-2 mt-6 border-b border-border-light font-primary"
        activeId={activeTab}
        onChange={handleTabChange}
      />
      {renderFilterSection()}
      {renderContent()}
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
      <OptionsPopup
        isOpen={isCreatePopupOpen}
        onClose={() => setIsCreatePopupOpen(false)}
        options={createOptions}
        anchorElement={createButtonRef.current}
        className="min-w-[220px]"
      />
    </div>
  );
};
