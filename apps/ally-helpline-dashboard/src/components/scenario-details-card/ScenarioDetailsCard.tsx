import { FC, useState, type MouseEvent } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ChipGroup, CustomVideo, Loading, RichTextRenderer } from "@ally-ui-mono/ui-shared";
import { ShareIcon, TimerIcon } from "@assets";
import { AppTooltip, Button, Chip, ConfirmationDialog, ButtonVariant } from "@components";
import { TooltipLocation } from "@constants";

import { ScenarioDetailsCardProps } from "./types";

/** Sentence-case labels for the backend ScenarioDifficultyLevel enum (EASY/MEDIUM/HARD). */
const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/** Dot colour per difficulty level, reinforcing the label at a glance. */
const DIFFICULTY_DOT: Record<string, string> = {
  EASY: "bg-success-500",
  MEDIUM: "bg-warning-500",
  HARD: "bg-destructive-500",
};

const formatDifficulty = (level?: string): string => {
  if (!level) return "";
  return DIFFICULTY_LABELS[level.toUpperCase()] ?? level;
};

/** maxTimeValue is stored as "HH:MM:SS"; render it as a compact human duration. */
const formatDuration = (value?: string): string => {
  if (!value) return "";
  const [hours, minutes, seconds] = value.split(":").map(part => parseInt(part, 10));
  if ([hours, minutes, seconds].some(part => Number.isNaN(part))) return "";
  const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
  if (totalMinutes <= 0) return "";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const wholeHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes ? `${wholeHours}h ${remainingMinutes}m` : `${wholeHours}h`;
};

/** TimerIcon sized for use inside a Chip (Chip renders the icon with no sizing of its own). */
const DurationChipIcon: FC = () => <TimerIcon className="h-3.5 w-3.5 flex-shrink-0" />;

const ScenarioDetailsCard: FC<ScenarioDetailsCardProps> = ({
  coverImage,
  coverVideo,
  difficultyLevel,
  isStarting,
  longDescription,
  maxTimeValue,
  onStart,
  title,
  noCredits = false,
  triggerWarnings,
}) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const isDisabled = isStarting || noCredits;

  const difficultyLabel = formatDifficulty(difficultyLevel);
  const durationLabel = formatDuration(maxTimeValue);
  const hasMeta = Boolean(difficultyLabel || durationLabel);

  /**
   * Copy the current page URL to the clipboard.
   * - Prefers the async Clipboard API when available
   * - Falls back to a hidden textarea for older browsers
   */
  const handleShareScenario = (event: MouseEvent<HTMLButtonElement>) => {
    // Avoid triggering any parent click handlers
    event.stopPropagation();
    if (typeof window === "undefined") return;

    const url = window.location.href;

    // Use modern Clipboard API if supported
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    } else {
      // Fallback: temporary hidden textarea + execCommand
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toast.success(t("learn.scenario.shareCopied"));
  };

  const handleStartSimulation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowNotification(true);
  };

  const handleNotificationConfirm = () => {
    setShowNotification(false);
    onStart?.();
  };

  const handleNotificationClose = () => {
    setShowNotification(false);
  };

  // Full-width cover banner with a floating Share control (light pill keeps the
  // fixed-colour ShareIcon legible over any photo).
  const renderMedia = () => (
    <div className="relative w-full">
      {!imageError ? (
        coverVideo?.length > 0 ? (
          <CustomVideo
            src={coverVideo}
            alt={`${title} scenario preview`}
            className="h-[210px] w-full object-cover"
          />
        ) : (
          <img
            src={coverImage}
            alt={`${title} scenario preview`}
            className="h-[210px] w-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <div className="flex h-[210px] w-full items-center justify-center bg-gray-100 text-typography-600">
          <span className="text-sm">{t("learn.scenario.mediaUnavailable")}</span>
        </div>
      )}
      <button
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-typography-700 transition-colors hover:bg-white"
        onClick={handleShareScenario}
        aria-label={t("learn.scenario.shareAria")}
        title={t("learn.scenario.shareTitle")}
      >
        <ShareIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <>
      <motion.div
        layout
        className="flex w-full max-w-[600px] flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white origin-top transition-all duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-labelledby="scenario-title"
      >
        {renderMedia()}

        <div className="flex flex-col gap-3 p-5 font-primary">
          <div id="scenario-title" className="text-typography-900 text-2xl leading-snug">
            {title}
          </div>

          {hasMeta && (
            <div className="flex flex-wrap items-center gap-2">
              {difficultyLabel && (
                <Chip
                  config={{
                    label: difficultyLabel,
                    dotClassName:
                      DIFFICULTY_DOT[difficultyLevel?.toUpperCase() ?? ""] ?? "bg-typography-400",
                    outerDivClassName: "bg-background-secondary text-typography-700",
                  }}
                />
              )}
              {durationLabel && (
                <Chip
                  config={{
                    label: durationLabel,
                    icon: DurationChipIcon,
                    outerDivClassName: "bg-background-secondary text-typography-700",
                  }}
                />
              )}
            </div>
          )}

          {longDescription && (
            <div className="flex flex-col overflow-y-auto custom-scrollbar max-h-[200px]">
              <div className="text-base font-semibold text-typography-900">
                {t("learn.scenario.scenarioLabel")}
              </div>
              <RichTextRenderer content={longDescription} />
            </div>
          )}

          {triggerWarnings?.length > 0 && (
            <div className="flex flex-col">
              <div className="text-base font-semibold text-typography-900 mb-[4px]">
                {t("common.triggerWarnings")}
              </div>
              <ChipGroup items={triggerWarnings} chipClassName="text-sm" maxVisible={20} />
            </div>
          )}

          <AppTooltip location={TooltipLocation.START_SIMULATION_BUTTON}>
            <Button
              onClick={handleStartSimulation}
              variant="primary"
              className={`!font-tertiary !text-base !py-3 mt-1 w-full ${isDisabled && "!bg-gray-400"}`}
              disabled={isDisabled}
              aria-label={t("learn.scenario.startAria")}
            >
              {isStarting && <Loading withOverlay={false} small className="mr-2 !h-4 !w-4" />}
              {t("common.startSimulation")}
            </Button>
          </AppTooltip>
        </div>
      </motion.div>

      <ConfirmationDialog
        data-testid="simulation-notification-dialog"
        title={{
          normal: t("learn.scenario.preStart.titleNormal"),
          italic: t("learn.scenario.preStart.titleItalic"),
        }}
        isOpen={showNotification}
        onClose={handleNotificationClose}
        buttonVariant={ButtonVariant.PRIMARY}
        onButtonClick={handleNotificationConfirm}
        buttonText={t("learn.scenario.preStart.button")}
        content={t("learn.scenario.preStart.content")}
      />
    </>
  );
};

export default ScenarioDetailsCard;
