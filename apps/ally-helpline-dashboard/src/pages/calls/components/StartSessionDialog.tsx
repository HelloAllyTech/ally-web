import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Session } from "@assets/icons";
import { Button, ConfirmationDialog } from "@components";
import { ButtonVariant } from "@components/button";
import { ROUTES } from "@constants";
import { useUser } from "@hooks";
import { UserStatus } from "@types";

interface StartSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const StartSessionDialog: FC<StartSessionDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const { updateUserStatus } = useUser();

  const onStartSession = () => {
    updateUserStatus(UserStatus.OFFLINE);
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  const StartSessionEmbed = () => (
    <motion.div
      className="w-[90%] flex flex-col items-center border-y-[0.5px] border-[#E7E7E7] py-4 font-['IBM_Plex_Serif']"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <span className="text-[14px] text-[#0D0D0D]">Listen Live</span>
      <span className="text-[12px] text-[#49454F]">Ally will hear audio alongside you</span>
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
