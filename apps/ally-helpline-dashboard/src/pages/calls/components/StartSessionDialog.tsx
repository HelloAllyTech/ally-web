import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Session } from "@assets/icons";
import { ConfirmationDialog } from "@components";
import { ButtonVariant } from "@components";
import { ROUTES } from "@constants";

import { StartSessionDialogProps } from "./types";

const StartSessionDialog: FC<StartSessionDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const onStartSession = () => {
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  const StartSessionEmbed = () => (
    <motion.div
      className="w-[90%] flex flex-col items-center border-y-[0.5px] border-border-light py-4 font-primary"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <span className="text-base text-typography-900">Listen Live</span>
      <span className="text-[12px] text-typography-800">Ally will hear audio alongside you</span>
    </motion.div>
  );

  return (
    <ConfirmationDialog
      title={{ normal: "Start", italic: "Session" }}
      isOpen={isOpen}
      onClose={onClose}
      content="Ally's mental health AI scribe safely listens, transcribes and writes session notes for you."
      buttonVariant={ButtonVariant.PRIMARY}
      onButtonClick={onStartSession}
      buttonText="Start Session now"
      icon={Session}
      footerText="By starting, you confirm everyone being transcribed has given consent."
    >
      <StartSessionEmbed />
    </ConfirmationDialog>
  );
};

export default StartSessionDialog;
