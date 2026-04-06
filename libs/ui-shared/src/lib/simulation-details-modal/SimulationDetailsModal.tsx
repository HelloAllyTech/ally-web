"use client";

import { FC, useRef } from "react";

import { SimulationDetailsModalProps } from "../../types";
import { ChipGroup } from "../chip-group";
import { CustomVideo } from "../custom-video";

export const SimulationDetailsModal: FC<SimulationDetailsModalProps> = ({
  isOpen,
  title,
  description,
  coverImageUrl,
  coverVideoUrl,
  headerTitle = "Simulation",
  headerSubtitle = "Preview",
  scenarioLabel = "Scenario:",
  primaryButtonText,
  secondaryButtonText,
  onPrimaryClick,
  onSecondaryClick,
  onClickOutside,
  isPrimaryLoading = false,
  primaryButtonClassName = "",
  secondaryButtonClassName = "",
  containerClassName = "",
  headerClassName = "",
  contentClassName = "",
  imageContainerClassName = "",
  triggerWarnings = [],
  triggerWarningsLabel = "Trigger warnings:",
  showActionButtons = true,
  renderCustomImage,
  renderAdditionalContent,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClickOutside) {
      onClickOutside();
    }
  };

  if (!isOpen) return null;

  const isNonEmptyString = (value: string | undefined): value is string => {
    return typeof value === "string" && value.trim().length > 0;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] min-h-0 flex flex-col overflow-hidden font-primary ${containerClassName}`}
        ref={previewRef}
      >
        {/* Header + body: scrolls so footer stays inside the modal */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-4 ${headerClassName}`}
        >
          <h2 className="text-4xl text-typography-900 mb-4 font-thin font-secondary">
            <span>{headerTitle}</span>
            <span className="font-secondary">{headerSubtitle && ` ${headerSubtitle}`}</span>
          </h2>

          {renderAdditionalContent && (
            <div className="mb-4 w-full">{renderAdditionalContent()}</div>
          )}

          <div
            className={`flex flex-col items-center border border-border-light rounded-lg p-3 ${contentClassName}`}
          >
            {/* Image/Video Section */}
            <div className="mb-6 w-full">
              <div
                className={`w-full min-h-[200px] h-[22vh] rounded-lg flex items-center justify-center relative overflow-hidden bg-background-secondary ${imageContainerClassName}`}
              >
                {isNonEmptyString(coverVideoUrl) ? (
                  <CustomVideo
                    src={coverVideoUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : renderCustomImage ? (
                  renderCustomImage({
                    src: coverImageUrl,
                    alt: title,
                    className: "w-full h-full object-cover",
                  })
                ) : (
                  <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-3 w-full max-h-[30vh] overflow-y-auto">
              <h3 className="text-lg text-typography-900">{title}</h3>
              <div>
                <h4 className="text-base font-semibold text-typography-800">{scenarioLabel}</h4>
                <p className="text-base text-typography-800 leading-relaxed max-h-[300px] overflow-y-auto">
                  {description}
                </p>
                {triggerWarnings?.length > 0 && (
                  <div className="flex flex-col pt-2">
                    <div className="text-base font-semibold text-typography-800 mb-1">
                      {triggerWarningsLabel}
                    </div>
                    <ChipGroup items={triggerWarnings} chipClassName="text-sm" maxVisible={20} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActionButtons && (
          <div className="flex-shrink-0 px-6 pb-6 pt-3 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            {onSecondaryClick && (
              <button
                onClick={onSecondaryClick}
                className={`w-full min-w-0 sm:flex-1 sm:max-w-none font-tertiary px-6 py-2 border border-border-light rounded-[40px] text-typography-900 font-medium hover:bg-background-secondary transition-colors text-md ${secondaryButtonClassName}`}
              >
                {secondaryButtonText}
              </button>
            )}
            {onPrimaryClick && (
              <button
                onClick={onPrimaryClick}
                disabled={isPrimaryLoading}
                className={`w-full min-w-0 sm:flex-1 sm:max-w-none font-tertiary px-6 py-2 bg-primary-500 text-white rounded-[40px] font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-md ${primaryButtonClassName}`}
              >
                {primaryButtonText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
