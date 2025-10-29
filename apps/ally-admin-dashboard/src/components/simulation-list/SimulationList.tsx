import React from "react";

import { Tooltip } from "@mui/material";

import { Edit, Unpublish, Archive, Delete, Play, Unarchive } from "@assets";
import { CustomImage } from "@components";
import { en, toolTipStyles } from "@constants";
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

  const tableHeader = (
    <div className="hidden md:flex flex-row items-center justify-between w-full text-[13px] text-gray-500 border-b border-gray-200 px-4 py-2">
      <div className="w-[50%] lg:w-[39%]">{en.simulation.simulation}</div>
      <div className="w-[12%] lg:w-[11%] px-4" />
      <div className="hidden lg:block w-[10%] px-4">{en.simulation.createdBy}</div>
      <div className="hidden lg:block w-[12%] lg:w-[10%] px-4">{en.simulation.lastModified}</div>
      <div className="w-[12%] lg:w-[10%] px-4">{en.simulation.status}</div>
      <div className="hidden lg:block w-[10%] px-4">{en.simulation.usage}</div>
      <div className="w-[14%] lg:w-[10%] px-4" />
    </div>
  );

  const renderActionButtons = (simulation: Simulation) => {
    return (
      <div className="flex flex-row items-center justify-end gap-3 md:gap-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip title={en.simulation.edit} placement="top" arrow slotProps={toolTipStyles}>
          <div onClick={() => onEdit?.(simulation)} className="cursor-pointer">
            <Edit />
          </div>
        </Tooltip>
        {simulation.status !== SimulationStatus.DRAFT && (
          <>
            {simulation.status !== SimulationStatus.ARCHIVED && (
              <Tooltip
                title={en.simulation.unpublish}
                placement="top"
                arrow
                slotProps={toolTipStyles}
              >
                <div onClick={() => onUnpublish?.(simulation)} className="cursor-pointer">
                  <Unpublish />
                </div>
              </Tooltip>
            )}
            <Tooltip
              title={
                simulation.status !== SimulationStatus.ARCHIVED
                  ? en.simulation.archive
                  : en.simulation.unarchive
              }
              placement="top"
              arrow
              slotProps={toolTipStyles}
            >
              <div onClick={() => handleArchive(simulation)} className="cursor-pointer">
                {simulation.status !== SimulationStatus.ARCHIVED ? <Archive /> : <Unarchive />}
              </div>
            </Tooltip>
          </>
        )}
        <Tooltip title={en.simulation.delete} placement="top" arrow slotProps={toolTipStyles}>
          <div onClick={() => onDelete?.(simulation)} className="cursor-pointer">
            <Delete />
          </div>
        </Tooltip>
      </div>
    );
  };

  const renderSimutionCard = (simulation: Simulation) => {
    return (
      <div
        key={simulation.id}
        className="group flex flex-row  text-[13px] items-center justify-between w-full text-gray-600 border-b border-gray-200 px-4 py-3 hover:shadow-sm hover:bg-gray-100 transition-shadow"
      >
        {/* Simulation Image */}
        <div
          onClick={() => showPreview(simulation) && onPreview?.(simulation)}
          className="w-[18%] md:w-[10%] lg:w-[7%] h-[56px] cursor-pointer rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
        >
          <CustomImage
            src={simulation.coverImageUrl}
            alt={simulation.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Simulation Title and Description */}
        <div
          onClick={() => showPreview(simulation) && onPreview?.(simulation)}
          className="flex flex-col justify-between align-middle min-h-[55px] w-[44%] md:w-[40%] lg:w-[33%] px-4 py-1 cursor-pointer overflow-x-hidden"
        >
          <h3 className="text-[13px]">{simulation.title}</h3>
          <div className="text-gray-500 leading-relaxed line-clamp-2">
            {simulation?.description}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-[16%] md:w-[12%] lg:w-[11%] min-w-[120px] pr-4 overflow-x-hidden">
          {renderActionButtons(simulation)}
        </div>

        {/* Created By */}
        <div className="hidden lg:block w-[10%] px-4 overflow-x-hidden">
          {simulation.createdBy || "--"}
        </div>

        {/* Last Modified */}
        <div className="hidden lg:block w-[14%] md:w-[12%] lg:w-[10%] px-4 overflow-x-hidden">
          {formatDate(simulation.updatedAt)}
        </div>

        {/* Status */}
        <div className={`w-[16%] md:w-[12%] lg:w-[10%] flex items-center overflow-x-hidden`}>
          <div
            className={`w-auto py-1 rounded-[4px] px-2 text-[13px] ${getSimulationStatusColor(simulation.status)}`}
          >
            {simulation.status === SimulationStatus.ACTIVE
              ? formatCapitalizedEnum(SimulationStatus.PUBLISHED)
              : formatCapitalizedEnum(simulation.status) || "--"}
          </div>
        </div>

        {/* Usage */}
        <div className="hidden lg:block w-[10%] px-4 overflow-x-hidden">
          {formatSimulationUsage(simulation.usage)}
        </div>

        {/* Preview */}
        <div className="w-[18%] md:w-[14%] lg:w-[10%] px-4">
          {showPreview(simulation) ? (
            <button
              onClick={() => onPreview?.(simulation)}
              className="flex flex-row items-center space-x-1 text-sm font-medium transition-colors"
            >
              <Play />
              <span>Preview</span>
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full overflow-x-auto font-['IBM_Plex_Serif'] overflow-y-scroll h-[calc(100vh-140px)]">
      {tableHeader}
      {simulations?.map(simulation => renderSimutionCard(simulation))}
      {footer}
    </div>
  );
};
