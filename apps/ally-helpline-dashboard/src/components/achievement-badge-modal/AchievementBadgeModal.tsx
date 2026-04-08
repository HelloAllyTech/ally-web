import { FC } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { Badge, CloseIcon } from "@assets";
import { cn } from "@utils";

export interface AchievementBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  badgeImageUrl?: string;
  className?: string;
}

export const AchievementBadgeModal: FC<AchievementBadgeModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  badgeImageUrl,
  className,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const renderBadgeImage = () => {
    if (badgeImageUrl) {
      return (
        <div className="rounded-full bg-primary-50 flex items-center justify-center">
          <CustomImage
            src={badgeImageUrl}
            alt={title}
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    return (
      <div className="w-20 h-20 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] rounded-full bg-primary-50 flex items-center justify-center">
        <Badge className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 text-primary-500" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-5 sm:p-6 md:px-5 md:py-8 w-full max-w-[280px] sm:max-w-[300px] min-h-[280px] sm:min-h-[300px] md:min-h-[320px] md:min-w-[300px] bg-white border border-light rounded-lg shadow-lg",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-modal-title"
      >
        <div className="absolute inset-0 rounded-lg pointer-events-none bg-white" />

        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-[#424242] hover:text-gray-600 transition-colors z-10"
          aria-label={t("common.close")}
        >
          <CloseIcon className="text-neutral" />
        </button>

        <div className="relative z-10 flex flex-col items-center w-full overflow-hidden">
          {renderBadgeImage()}

          <div className="px-1.5 text-typography-900 text-[10px] sm:text-xs font-normal font-primary">
            {t("achievements.modal.newBadge")}
          </div>

          <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-full">
            <div
              id="achievement-modal-title"
              className="font-primary text-xl sm:text-2xl md:text-[26px] font-medium leading-tight sm:leading-[1.65] text-[#1A1A1A] text-center w-full overflow-hidden break-words line-clamp-2"
            >
              {title}
            </div>

            <div className="font-primary text-[10px] sm:text-[11px] leading-[1.38] text-[#6B7280] text-center px-1 sm:px-2">
              {description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementBadgeModal;
