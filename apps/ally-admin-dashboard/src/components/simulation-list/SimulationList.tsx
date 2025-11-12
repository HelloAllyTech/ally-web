import React from "react";

import { Edit, Unpublish, Archive, Delete, Play, Unarchive } from "@assets";
import { DataList, ActionButton, ColumnConfig } from "@components/data-list";
import { en } from "@constants";
import { Simulation, SimulationListProps, SimulationStatus } from "@types";
import {
  formatDate,
  getSimulationStatusColor,
  formatSimulationUsage,
  formatCapitalizedEnum,
} from "@utils";

export const SimulationList: React.FC<SimulationListProps> = ({
  simulations,
  footer,
  onEdit,
  onDelete,
  onPreview,
  onArchive,
  onUnpublish,
  onUnarchive,
}) => {
  const showPreview = (simulation: Simulation) => {
    return simulation.isPreviewEnabled;
  };

  const handleArchive = (simulation: Simulation) =>
    simulation.status !== SimulationStatus.ARCHIVED
      ? onArchive?.(simulation)
      : onUnarchive?.(simulation);

  // Define columns configuration
  const columns: ColumnConfig<Simulation>[] = [
    {
      key: "simulation",
      label: en.simulation.simulation,
      width: "w-[50%] lg:w-[39%]",
      render: () => null, // Handled by thumbnail and title config
    },
    {
      key: "actions",
      label: "",
      width: "w-[12%] lg:w-[11%]",
      render: () => null, // Handled by actions prop
    },
    {
      key: "createdBy",
      label: en.simulation.createdBy,
      width: "w-[10%]",
      hidden: true,
      render: simulation => <span>{simulation.createdBy || "--"}</span>,
    },
    {
      key: "lastModified",
      label: en.simulation.lastModified,
      width: "w-[12%] lg:w-[10%]",
      hidden: true,
      render: simulation => <span>{formatDate(simulation.updatedAt)}</span>,
    },
    {
      key: "status",
      label: en.simulation.status,
      width: "w-[12%] lg:w-[10%]",
      render: simulation => (
        <div className="flex items-center">
          <div
            className={`w-auto py-1 rounded-[4px] px-2 text-sm ${getSimulationStatusColor(simulation.status)}`}
          >
            {simulation.status === SimulationStatus.ACTIVE
              ? formatCapitalizedEnum(SimulationStatus.PUBLISHED)
              : formatCapitalizedEnum(simulation.status) || "--"}
          </div>
        </div>
      ),
    },
    {
      key: "usage",
      label: en.simulation.usage,
      width: "w-[10%]",
      hidden: true,
      render: simulation => <span>{formatSimulationUsage(simulation.usage)}</span>,
    },
    {
      key: "preview",
      label: "",
      width: "w-[14%] lg:w-[10%]",
      render: simulation =>
        showPreview(simulation) ? (
          <button
            onClick={() => onPreview?.(simulation)}
            className="flex flex-row items-center space-x-1 text-sm font-medium transition-colors"
          >
            <Play />
            <span>Preview</span>
          </button>
        ) : (
          <span className="text-typography-600">-</span>
        ),
    },
  ];

  // Define actions configuration
  const actions: ActionButton<Simulation>[] = [
    {
      icon: <Edit />,
      tooltip: en.simulation.edit,
      onClick: simulation => onEdit?.(simulation),
    },
    {
      icon: <Unpublish />,
      tooltip: en.simulation.unpublish,
      onClick: simulation => onUnpublish?.(simulation),
      show: simulation =>
        simulation.status !== SimulationStatus.DRAFT &&
        simulation.status !== SimulationStatus.ARCHIVED,
    },
    {
      icon: <Archive />,
      tooltip: en.simulation.archive,
      onClick: simulation => handleArchive(simulation),
      show: simulation =>
        simulation.status !== SimulationStatus.DRAFT &&
        simulation.status !== SimulationStatus.ARCHIVED,
    },
    {
      icon: <Unarchive />,
      tooltip: en.simulation.unarchive,
      onClick: simulation => handleArchive(simulation),
      show: simulation => simulation.status === SimulationStatus.ARCHIVED,
    },
    {
      icon: <Delete />,
      tooltip: en.simulation.delete,
      onClick: simulation => onDelete?.(simulation),
    },
  ];

  return (
    <DataList
      items={simulations}
      columns={columns}
      actions={actions}
      footer={footer}
      thumbnailConfig={{
        width: "w-[18%] md:w-[10%] lg:w-[7%]",
        height: "h-[56px]",
        onClick: simulation => showPreview(simulation) && onPreview?.(simulation),
        show: showPreview,
      }}
      titleConfig={{
        width: "w-[44%] md:w-[40%] lg:w-[33%]",
        onClick: simulation => showPreview(simulation) && onPreview?.(simulation),
      }}
    />
  );
};
