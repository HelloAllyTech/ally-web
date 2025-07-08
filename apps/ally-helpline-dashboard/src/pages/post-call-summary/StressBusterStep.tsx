import { FC } from "react";
import { motion } from "framer-motion";

import { Button, StressBuster } from "@/components";

import { StressBusterProps } from "./types";

const StressBusterStep: FC<StressBusterProps> = ({ onProceed }) => {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-base font-medium text-[#47464F]">Let&apos;s try a stress buster</h2>
      <div className="w-full aspect-video mb-4 rounded-3xl overflow-hidden">
        <StressBuster showViewSummaryButton onViewSummary={onProceed} />
      </div>
      <Button className="rounded-full w-fit self-end" onClick={onProceed}>
        View Call summary
      </Button>
    </motion.div>
  );
};

export default StressBusterStep;
