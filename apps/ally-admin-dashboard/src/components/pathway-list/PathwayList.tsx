import React from "react";

import { Edit, Archive, Delete, Unarchive, Unpublish, Copy } from "@assets";
import { DataList, ActionButton, ColumnConfig } from "@components/data-list";
import { en } from "@constants";
import { ScenarioPath } from "@types";
import { formatDate } from "@utils";

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
    pathway.status !== "archived" ? onArchive?.(pathway) : onUnarchive?.(pathway);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-success-100 text-success-700";
      case "archived":
        return "bg-warning-100 text-warning-700";
      case "draft":
        return "bg-neutral-200 text-typography-800";
      default:
        return "bg-neutral-200 text-typography-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Define columns configuration
  const columns: ColumnConfig<ScenarioPath>[] = [
    {
      key: "pathways",
      label: `${en.simulation.pathway}s`,
      width: "w-[40%]",
      render: () => null, // Handled by thumbnail and title config
    },
    {
      key: "actions",
      label: "",
      width: "w-[8%]",
      render: () => null, // Handled by actions prop
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
          {formatStatus(pathway.status)}
        </div>
      ),
    },
    {
      key: "simulationCount",
      label: "Simulation count",
      width: "w-[10%]",
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
      tooltip: pathway => (pathway.isGlobal ? "Disable" : "Enable"),
      onClick: pathway => onUnpublishPathway?.(pathway),
    },
    {
      icon: <Copy />,
      tooltip: "Duplicate",
      onClick: pathway => onDuplicate?.(pathway),
    },
    {
      icon: <Archive />,
      tooltip: en.simulation.archive,
      onClick: pathway => handleArchive(pathway),
      show: pathway => pathway.status !== "draft" && pathway.status !== "archived",
    },
    {
      icon: <Unarchive />,
      tooltip: en.simulation.unarchive,
      onClick: pathway => handleArchive(pathway),
      show: pathway => pathway.status === "archived",
    },
    {
      icon: <Delete />,
      tooltip: en.common.delete,
      onClick: pathway => onDelete?.(pathway),
    },
  ];

  return (
    <DataList
      items={pathways}
      columns={columns}
      actions={actions}
      footer={footer}
      thumbnailConfig={{
        width: "w-[64px]",
        height: "h-[64px]",
      }}
      titleConfig={{
        width: "flex-1",
      }}
    />
  );
};
