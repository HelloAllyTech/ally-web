import React, { useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Add, Close, Filter, Simulation as SimulationIcon, Pathway } from "@assets";
import {
  ActionConfirmationPopup,
  DeletePopup,
  SimulationList,
  PathwayList,
  SimulationPreview,
  FilterList,
  Button,
  Tabs,
  OptionsPopup,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
  DEFAULT_SIMULATION_STATUS_OPTIONS,
  en,
  PATH_STATUS_OPTIONS,
  SimulationStatus,
} from "@constants";
import { useSimulations, useSimulationPathways } from "@hooks";

const TAB_KEYS = {
  SIMULATIONS: "simulations",
  TRACKWAYS: "trackways",
};

const TABS = [
  { id: "simulations", label: "Simulations" },
  { id: "trackways", label: "Track ways" },
];

export const SimulationStudio: React.FC = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Array<{ id: string; label: string }>>([]);
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);

  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params, default to SIMULATIONS
  const activeTab = searchParams.get("tab") || TAB_KEYS.SIMULATIONS;

  // Use the custom hook for simulations
  const {
    simulations,
    currentSimulation,
    hasMore,
    isSimulationsLoading,
    isSimulationsFetching,
    isPreviewOpen,
    isUnpublishPopupOpen,
    isArchivePopupOpen,
    isDeletePopupOpen,
    isUnarchivePopupOpen,
    isEditPopupOpen,
    IsDuplicateSimulationPopupOpen,
    setIsPreviewOpen,
    setIsUnpublishPopupOpen,
    setIsArchivePopupOpen,
    setIsDeletePopupOpen,
    setIsUnarchivePopupOpen,
    setIsEditPopupOpen,
    setIsDuplicateSimulationPopupOpen,
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
    onDuplicateSimulation,
    handleDuplicateSimulation,
  } = useSimulations({ selectedFilters });

  // Use the custom hook for pathways
  const {
    pathways,
    hasMore: hasMorePathways,
    isPathwaysLoading,
    isPathwaysFetching,
    currentPathway,
    isDuplicatePathwayPopupOpen,
    isUnpublishPathwayPopupOpen,
    isDeletePathwayPopupOpen,
    setIsDuplicatePathwayPopupOpen,
    setIsUnpublishPathwayPopupOpen,
    setIsDeletePathwayPopupOpen,
    loadPathways,
    handleNewPathway,
    onEditPathway,
    handleDeletePathway,
    onDeletePathway,
    handleUnpublishPathway,
    handleChangePathwayStatus,
    handleDuplicatePathway,
    onDuplicatePathway,
    isPathEditPopupOpen,
    setIsPathEditPopupOpen,
    handleEditPathway,
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

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
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
      id: en.simulation.newTrackway,
      label: en.simulation.newTrackway,
      icon: <Pathway className="w-5 h-5" />,
      onClick: handleNewPathway,
    },
  ];

  const renderFooter = () => {
    const isPathwaysTab = activeTab === TAB_KEYS.TRACKWAYS;
    const hasMoreItems = isPathwaysTab ? hasMorePathways : hasMore;
    const isFetching = isPathwaysTab ? isPathwaysFetching : isSimulationsFetching;
    const loadMore = isPathwaysTab ? loadPathways : loadSimulations;

    if (!hasMoreItems) return null;
    return (
      <div className="flex justify-start mt-2">
        <button
          onClick={() => loadMore(true)}
          disabled={isFetching}
          className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 hover:text-typography-900"
        >
          + {isFetching ? en.common.loading : en.common.loadMore}
        </button>
      </div>
    );
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center">
        <h1 className="text-2xl text-typography-900 font-secondary">
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
      <div className="flex flex-row items-center border-b border-border-light pt-[2px] pb-[10px] pl-5 relative">
        <button onClick={handleFilterClick}>
          <Filter />
        </button>
        <div className="flex flex-row items-center gap-2 ml-3 h-[18px]">
          {selectedFilters?.map(filter => (
            <div
              key={filter.id}
              className="flex flex-row items-center gap-1 border border-border-light rounded-full px-2 py-1"
            >
              <span className="text-xs text-typography-800 font-regular">{filter.label}</span>

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
          options={
            activeTab === TAB_KEYS.TRACKWAYS
              ? PATH_STATUS_OPTIONS
              : DEFAULT_SIMULATION_STATUS_OPTIONS
          }
        />
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === TAB_KEYS.TRACKWAYS) {
      // Pathways tab content
      return (
        <PathwayList
          pathways={pathways}
          isLoading={isPathwaysLoading}
          hasFilters={selectedFilters.length > 0}
          onEdit={onEditPathway}
          onDelete={handleDeletePathway}
          onDuplicate={handleDuplicatePathway}
          onUnpublishPathway={handleUnpublishPathway}
          onCreatePathway={handleNewPathway}
          footer={renderFooter()}
        />
      );
    }

    // Simulations tab content
    return (
      <SimulationList
        simulations={simulations}
        isLoading={isSimulationsLoading}
        hasFilters={selectedFilters.length > 0}
        onEdit={onEditIconClick}
        onDelete={handleDeleteSimulation}
        onPreview={onPreviewSimulation}
        onArchive={onArchiveSimulation}
        onUnpublish={onUnpublishSimulation}
        onUnarchive={onUnarchiveSimulation}
        onCreateSimulation={handleCreateSimulation}
        onDuplicate={onDuplicateSimulation}
        footer={renderFooter()}
      />
    );
  };

  const renderDeletePathwayTitle = () => {
    return (
      <h2 className="text-2xl font-medium font-primary">
        {en.simulation.deleteDescription}
        <span className="italic font-semibold ml-1">{en.simulation.pathway}?</span>
      </h2>
    );
  };

  return (
    <div className="min-h-full font-secondary">
      {renderHeader()}
      <Tabs
        items={TABS}
        className="mb-2 mt-6 border-b border-border-light font-primary"
        activeId={activeTab}
        showCount={false}
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
        isOpen={isUnpublishPathwayPopupOpen}
        onClose={() => setIsUnpublishPathwayPopupOpen(false)}
        title={en.simulation.unpublish}
        titleItalic={`${en.simulation.pathway}?`}
        description={en.simulation.unpublishDescription}
        primaryButton={{
          label: en.simulation.unpublish,
          onClick: () => handleChangePathwayStatus(SimulationStatus.DRAFT),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsUnpublishPathwayPopupOpen(false),
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
      <DeletePopup
        isOpen={isDeletePopupOpen}
        onClose={() => setIsDeletePopupOpen(false)}
        cardData={currentSimulation}
        onConfirmDelete={onDeleteSimulation}
      />
      <DeletePopup
        isOpen={isDeletePathwayPopupOpen}
        onClose={() => setIsDeletePathwayPopupOpen(false)}
        cardData={currentPathway}
        onConfirmDelete={onDeletePathway}
        title={renderDeletePathwayTitle()}
        description={en.simulation.deletePathwayDescription}
      />
      <ActionConfirmationPopup
        isOpen={isDuplicatePathwayPopupOpen}
        onClose={() => setIsDuplicatePathwayPopupOpen(false)}
        title={en.simulation.duplicate}
        titleItalic={en.simulation.pathway}
        description={en.simulation.duplicatePathwayDescription}
        primaryButton={{
          label: en.simulation.duplicate,
          onClick: () => onDuplicatePathway(currentPathway),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsDuplicatePathwayPopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
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

      {currentPathway && (
        <ActionConfirmationPopup
          isOpen={isPathEditPopupOpen}
          onClose={() => setIsPathEditPopupOpen(false)}
          title={en.simulation.edit}
          titleItalic={en.simulation.pathway}
          description={en.simulation.editPathwayDescription}
          primaryButton={{
            label: en.simulation.edit,
            onClick: () => handleEditPathway(currentPathway),
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.simulation.cancel,
            onClick: () => setIsPathEditPopupOpen(false),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}
      <ActionConfirmationPopup
        isOpen={IsDuplicateSimulationPopupOpen}
        onClose={() => setIsDuplicateSimulationPopupOpen(false)}
        title={en.simulation.duplicate}
        titleItalic={en.simulation.simulation}
        description={en.simulation.duplicateSimulationDescription}
        primaryButton={{
          label: en.simulation.duplicate,
          onClick: () => handleDuplicateSimulation(currentSimulation),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsDuplicateSimulationPopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
