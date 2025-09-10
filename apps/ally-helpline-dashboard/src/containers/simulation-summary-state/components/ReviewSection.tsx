import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@components";

import { itemVariants } from "../constants";
import StarRating from "./StarRating";
// TODO: Move to shared constants

export const ReviewSection: FC = () => {
  const navigate = useNavigate();

  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  const handleTryAgain = () => {
    navigate("/learn");
  };
  // Rating text mapping
  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 1:
        return "Poor experience";
      case 2:
        return "Below average";
      case 3:
        return "Average experience";
      case 4:
        return "Nice experience!";
      case 5:
        return "Excellent experience!";
      default:
        return "";
    }
  };

  return (
    <motion.div variants={itemVariants} className="w-full">
      <motion.div className="flex flex-row items-center mb-6 text-[#9CA3AF]">
        <div className="text-[12px] font-semibold min-w-[120px] sm:min-w-[145px] font-['Roboto']">
          REVIEW AND RATING
        </div>
        <div className="flex w-full h-[1px] bg-[#D2D2D2] ml-[5px] opacity-70" role="separator" />
      </motion.div>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="p-4 sm:p-[20px] flex flex-col gap-3 items-center border-[0.5px] border-[#D2D2D2] rounded-lg bg-white font-['IBM_Plex_Serif'] mb-8"
      >
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="sm:text-xl text-[#6B7280]"
        >
          How was your experience?
        </motion.h2>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <StarRating rating={rating} setRating={setRating} />
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="text-sm sm:text-base text-[#6B7280] font-medium h-6"
          >
            {getRatingText(rating)}
          </motion.p>
        </motion.div>

        <motion.textarea
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full p-3 sm:p-4 min-h-[150px] sm:min-h-[180px] text-sm sm:text-base rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-['Roboto']"
          placeholder="Tell us how we can improve..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
        />
      </motion.div>
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
  );
};
