import { FC, useRef } from "react";

import { SimulationDetailsModalProps } from "../../types";
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
  renderCustomImage,
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
        className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] font-primary overflow-y-auto ${containerClassName}`}
        ref={previewRef}
      >
        {/* Header */}
        <div className={`p-6 pb-4 ${headerClassName}`}>
          <h2 className="text-4xl text-typography-900 mb-4 font-thin font-primary">
            <span>{headerTitle}</span>
            {headerSubtitle && ` ${headerSubtitle}`}
          </h2>

          <div
            className={`flex flex-col items-center border border-border-light rounded-lg p-3 ${contentClassName}`}
          >
            {/* Image/Video Section */}
            <div className="mb-6 w-full">
              <div
                className={`w-full h-64 rounded-lg flex items-center justify-center relative overflow-hidden ${imageContainerClassName}`}
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
            <div className="space-y-3 w-full">
              <h3 className="text-lg text-typography-900">{title}</h3>
              <div>
                <h4 className="text-base font-semibold text-typography-800 mb-1">
                  {scenarioLabel}
                </h4>
                <p className="text-base text-typography-800 leading-relaxed truncate">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 pt-3 flex flex-row items-center justify-between">
          <button
            onClick={onSecondaryClick}
            className={`w-[49%] px-6 py-2 border border-border-light rounded-[40px] text-typography-900 font-medium hover:bg-background-secondary transition-colors ${secondaryButtonClassName}`}
          >
            {secondaryButtonText}
          </button>
          <button
            onClick={onPrimaryClick}
            disabled={isPrimaryLoading}
            className={`w-[49%] px-6 py-2 bg-primary-500 text-white rounded-[40px] font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${primaryButtonClassName}`}
          >
            {primaryButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
