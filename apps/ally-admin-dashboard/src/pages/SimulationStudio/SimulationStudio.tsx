import React, { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { Add, Close, Filter, Search, Simulation as SimulationIcon, Pathway, Case } from "@assets";
import {
  ActionConfirmationPopup,
  DeletePopup,
  SimulationList,
  PathwayList,
  SimulationPreview,
  FilterList,
  Button,
  OptionsPopup,
} from "@components";
import { ButtonVariant } from "@components/types";
import {
  DEFAULT_SIMULATION_STATUS_OPTIONS,
  en,
  PATH_STATUS_OPTIONS,
  SIMULATION_CATEGORY_FILTER_OPTIONS,
  SimulationStatus,
  isSuperAdminRole,
  isSuperDuperAdminRole,
} from "@constants";
import {
  useSimulations,
  useSimulationPathways,
  useSimulationCases,
  useTracks,
  useUser,
} from "@hooks";

const TAB_KEYS = {
  SIMULATIONS: "simulations",
  TRACKS: "tracks",
  CASES: "cases",
  COURSES: "courses",
};

const TABS_CONFIG = [
  { id: TAB_KEYS.SIMULATIONS, label: "Simulations" },
  { id: TAB_KEYS.TRACKS, label: "Tracks" },
  { id: TAB_KEYS.CASES, label: "Cases" },
  { id: TAB_KEYS.COURSES, label: "Courses" },
];

const SUPER_ADMIN_TAB_KEYS = [TAB_KEYS.TRACKS, TAB_KEYS.CASES, TAB_KEYS.COURSES];

export const SimulationStudio: React.FC = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Array<{ id: string; label: string }>>([]);
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isSuperDuperAdmin = isSuperDuperAdminRole(user?.role);

  // Get active tab from URL params, default to SIMULATIONS
  const activeTab = searchParams.get("tab") || TAB_KEYS.SIMULATIONS;

  // The legacy "Tracks" (old tracks) screen is being wound down: creating new
  // old tracks is reserved for super-duper-admins. Hide the Create button on
  // that tab for everyone else (a plain super-admin included).
  const hideCreateButton = activeTab === TAB_KEYS.TRACKS && !isSuperDuperAdmin;

  // Effect to redirect unauthorized users from restricted tabs
  React.useEffect(() => {
    if (!isSuperAdmin && SUPER_ADMIN_TAB_KEYS.includes(activeTab)) {
      setSearchParams({ tab: TAB_KEYS.SIMULATIONS });
    }
  }, [isSuperAdmin, activeTab, setSearchParams]);

  const filteredTabs = TABS_CONFIG.filter(tab => {
    if (SUPER_ADMIN_TAB_KEYS.includes(tab.id)) {
      return isSuperAdmin;
    }
    return true;
  });

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
  } = useSimulations({ selectedFilters, search: debouncedSearch });

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
  } = useSimulationPathways({ selectedFilters, enabled: isSuperAdmin });

  // Use the custom hook for Track 2.0 ("Courses")
  const {
    tracks,
    hasMore: hasMoreTracks,
    isTracksLoading,
    isTracksFetching,
    currentTrack,
    isDuplicateTrackPopupOpen,
    isUnpublishTrackPopupOpen,
    isDeleteTrackPopupOpen,
    isTrackEditPopupOpen,
    setIsDuplicateTrackPopupOpen,
    setIsUnpublishTrackPopupOpen,
    setIsDeleteTrackPopupOpen,
    setIsTrackEditPopupOpen,
    loadTracks,
    handleNewTrack,
    onEditTrack,
    handleEditTrack,
    handleDeleteTrack,
    onDeleteTrack,
    handleUnpublishTrack,
    handleChangeTrackStatus,
    handleDuplicateTrack,
    onDuplicateTrack,
  } = useTracks({ selectedFilters, enabled: isSuperAdmin });

  // Use the custom hook for cases
  const {
    cases,
    hasMore: hasMoreCases,
    isCasesLoading,
    isCasesFetching,
    currentCase,
    isDuplicateCasePopupOpen,
    isUnpublishCasePopupOpen,
    isDeleteCasePopupOpen,
    setIsDuplicateCasePopupOpen,
    setIsUnpublishCasePopupOpen,
    setIsDeleteCasePopupOpen,
    loadCases,
    handleNewCase,
    onEditCase,
    handleDeleteCase,
    onDeleteCase,
    handleUnpublishCase,
    handleChangeCaseStatus,
    handleDuplicateCase,
    onDuplicateCase,
    isCaseEditPopupOpen,
    setIsCaseEditPopupOpen,
    handleEditCase,
  } = useSimulationCases({ selectedFilters, enabled: isSuperAdmin });

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
    setSearchValue("");
  };

  const createOptions = React.useMemo(
    () => [
      {
        id: en.simulation.newSimulation,
        label: en.simulation.newSimulation,
        icon: <SimulationIcon className="w-5 h-5" />,
        onClick: handleNewSimulation,
      },
      {
        id: en.simulation.newTrack,
        label: en.simulation.newTrack,
        icon: <Pathway className="w-5 h-5" />,
        onClick: handleNewPathway,
      },

      {
        id: "New Case",
        label: "New Case",
        icon: <Case className="w-5 h-5" />,
        onClick: handleNewCase,
      },

      {
        id: "New Course",
        label: "New Course",
        icon: <Pathway className="w-5 h-5" />,
        onClick: handleNewTrack,
      },
    ],
    [handleNewSimulation, handleNewPathway, handleNewCase, handleNewTrack],
  );

  const filteredCreateOptions = React.useMemo(() => {
    return createOptions.filter(option => {
      // Track 2.0 ("Courses") replaces the legacy Tracks screen for new
      // creation; hide "New track" unconditionally rather than by role.
      if (option.id === en.simulation.newTrack) {
        return false;
      }
      if (option.id === "New Case" || option.id === "New Course") {
        return isSuperAdmin;
      }
      return true;
    });
  }, [createOptions, isSuperAdmin]);

  const renderFooter = () => {
    const isCasesTab = activeTab === TAB_KEYS.CASES;
    const isPathwaysTab = activeTab === TAB_KEYS.TRACKS;
    const isCoursesTab = activeTab === TAB_KEYS.COURSES;

    let hasMoreItems = hasMore;
    let isFetching = isSimulationsFetching;
    let loadMore = loadSimulations;

    if (isCasesTab) {
      hasMoreItems = hasMoreCases;
      isFetching = isCasesFetching;
      loadMore = loadCases;
    } else if (isPathwaysTab) {
      hasMoreItems = hasMorePathways;
      isFetching = isPathwaysFetching;
      loadMore = loadPathways;
    } else if (isCoursesTab) {
      hasMoreItems = hasMoreTracks;
      isFetching = isTracksFetching;
      loadMore = loadTracks;
    }

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
        <h1 className="text-2xl text-typography-900 font-secondary">{en.simulation.rolePlays}</h1>
        {!hideCreateButton && (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={openCreatePopup}
            ref={createButtonRef}
            className="transition-colors h-[40px] pr-[20px]"
          >
            <Add />
            {en.common.create}
          </Button>
        )}
      </div>
    );
  };

  const renderFilterSection = () => {
    return (
      <div className="flex flex-row items-center justify-between border-b border-border-light pt-[2px] pb-[10px] pl-5 relative">
        <div className="flex flex-row items-center">
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
        </div>
        {activeTab === TAB_KEYS.SIMULATIONS && (
          <div className="flex relative items-center w-full max-w-xs ml-4">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-typography-600">
              <Search />
            </span>
            <input
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder={en.common.search}
              className="block w-full rounded-md border border-border bg-transparent pl-10 pr-8 py-2 placeholder-text-tertiary outline-none font-primary text-sm"
            />
            {searchValue.length > 0 && (
              <button className="absolute right-2" onClick={() => setSearchValue("")}>
                <Close />
              </button>
            )}
          </div>
        )}
        <FilterList
          isOpen={isFilterOpen}
          onClose={handleFilterClose}
          selectedFilters={selectedFilters}
          onApply={handleApplyFilters}
          options={
            activeTab === TAB_KEYS.TRACKS ? PATH_STATUS_OPTIONS : DEFAULT_SIMULATION_STATUS_OPTIONS
          }
          // Simulations filter by Category as well as Status; useSimulations
          // splits the mixed selection back into the two query params.
          sections={
            activeTab === TAB_KEYS.SIMULATIONS
              ? [
                  { title: en.simulation.status, options: DEFAULT_SIMULATION_STATUS_OPTIONS },
                  { title: en.simulation.category, options: SIMULATION_CATEGORY_FILTER_OPTIONS },
                ]
              : undefined
          }
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case TAB_KEYS.CASES:
        return (
          <PathwayList
            pathways={cases}
            isLoading={isCasesLoading}
            hasFilters={selectedFilters.length > 0}
            onEdit={onEditCase}
            onDelete={handleDeleteCase}
            onDuplicate={handleDuplicateCase}
            onUnpublishPathway={handleUnpublishCase}
            onCreatePathway={handleNewCase}
            footer={renderFooter()}
            isCases
          />
        );
      case TAB_KEYS.TRACKS:
        return (
          <PathwayList
            pathways={pathways}
            isLoading={isPathwaysLoading}
            hasFilters={selectedFilters.length > 0}
            onEdit={onEditPathway}
            onDelete={handleDeletePathway}
            onDuplicate={handleDuplicatePathway}
            onUnpublishPathway={handleUnpublishPathway}
            footer={renderFooter()}
          />
        );
      case TAB_KEYS.COURSES:
        return (
          <PathwayList
            pathways={tracks}
            isLoading={isTracksLoading}
            hasFilters={selectedFilters.length > 0}
            onEdit={onEditTrack}
            onDelete={handleDeleteTrack}
            onDuplicate={handleDuplicateTrack}
            onUnpublishPathway={handleUnpublishTrack}
            onCreatePathway={handleNewTrack}
            footer={renderFooter()}
          />
        );
      case TAB_KEYS.SIMULATIONS:
        return (
          <SimulationList
            simulations={simulations}
            isLoading={isSimulationsLoading}
            hasFilters={selectedFilters.length > 0 || debouncedSearch.length > 0}
            onEdit={onEditIconClick}
            onView={handleViewSimulation}
            onDelete={handleDeleteSimulation}
            onPreview={onPreviewSimulation}
            onArchive={onArchiveSimulation}
            onUnpublish={onUnpublishSimulation}
            onUnarchive={onUnarchiveSimulation}
            onCreateSimulation={handleCreateSimulation}
            onDuplicate={onDuplicateSimulation}
            footer={renderFooter()}
            currentUser={user}
            isSuperAdmin={isSuperAdmin}
          />
        );
      default:
        return null;
    }
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
        items={filteredTabs}
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
        options={filteredCreateOptions}
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

      {/* Cases Popups */}
      <ActionConfirmationPopup
        isOpen={isUnpublishCasePopupOpen}
        onClose={() => setIsUnpublishCasePopupOpen(false)}
        title={en.simulation.unpublish}
        titleItalic="Case?"
        description={en.simulation.unpublishDescription}
        primaryButton={{
          label: en.simulation.unpublish,
          onClick: () => handleChangeCaseStatus(SimulationStatus.DRAFT),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsUnpublishCasePopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      <DeletePopup
        isOpen={isDeleteCasePopupOpen}
        onClose={() => setIsDeleteCasePopupOpen(false)}
        cardData={currentCase}
        onConfirmDelete={onDeleteCase}
        title={
          <h2 className="text-2xl font-medium font-primary">
            {en.simulation.deleteDescription}
            <span className="italic font-semibold ml-1">Case?</span>
          </h2>
        }
        description={en.simulation.deletePathwayDescription}
      />

      <ActionConfirmationPopup
        isOpen={isDuplicateCasePopupOpen}
        onClose={() => setIsDuplicateCasePopupOpen(false)}
        title={en.simulation.duplicate}
        titleItalic="Case"
        description={en.simulation.duplicatePathwayDescription}
        primaryButton={{
          label: en.simulation.duplicate,
          onClick: () => onDuplicateCase(currentCase),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsDuplicateCasePopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      {currentCase && (
        <ActionConfirmationPopup
          isOpen={isCaseEditPopupOpen}
          onClose={() => setIsCaseEditPopupOpen(false)}
          title={en.simulation.edit}
          titleItalic="Case"
          description={en.simulation.editPathwayDescription}
          primaryButton={{
            label: en.simulation.edit,
            onClick: () => handleEditCase(currentCase),
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.simulation.cancel,
            onClick: () => setIsCaseEditPopupOpen(false),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}

      {/* Course (Track 2.0) Popups */}
      <ActionConfirmationPopup
        isOpen={isUnpublishTrackPopupOpen}
        onClose={() => setIsUnpublishTrackPopupOpen(false)}
        title={en.simulation.unpublish}
        titleItalic="Course?"
        description={en.simulation.unpublishDescription}
        primaryButton={{
          label: en.simulation.unpublish,
          onClick: () => handleChangeTrackStatus(SimulationStatus.DRAFT),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsUnpublishTrackPopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      <DeletePopup
        isOpen={isDeleteTrackPopupOpen}
        onClose={() => setIsDeleteTrackPopupOpen(false)}
        cardData={currentTrack}
        onConfirmDelete={onDeleteTrack}
        title={
          <h2 className="text-2xl font-medium font-primary">
            {en.simulation.deleteDescription}
            <span className="italic font-semibold ml-1">Course?</span>
          </h2>
        }
        description={en.simulation.deletePathwayDescription}
      />

      <ActionConfirmationPopup
        isOpen={isDuplicateTrackPopupOpen}
        onClose={() => setIsDuplicateTrackPopupOpen(false)}
        title={en.simulation.duplicate}
        titleItalic="Course"
        description={en.simulation.duplicatePathwayDescription}
        primaryButton={{
          label: en.simulation.duplicate,
          onClick: () => onDuplicateTrack(currentTrack),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: en.simulation.cancel,
          onClick: () => setIsDuplicateTrackPopupOpen(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      {currentTrack && (
        <ActionConfirmationPopup
          isOpen={isTrackEditPopupOpen}
          onClose={() => setIsTrackEditPopupOpen(false)}
          title={en.simulation.edit}
          titleItalic="Course"
          description={en.simulation.editPathwayDescription}
          primaryButton={{
            label: en.simulation.edit,
            onClick: () => handleEditTrack(currentTrack),
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.simulation.cancel,
            onClick: () => setIsTrackEditPopupOpen(false),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      )}
    </div>
  );
};
