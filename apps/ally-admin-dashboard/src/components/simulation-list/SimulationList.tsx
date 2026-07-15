import React from "react";

import { Add, Edit, Eye, Unpublish, Archive, Delete, Play, Unarchive, Copy } from "@assets";
import {
  DataList,
  ActionButton,
  ColumnConfig,
  SimulationListSkeleton,
  EmptyState,
} from "@components";
import { en, getSimulationCategoryLabel } from "@constants";
import { Simulation, SimulationStatus } from "@types";
import { formatDate, formatSimulationUsage, isNonEmptyArray } from "@utils";

import { ProgressBar } from "../progress-bar";
import { StatusPill } from "../status-pill";

interface SimulationListProps {
  simulations: Simulation[];
  footer?: React.ReactNode;
  isLoading?: boolean;
  hasFilters?: boolean;
  onEdit?: (simulation: Simulation) => void;
  onView?: (simulation: Simulation) => void;
  onDelete?: (simulation: Simulation) => void;
  onPreview?: (simulation: Simulation) => void;
  onArchive?: (simulation: Simulation) => void;
  onUnpublish?: (simulation: Simulation) => void;
  onUnarchive?: (simulation: Simulation) => void;
  onDuplicate?: (simulation: Simulation) => void;
  onCreateSimulation?: () => void;
  currentUser?: any;
  isSuperAdmin?: boolean;
}

