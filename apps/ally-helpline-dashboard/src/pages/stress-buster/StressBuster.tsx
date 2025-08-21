import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Minimize } from "lucide-react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { BackgroundGradientBlue } from "@assets/icons";
import { BoxBreathing } from "@components";
import { RootState } from "@store";
import { UserRole } from "@types";
import { getKeyFromIndex } from "@utils";

export const StressBuster = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [isEnding, setIsEnding] = useState<boolean>(true);

  const user = useSelector((state: RootState) => state.user.user);

  const chatId = location.state?.chatId;

  const endMessages = [
    {
      text: "You gave your best in that session",
      highlight: "best",
    },
    {
      text: "Now, take a moment for yourself",
      highlight: "yourself",
    },
  ];

  useEffect(() => {
    (async () => {
      if (user?.role === UserRole.CLIENT) {
        navigate("/");
        return;
      }
      setIsEnding(true);
      setMessageIndex(0);
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessageIndex(1);
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

  const renderEndingMessage = (message: (typeof endMessages)[0]) => {
    const { text, highlight } = message;
    const words = text.split(" ");

    return (
      <span className="text-white text-5xl font-['Replay_Pro']">
        {words.map((word, wordIndex) => (
          <span key={getKeyFromIndex(wordIndex, "word")}>
            {word === highlight ? (
              <span className="bg-blue-500 capitalize px-6 py-2 rounded-full italic">{word}</span>
            ) : (
              word
            )}
            {wordIndex < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    );
  };

  const onViewSummary = () => {
    if (chatId) {
      navigate(`/summary/${chatId}`);
    }
  };

  if (isEnding) {
    return (
      <div className="w-screen h-screen bg-[#17181A] flex justify-center items-center">
        <motion.div
          key={getKeyFromIndex(messageIndex, "message")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="z-50 flex items-center justify-center"
        >
          {renderEndingMessage(endMessages[messageIndex])}
        </motion.div>
        <BackgroundGradientBlue className="absolute bottom-0" />
      </div>
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
