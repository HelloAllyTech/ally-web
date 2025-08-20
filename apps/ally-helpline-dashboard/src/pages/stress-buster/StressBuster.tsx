import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Minimize } from "lucide-react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { StressBuster as BoxBreathing } from "@components";
import { RootState } from "@store";
import { UserRole } from "@types";

export const StressBuster = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [endingMessage, setEndingMessage] = useState<string>("");
  const [isEnding, setIsEnding] = useState<boolean>(false);

  const user = useSelector((state: RootState) => state.user.user);

  const chatId = location.state?.chatId;

  useEffect(() => {
    (async () => {
      if (user?.role === UserRole.CLIENT) {
        navigate("/");
        return;
      }
      setIsEnding(true);
      setEndingMessage("You gave your best on that call!");
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setEndingMessage("Now, take a moment for yourself");
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsEnding(false);
      } catch (error) {
        logger.info(`Error in handleEndSequence:, ${error}`);
      }
    })();

    return () => {
      setIsEnding(false);
    };
  }, []);

  const onClose = () => {
    if (chatId) {
      navigate(`/summary/${chatId}`);
    }
  };

  const onViewSummary = () => {
    if (chatId) {
      navigate(`/summary/${chatId}`);
    }
  };

  if (isEnding) {
    return (
      <motion.div
        key={endingMessage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 z-50 flex items-center justify-center"
      >
        <div className="text-[#0D0D0D] text-4xl font-bold">{endingMessage}</div>
      </motion.div>
    );
  }

  return (
    <BoxBreathing
      playOnMount
      isFullScreenMode
      closeIcon={<Minimize />}
      onClose={onClose}
      showViewSummaryButton
      onViewSummary={onViewSummary}
    />
  );
};
