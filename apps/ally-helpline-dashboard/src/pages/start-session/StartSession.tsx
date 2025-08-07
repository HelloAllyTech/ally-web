import { useNavigate } from "react-router-dom";
import { Headphones } from "@mui/icons-material";
import { motion } from "framer-motion";

import { Button } from "@components";
import { ROUTES } from "@constants";
import { useUser } from "@hooks";
import { UserStatus } from "@types";

export const StartSession = () => {
  const navigate = useNavigate();

  const { updateUserStatus } = useUser();

  const onStartSession = () => {
    updateUserStatus(UserStatus.OFFLINE);
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="w-[50%] bg-[#F8F8F8] border-[0.5px] border-[#D3D3D3] rounded-[6px] p-2 text-center"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        <motion.div
          className="flex flex-col items-center justify-center gap-8 bg-white rounded-[6px] p-8 
            border-[0.5px] border-[#D3D3D3] shadow-[8.52px_11.36px_14.2px_0px_rgba(160,158,158,0.09)]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            className="text-[44px] font-['Replay_Pro']"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <span className="text-[#000000]">Start </span>
            <span className="text-[#000000] italic font-bold">Session</span>
          </motion.div>

          <motion.p
            className="w-[80%] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Join sessions in real-time with Ally. Get live transcriptions, emotional cues, and
            AI-powered nudges to help you respond with empathy and clarity.
          </motion.p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className="bg-[#4C4C4C] hover:bg-[#4C4C4C] flex items-center gap-2 transition-all duration-300"
              onClick={onStartSession}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Headphones className="w-[24px] h-[24px]" />
              </motion.div>
              <span className="text-white text-[24px] font-['IBM_Plex_Serif']">Start</span>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="text-[#656565] text-[14px] mt-4 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          By starting, you confirm everyone being transcribed has given consent
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
