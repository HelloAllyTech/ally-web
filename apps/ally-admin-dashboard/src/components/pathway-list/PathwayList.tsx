import React from "react";

import { Edit, Archive, Delete, Unarchive, Unpublish, Copy } from "@assets";
import { DataList, ActionButton, ColumnConfig } from "@components";
import { SimulationStatus, en } from "@constants";
import { ScenarioPath } from "@types";
import { formatCapitalizedEnum, formatDate } from "@utils";

export interface PathwayListProps {
  pathways: ScenarioPath[];
  footer?: React.ReactNode;
  onEdit?: (pathway: ScenarioPath) => void;
  onDelete?: (pathway: ScenarioPath) => void;
  onDuplicate?: (pathway: ScenarioPath) => void;
  onArchive?: (pathway: ScenarioPath) => void;
  onUnarchive?: (pathway: ScenarioPath) => void;
  onUnpublishPathway?: (pathway: ScenarioPath) => void;
}

export const PathwayList: React.FC<PathwayListProps> = ({
  pathways,
  footer,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onUnarchive,
  onUnpublishPathway,
}) => {
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
      label: `${en.simulation.pathway}s`,
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
      key: "orgVisibility",
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

  const thumbnailConfig = {
    width: "w-[100px]",
    height: "h-[50px]",
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
