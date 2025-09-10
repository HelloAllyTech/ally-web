import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@components";
import { SimulationSummaryState } from "@containers";

import { containerVariants } from "../learn/constants";

export const SimulationSummary: FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/learn");
  };

  return (
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center ">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 max-w-3xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center"
      >
        <div className="w-full text-black text-[24px] sm:text-[32px] font-normal text-left font-['Replay_Pro'] mt-8">
          Simulation <em>Ended</em>
        </div>
        <SimulationSummaryState />
      </motion.div>
    </div>
  );
};
