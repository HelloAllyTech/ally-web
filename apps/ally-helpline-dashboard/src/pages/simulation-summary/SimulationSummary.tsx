import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { ReviewSection } from "./components";
import { containerVariants, itemVariants } from "../learn/constants";

export const SimulationSummary: FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/learn");
  };

  const renderTitle = () => (
    <motion.div
      variants={itemVariants}
      className="mb-[10px] sm:mb-[20px] flex flex-col mt-[10px] sm:mt-0 w-full"
    >
      <div className="mb-[10px] text-black text-[24px] sm:text-[32px] font-normal text-left font-['Replay_Pro']">
        Simulation <em>Ended</em>
      </div>
      <motion.div variants={itemVariants} className="flex flex-row items-center text-[#9CA3AF]">
        <div className="text-[12px] font-semibold min-w-[120px] sm:min-w-[145px] font-['Roboto']">
          REVIEW AND RATING
        </div>
        <div className="flex w-full h-[1px] bg-[#D2D2D2] ml-[5px] opacity-70" role="separator" />
      </motion.div>
    </motion.div>
  );

  const renderTryAgainButton = () => (
    <motion.div
      className="w-full sm:pt-[20px] pt-[10px] pb-[15px] sm:pb-[25px]"
      variants={itemVariants}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex justify-center w-full"
      >
        <motion.button
          onClick={handleTryAgain}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-12 py-3 text-[16px] font-[500] bg-[#0957D0] hover:bg-[#0957D0] text-white rounded-lg transition-colors duration-200 font-['Roboto']"
        >
          Try another Simulation
        </motion.button>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center justify-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col max-w-3xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center justify-center"
      >
        {renderTitle()}
        <motion.div variants={itemVariants} className="w-full">
          <ReviewSection />
        </motion.div>
        {renderTryAgainButton()}
      </motion.div>
    </div>
  );
};
