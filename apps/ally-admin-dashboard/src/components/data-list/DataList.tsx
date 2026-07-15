import React from "react";

import { CustomImage, htmlToPlainText, Tooltip } from "@ally-ui-mono/ui-shared";
import { Simulation, ScenarioPath } from "@types";

// Generic type for items that can be displayed in the list
export type DataListItem = Simulation | ScenarioPath;

// Column configuration
export interface ColumnConfig<T> {
  key: string;
  label: string;
  width: string;
  hidden?: boolean;
  render: (item: T) => React.ReactNode;
}

// Action button configuration
export interface ActionButton<T> {
  icon: React.ReactNode;
  tooltip: string | ((item: T) => string);
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
}

export interface DataListProps<T extends DataListItem> {
  items: T[];
  columns: ColumnConfig<T>[];
  actions: ActionButton<T>[];
  footer?: React.ReactNode;
  thumbnailConfig?: {
    width: string;
    height: string;
    renderExtraContent?: (item: T) => React.ReactNode;
    onClick?: (item: T) => void;
    show?: (item: T) => boolean;
  };
  titleConfig?: {
    width: string;
    onClick?: (item: T) => void;
  };
}

const COLUM_KEYS = {
  ACTIONS: "actions",
};

export function DataList<T extends DataListItem>({
  items,
  columns,
  actions,
  footer,
  thumbnailConfig,
  titleConfig,
}: DataListProps<T>) {
  // Header only shows at lg+, where cards render as a flat row. Below lg each
  // metadata cell carries its own label, so a detached header would be noise.
  // Structure mirrors renderCard (first column + flex-1 metadata region) so
  // the percentage widths resolve identically and columns stay aligned.
  const tableHeader = (
    <div className="hidden lg:flex flex-row items-center w-full text-sm text-typography-800 border-b border-border-light px-4 py-2">
      <div className={`${columns[0].width} shrink-0`}>{columns[0].label}</div>
      <div className="flex flex-row flex-1 items-center justify-between">
        {columns.slice(1).map(column => (
          <div
            key={column.key}
            className={`${column.width} shrink-0 px-4 ${column.hidden ? "hidden lg:block" : ""}`}
          >
            {column.label}
          </div>
        ))}
      </div>
    </div>
  );

  const renderActionButtons = (item: T) => {
    return (
      // flex-wrap: the cell clips left-side overflow (justify-end +
      // overflow-x-hidden), so on rows with many actions the leftmost icon
      // silently disappeared. Wrapping to a second line keeps every action
      // reachable at any column width.
      <div className="flex flex-row flex-wrap items-center justify-end gap-[7px] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
        {actions.map((action, index) => {
          const shouldShow = action.show ? action.show(item) : true;
          if (!shouldShow) return null;

          const isDisabled = action.disabled ? action.disabled(item) : false;
          const tooltipText =
            typeof action.tooltip === "function" ? action.tooltip(item) : action.tooltip;

          return (
            <Tooltip key={index} label={tooltipText} align="top">
              <button
                type="button"
                onClick={() => !isDisabled && action.onClick(item)}
                className={isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              >
                {action.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  const renderColumnContent = (column: ColumnConfig<T>, item: T) => {
    // Special handling for actions column
    if (column.key === COLUM_KEYS.ACTIONS) {
      return renderActionButtons(item);
    }
    // Regular column render
    return column.render(item);
  };

  const renderCard = (item: T) => {
    const firstColumn = columns[0];
    const otherColumns = columns.slice(1);

    const handleTitleClick = () => {
      if (titleConfig?.onClick) {
        titleConfig.onClick(item);
      }
    };

    const handleThumbnailClick = () => {
      const shouldShow = thumbnailConfig?.show ? thumbnailConfig.show(item) : true;
      if (shouldShow && thumbnailConfig?.onClick) thumbnailConfig.onClick(item);
    };

    return (
      <div
        key={item.id}
        className="group flex flex-col lg:flex-row text-sm lg:items-center w-full text-typography-900 border-b border-border-light px-4 py-3 gap-3 lg:gap-0 hover:shadow-sm hover:bg-neutral-100 transition-shadow"
      >
        {/* First Column - Thumbnail + Title/Description */}
        <div
          className={`flex flex-row items-center ${firstColumn.width} max-lg:w-full shrink-0 gap-3`}
        >
          {thumbnailConfig && (
            <div
              onClick={handleThumbnailClick}
              className={`${thumbnailConfig.width} ${thumbnailConfig.height} ${thumbnailConfig.onClick ? "cursor-pointer" : ""} relative rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100`}
            >
              <CustomImage
                src={item.coverImageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              {thumbnailConfig?.renderExtraContent?.(item)}
            </div>
          )}
          <div
            onClick={handleTitleClick}
            className={`flex flex-col justify-center max-w-[300px] min-w-0 ${titleConfig?.onClick ? "cursor-pointer" : ""}`}
          >
            <h3 className="text-sm font-regular text-typography-900 truncate">{item.title}</h3>
            <div className="text-xs text-typography-800 line-clamp-2 mt-1">
              {htmlToPlainText(item.description)}
            </div>
          </div>
        </div>

        {/* Metadata Columns — always visible: labelled 2-up grid on mobile,
            3-up at sm, single header-aligned row at lg. Column widths only
            apply at lg (max-lg:w-auto lets the grid tracks size the cells). */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row gap-x-4 gap-y-3 lg:gap-0 lg:flex-1 lg:items-center lg:justify-between">
          {otherColumns.map(column => (
            <div
              key={column.key}
              className={`${column.width} max-lg:w-auto shrink-0 lg:px-4 min-w-0 ${column.hidden ? "hidden lg:block" : ""} overflow-x-hidden`}
            >
              {column.label ? (
                <div className="text-xs uppercase tracking-wide text-typography-600 mb-1 lg:hidden">
                  {column.label}
                </div>
              ) : null}
              {renderColumnContent(column, item)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full overflow-x-auto font-primary overflow-y-scroll h-[calc(100vh-180px)] custom-scrollbar">
      {tableHeader}
      {items?.map(item => renderCard(item))}
      {footer}
    </div>
  );
}
