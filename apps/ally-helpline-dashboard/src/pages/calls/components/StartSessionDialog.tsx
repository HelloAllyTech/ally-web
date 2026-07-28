import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ConfirmationDialog } from "@components";
import { ButtonVariant } from "@components";
import { ROUTES } from "@constants";

import { StartSessionDialogProps } from "./types";

/**
 * Consent gate for starting scribe mode.
 *
 * This used to be a menu: the page's button opened it, and the only thing
 * inside was another button that actually started the session. The entry point
 * now says "Start Scribe Mode" and this step exists solely so the counsellor
 * confirms consent before anyone is recorded — so it carries the consent line
 * and nothing else. The privacy carousel and marketing copy that used to fill
 * it are covered elsewhere in onboarding and only obscured that one question.
 */
const StartSessionDialog: FC<StartSessionDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onStartScribeMode = () => {
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

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
      onButtonClick={onStartScribeMode}
      buttonText={t("calls.dialog.startSession.startScribeMode")}
    >
      <div
        className="flex flex-col justify-center font-primary text-center text-sm text-typography-800 px-4"
        data-testid="start-session-consent"
      >
        {t("calls.dialog.startSession.footer")}
      </div>
    </ConfirmationDialog>
  );
};

export default StartSessionDialog;