export const SimulationList: React.FC<SimulationListProps> = ({
  simulations,
  footer,
  isLoading = false,
  hasFilters = false,
  onEdit,
  onView,
  onDelete,
  onPreview,
  onArchive,
  onUnpublish,
  onUnarchive,
  onCreateSimulation,
  onDuplicate,
  currentUser,
  isSuperAdmin,
}) => {
  // Handle loading state
  if (isLoading && !isNonEmptyArray(simulations)) {
    return <SimulationListSkeleton />;
  }

  // Handle empty state with filters
  if (!isNonEmptyArray(simulations) && hasFilters) {
    return <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />;
  }

  // Handle empty state without data
  if (!isNonEmptyArray(simulations)) {
    return (
      <div className="flex font-primary items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl text-typography-900 mb-4">
            {en.simulation.createYourFirst}{" "}
            <span className="italic">{en.simulation.simulation}</span>
          </h2>
          <p className="text-typography-600 text-base mb-8 leading-relaxed font-primary">
            {en.simulation.newSimulationDescription}
          </p>
          <button
            onClick={onCreateSimulation}
            className="bg-primary-500 hover:bg-primary-600 text-base text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-primary transition-colors"
          >
            <Add />
            {en.simulation.createSimulation}
          </button>
        </div>
      </div>
    );
  }

  const showPreview = (simulation: Simulation) => {
    return simulation.isPreviewEnabled;
  };

  const handleArchive = (simulation: Simulation) =>
    simulation.status !== SimulationStatus.ARCHIVED
      ? onArchive?.(simulation)
      : onUnarchive?.(simulation);

  const isCreatorOrSuperAdmin = (simulation: Simulation) => {
    if (isSuperAdmin) return true;
    const createdBy = simulation.createdByUserId;
    return createdBy === currentUser?.id;
  };

  // Define columns configuration
  const columns: ColumnConfig<Simulation>[] = [
    {
      key: "simulation",
      label: en.simulation.simulation,
      width: "w-[50%] lg:w-[22%]",
      render: () => null,
    },
    {
      key: "actions",
      label: "",
      width: "w-[12%] lg:w-[10%]",
      render: () => null,
    },
    {
      key: "createdBy",
      label: en.simulation.createdBy,
      width: "w-[12%] lg:w-[8%]",
      render: simulation => <span>{simulation.createdBy || "--"}</span>,
    },
    {
      key: "lastModified",
      label: en.simulation.lastModified,
      width: "w-[12%] lg:w-[8%]",
      render: simulation => <span>{formatDate(simulation.updatedAt)}</span>,
    },
    {
      key: "category",
      label: en.simulation.category,
      width: "w-[12%] lg:w-[9%]",
      render: simulation => {
        const categoryLabel = getSimulationCategoryLabel(simulation.category);
        if (!categoryLabel) return <span className="text-typography-600">-</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm text-typography-900">{categoryLabel}</span>
            {simulation.partnerOrgName && (
              <span className="text-xs text-typography-600 truncate">
                {simulation.partnerOrgName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: en.simulation.status,
      width: "w-[12%] lg:w-[8%]",
      render: simulation => <StatusPill status={simulation.status} />,
    },
    {
      key: "progress",
      label: en.simulation.progress,
      width: "w-[12%]",
      render: simulation => <ProgressBar value={simulation.progress} />,
    },
    {
      key: "participants",
      label: en.simulation.participants,
      width: "w-[12%] lg:w-[8%]",
      render: simulation => (
        <span>{simulation.participantsCount != null ? simulation.participantsCount : "--"}</span>
      ),
    },
    {
      key: "usage",
      label: en.simulation.usage,
      width: "w-[10%] lg:w-[8%]",
      render: simulation => <span>{formatSimulationUsage(Number(simulation.usage))}</span>,
    },
    {
      key: "preview",
      label: "",
      width: "w-[14%] lg:w-[8%]",
      render: simulation =>
        showPreview(simulation) ? (
          <button
            onClick={() => onPreview?.(simulation)}
            className="flex flex-row items-center space-x-1 text-sm transition-colors"
          >
            <Play />
            <span>{en.simulation.preview}</span>
          </button>
        ) : (
          <span className="text-typography-600">-</span>
        ),
    },
  ];

  // Define actions configuration
  const actions: ActionButton<Simulation>[] = [
    {
      // Read-only inspection — opens the editor surface without any save
      // path, so a published simulation stays published. Only offered for
      // published/archived rows: a draft has nothing to protect (Edit opens
      // it directly, no status change involved).
      icon: <Eye />,
      tooltip: en.simulation.viewDetails,
      onClick: simulation => onView?.(simulation),
      show: simulation => simulation.status !== SimulationStatus.DRAFT,
    },
    {
      icon: <Edit />,
      tooltip: en.simulation.edit,
      onClick: simulation => onEdit?.(simulation),
      show: simulation => isCreatorOrSuperAdmin(simulation),
    },
    {
      icon: <Unpublish />,
      tooltip: en.simulation.unpublish,
      onClick: simulation => onUnpublish?.(simulation),
      show: simulation =>
        simulation.status !== SimulationStatus.DRAFT &&
        simulation.status !== SimulationStatus.ARCHIVED &&
        isCreatorOrSuperAdmin(simulation),
    },
    {
      icon: <Archive />,
      tooltip: en.simulation.archive,
      onClick: simulation => handleArchive(simulation),
      show: simulation =>
        simulation.status !== SimulationStatus.DRAFT &&
        simulation.status !== SimulationStatus.ARCHIVED &&
        isCreatorOrSuperAdmin(simulation),
    },
    {
      icon: <Copy />,
      tooltip: en.simulation.duplicate,
      onClick: simulation => onDuplicate?.(simulation),
    },
    {
      icon: <Unarchive />,
      tooltip: en.simulation.unarchive,
      onClick: simulation => handleArchive(simulation),
      show: simulation =>
        simulation.status === SimulationStatus.ARCHIVED && isCreatorOrSuperAdmin(simulation),
    },
    {
      icon: <Delete />,
      tooltip: en.simulation.delete,
      onClick: simulation => onDelete?.(simulation),
      show: simulation => isCreatorOrSuperAdmin(simulation),
    },
  ];

  const thumbnailConfig = {
    width: "w-[100px]",
    height: "h-[50px]",
    onClick: simulation => showPreview(simulation) && onPreview?.(simulation),
    show: showPreview,
  };

  const titleConfig = {
    width: "w-[44%] md:w-[40%] lg:w-[33%]",
    onClick: simulation => showPreview(simulation) && onPreview?.(simulation),
  };

  return (
    <DataList
      items={simulations}
      columns={columns}
      actions={actions}
      footer={footer}
      thumbnailConfig={thumbnailConfig}
      titleConfig={titleConfig}
    />
  );
};
