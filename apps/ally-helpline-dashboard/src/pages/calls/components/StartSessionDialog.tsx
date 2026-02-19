import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Carousel, CarouselSize, CarouselVariant, ConfirmationDialog } from "@components";
import { ButtonVariant } from "@components";
import { CAROUSEL_SLIDES, ROUTES } from "@constants";

import { StartSessionDialogProps } from "./types";

const StartSessionDialog: FC<StartSessionDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onStartSession = () => {
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  const StartSessionEmbed = () => (
    <motion.div
      data-testid="start-session-embed"
      className="w-[90%] flex flex-col items-center border-y-[0.5px] border-border-light py-4 font-primary"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <span className="text-base text-typography-900" data-testid="start-session-embed-title">
        {t("calls.dialog.startSession.embedTitle")}
      </span>
      <span className="text-xs text-typography-800" data-testid="start-session-embed-description">
        {t("calls.dialog.startSession.embedDesc")}
      </span>
    </motion.div>
  );

  return (
    <ConfirmationDialog
      data-testid="start-session-dialog"
      title={{
        normal: t("calls.dialog.startSession.titleNormal"),
        italic: t("calls.dialog.startSession.titleItalic"),
      }}
      isOpen={isOpen}
      onClose={onClose}
      buttonVariant={ButtonVariant.PRIMARY}
      onButtonClick={onStartSession}
      buttonText={t("calls.dialog.startSession.button")}
      footerText={t("calls.dialog.startSession.footer")}
    >
      <Carousel
        slides={CAROUSEL_SLIDES}
        variant={CarouselVariant.LIGHT}
        size={CarouselSize.SMALL}
        className="max-h-[254px] max-w-[236px]"
      />
      <div className="flex flex-col justify-center font-primary">
        <span>{t("calls.dialog.startSession.description1")} </span>
        <span className="flex justify-center">{t("calls.dialog.startSession.description2")}</span>
      </div>

      <StartSessionEmbed />
    </ConfirmationDialog>
  );
};

export default StartSessionDialog;
