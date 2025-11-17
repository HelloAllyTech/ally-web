import React from "react";

import { Add, Edit, Archive, Delete, Unarchive, Unpublish, Copy, BookWhite } from "@assets";
import {
  DataList,
  ActionButton,
  ColumnConfig,
  SimulationListSkeleton,
  EmptyState,
} from "@components";
import { SimulationStatus, en } from "@constants";
import { ScenarioPath } from "@types";
import { formatCapitalizedEnum, formatDate } from "@utils";

export interface PathwayListProps {
  pathways: ScenarioPath[];
  footer?: React.ReactNode;
  isLoading?: boolean;
  hasFilters?: boolean;
  onEdit?: (pathway: ScenarioPath) => void;
  onDelete?: (pathway: ScenarioPath) => void;
  onDuplicate?: (pathway: ScenarioPath) => void;
  onArchive?: (pathway: ScenarioPath) => void;
  onUnarchive?: (pathway: ScenarioPath) => void;
  onUnpublishPathway?: (pathway: ScenarioPath) => void;
  onCreatePathway?: () => void;
}

export const PathwayList: React.FC<PathwayListProps> = ({
  pathways,
  footer,
  isLoading = false,
  hasFilters = false,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onUnarchive,
  onUnpublishPathway,
  onCreatePathway,
}) => {
  // Handle loading state
  if (isLoading && pathways.length === 0) {
    return <SimulationListSkeleton />;
  }

  // Handle empty state with filters
  if (pathways.length === 0 && hasFilters) {
    return <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />;
  }

  // Handle empty state without data
  if (pathways.length === 0) {
    return (
      <div className="flex font-primary items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-typography-900 mb-4">
            {en.simulation.createYourFirst} <span className="italic">{en.simulation.pathway}</span>
          </h2>
          <p className="text-typography-600 text-base mb-8 leading-relaxed font-primary">
            {en.simulation.newPathwayDescription}
          </p>
          <button
            onClick={onCreatePathway}
            className="bg-primary-500 hover:bg-primary-600 text-base text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-primary transition-colors"
          >
            <Add />
            {en.simulation.createPathway}
          </button>
        </div>
      </div>
    );
  }

  const handleArchive = (pathway: ScenarioPath) =>
    pathway.status === SimulationStatus.DRAFT ? onArchive?.(pathway) : onUnarchive?.(pathway);

  const getStatusColor = (status: string) => {
    switch (status) {
      case SimulationStatus.PUBLISHED:
        return "bg-success-100 text-success-700";
      case SimulationStatus.ARCHIVED:
        return "bg-warning-100 text-warning-700";
      case SimulationStatus.DRAFT:
        return "bg-neutral-200 text-typography-800";
      default:
        return "bg-neutral-200 text-typography-800";
    }
  };

  // Define columns configuration
  const columns: ColumnConfig<ScenarioPath>[] = [
    {
      key: "pathways",
      label: en.simulation.paths,
      width: "w-[38%]",
      render: () => null,
    },
    {
      key: "actions",
      label: "",
      width: "w-[8%]",
      render: () => null,
    },
    {
      key: "isGlobal",
      label: "Org visibility",
      width: "w-[15%]",
      render: pathway => <span>{pathway.isGlobal ? "Enabled" : "Disabled"}</span>,
    },
    {
      key: "lastModified",
      label: en.simulation.lastModified,
      width: "w-[15%]",
      render: pathway => <span>{formatDate(pathway.updatedAt)}</span>,
    },
    {
      key: "status",
      label: en.simulation.status,
      width: "w-[12%]",
      render: pathway => (
        <div
          className={`w-fit py-1 px-2 rounded text-xs font-medium ${getStatusColor(pathway.status)}`}
        >
          {pathway.status === SimulationStatus.ACTIVE
            ? formatCapitalizedEnum(SimulationStatus.PUBLISHED)
            : formatCapitalizedEnum(pathway.status) || "--"}
        </div>
      ),
    },
    {
      key: "simulationCount",
      label: "Simulation count",
      width: "w-[12%]",
      render: pathway => <span>{pathway.totalScenarios}</span>,
    },
  ];

  // Define actions configuration
  const actions: ActionButton<ScenarioPath>[] = [
    {
      icon: <Edit />,
      tooltip: en.simulation.edit,
      onClick: pathway => onEdit?.(pathway),
    },
    {
      icon: <Unpublish />,
      tooltip: en.simulation.unpublish,
      onClick: pathway => onUnpublishPathway?.(pathway),
    },
    {
      icon: <Copy />,
      tooltip: en.simulation.duplicate,
      onClick: pathway => onDuplicate?.(pathway),
    },
    {
      icon: <Archive />,
      tooltip: en.simulation.archive,
      onClick: pathway => handleArchive(pathway),
      show: pathway =>
        pathway.status !== SimulationStatus.DRAFT && pathway.status !== SimulationStatus.ARCHIVED,
    },
    {
      icon: <Unarchive />,
      tooltip: en.simulation.unarchive,
      onClick: pathway => handleArchive(pathway),
      show: pathway => pathway.status === SimulationStatus.ARCHIVED,
    },
    {
      icon: <Delete />,
      tooltip: en.common.delete,
      onClick: pathway => onDelete?.(pathway),
    },
  ];
  const renderThumbnailOverlay = (pathway: ScenarioPath) => (
    <div className="absolute top-0 right-0 bottom-0 w-[40%] z-10 bg-[rgba(0,0,0,0.5)] text-xs gap-1 text-white text-center flex items-center flex-col justify-center">
      {pathway.totalScenarios}
      <BookWhite width={14} height={14} />
    </div>
  );

  const thumbnailConfig = {
    width: "w-[100px]",
    height: "h-[50px]",
    renderExtraContent: renderThumbnailOverlay,
  };

  return (
    <DataList
      items={pathways}
      columns={columns}
      actions={actions}
      footer={footer}
      thumbnailConfig={thumbnailConfig}
    />
  );
};
