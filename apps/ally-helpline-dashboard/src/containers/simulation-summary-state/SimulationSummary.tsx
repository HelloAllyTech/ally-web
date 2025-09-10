import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@components";

import { FeedbackSection, LoaderSkeleton, ReviewSection } from "./components";
import { SimulationSummaryProps } from "./types";

const SimulationSummary: FC<SimulationSummaryProps> = ({ className }) => {
  const navigate = useNavigate();

  const [isSummary, setIsSummary] = useState<boolean>(false);

  const handleTryAgain = () => {
    navigate("/learn");
  };

  // TODO: Add api call to get summary
  useEffect(() => {
    setTimeout(() => setIsSummary(true), 5000);
  }, []);
  return (
    <div className={`relative flex flex-col h-full w-full ${className}`}>
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1">
        {isSummary ? (
          <>
            <FeedbackSection />
            <ReviewSection />
          </>
        ) : (
          <div className="max-h-full w-full overflow-hidden">
            <LoaderSkeleton />
          </div>
        )}
      </div>

      {/* Sticky Button - Fixed to parent container bottom */}
      {isSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute bottom-4 left-4 right-4 z-10 max-w-lg mx-auto"
        >
          <Button onClick={handleTryAgain} fullWidth>
            Try another Simulation
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default SimulationSummary;
