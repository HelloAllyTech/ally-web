import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@components";

import { FeedbackSection, ReviewSection } from "./components";
import { containerVariants } from "../learn/constants";

export const SimulationSummary: FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/learn");
  };

  return (
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center justify-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 max-w-3xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center justify-center"
      >
        <div className="w-full text-black text-[24px] sm:text-[32px] font-normal text-left font-['Replay_Pro']">
          Simulation <em>Ended</em>
        </div>
        <div className="flex flex-col gap-6 w-full overflow-y-auto">
          <FeedbackSection />
          <ReviewSection />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-center w-full"
        >
          <Button onClick={handleTryAgain} fullWidth>
            Try another Simulation
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
