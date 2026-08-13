import React from "react";

import { Add, Edit, Delete, Unpublish, Copy, BookWhite } from "@assets";
import {
  DataList,
  ActionButton,
  ColumnConfig,
  SimulationListSkeleton,
  EmptyState,
} from "@components";
import { SimulationStatus, en } from "@constants";
import { ScenarioPath } from "@types";
import { formatCapitalizedEnum, formatDate, getStatusColor, isNonEmptyArray } from "@utils";

export interface PathwayListProps {
  pathways: ScenarioPath[];
  isCases?: boolean;
  footer?: React.ReactNode;
  isLoading?: boolean;
  hasFilters?: boolean;
  onEdit?: (pathway: ScenarioPath) => void;
  onDelete?: (pathway: ScenarioPath) => void;
  onDuplicate?: (pathway: ScenarioPath) => void;
  onUnpublishPathway?: (pathway: ScenarioPath) => void;
  onCreatePathway?: () => void;
}

export const PathwayList: React.FC<PathwayListProps> = ({
  pathways,
  isCases = false,
  footer,
  isLoading = false,
  hasFilters = false,
  onEdit,
  onDelete,
  onDuplicate,
  onUnpublishPathway,
  onCreatePathway,
}) => {
  // Handle loading state
  if (isLoading && !isNonEmptyArray(pathways)) {
    return <SimulationListSkeleton />;
  }

  // Handle empty state with filters
  if (!isNonEmptyArray(pathways) && hasFilters) {
    return <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />;
  }

  // Handle empty state without data
  if (!isNonEmptyArray(pathways)) {
    return (
      <div className="flex font-primary items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-typography-900 mb-4">
            {en.simulation.createYourFirst} <span className="italic">{en.simulation.pathway}</span>
          </h2>
          <p className="text-typography-600 text-base mb-8 leading-relaxed font-primary">
            {en.simulation.newPathwayDescription}
          </p>
          {onCreatePathway && (
            <button
              onClick={onCreatePathway}
              className="bg-primary-500 hover:bg-primary-600 text-base text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-primary transition-colors"
            >
              <Add />
              {en.simulation.createPathway}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Define columns configuration
  const columns: ColumnConfig<ScenarioPath>[] = [
    {
      key: "pathways",
      label: isCases ? en.simulation.cases : en.simulation.paths,
      width: "w-[37%]",
      render: () => null,
    },
    {
      key: "actions",
      label: "",
      width: "w-[9%] min-w-[160px]",
      render: () => null,
    },
    {
      key: "isGlobal",
      label: "Org visibility",
      width: "w-[15%]",
      hidden: true,
      render: pathway => <span>{pathway.isGlobal ? "Enabled" : "Disabled"}</span>,
    },
    {
      key: "lastModified",
      label: en.simulation.lastModified,
      width: "w-[15%]",
      hidden: true,
      render: pathway => <span>{formatDate(pathway.updatedAt)}</span>,
    },
    {
      key: "status",
      label: en.simulation.status,
      width: "w-[12%]",
      render: pathway => (
        <div className={`w-fit py-1 px-2 rounded ${getStatusColor(pathway.status)}`}>
          {pathway.status === SimulationStatus.ACTIVE
            ? formatCapitalizedEnum(SimulationStatus.PUBLISHED)
            : formatCapitalizedEnum(pathway.status) || "--"}
        </div>
      ),
    },
    {
      key: "simulationCount",
      label: "Simulation count",
      width: "w-[13%]",
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
      show: simulation =>
        simulation.status !== SimulationStatus.DRAFT &&
        simulation.status !== SimulationStatus.ARCHIVED,
    },
    {
      icon: <Copy />,
      tooltip: en.simulation.duplicate,
      onClick: pathway => onDuplicate?.(pathway),
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
