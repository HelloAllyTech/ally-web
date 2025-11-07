import { FC } from "react";

import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { ROUTES } from "@constants";
import { SimulationSummary } from "@containers";

import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const closeSummarySidebar = () => {
    navigate(ROUTES.LEARN);
  };

  return (
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center ">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 max-w-3xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center"
      >
        <div className="w-full text-black text-[24px] sm:text-[32px] font-normal text-left font-secondary mt-8 px-4">
          Simulation <em>Summary</em>
        </div>
        <SimulationSummary
          summaryId={sessionId}
          className="max-h-[calc(100vh-120px)]"
          onSummaryClose={closeSummarySidebar}
        />
      </motion.div>
    </div>
  );
};
