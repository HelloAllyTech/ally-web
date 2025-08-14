import { FC } from "react";

import { Dialog } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { CloseIcon, Session } from "@assets/icons";
import { Button } from "@components";
import { ROUTES } from "@constants";
import { useUser } from "@hooks";
import { UserStatus } from "@types";

import { StartSessionDialogProps } from "./types";

const StartSessionDialog: FC<StartSessionDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const { updateUserStatus } = useUser();

  const onStartSession = () => {
    updateUserStatus(UserStatus.OFFLINE);
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "8px",
        },
      }}
    >
      <motion.div
        className="w-[500px] flex flex-col gap-4 items-center p-10 relative"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="absolute top-3 right-3"
        >
          <CloseIcon onClick={onClose} className="cursor-pointer" />
        </motion.div>

        <motion.div
          className="text-[30px] font-['Replay_Pro'] text-[#434343]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <span>Start </span>
          <span className="italic font-bold">Session</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Session />
        </motion.div>

        <motion.p
          className="text-center font-['IBM_Plex_Serif']"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          Ally's mental health AI scribe safely listens, transcribes and writes session notes for
          you.
        </motion.p>

        <motion.div
          className="w-[90%] flex flex-col items-center border-y-[0.5px] border-[#E7E7E7] py-4 font-['IBM_Plex_Serif']"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span className="text-[14px] text-[#0D0D0D]">Listen Live</span>
          <span className="text-[12px] text-[#49454F]">Ally will hear audio alongside you</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Button className="w-full" onClick={onStartSession}>
            Start Session now
          </Button>
        </motion.div>

        <motion.span
          className="text-[12px] text-[#656565] font-['IBM_Plex_Serif']"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          By starting, you confirm everyone being transcribed has given consent.
        </motion.span>
      </motion.div>
    </Dialog>
  );
};

export default StartSessionDialog;
