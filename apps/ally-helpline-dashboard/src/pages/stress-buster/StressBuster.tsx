import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Minimize } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { BackgroundGradientBlue } from "@assets";
import { BoxBreathing } from "@components";
import { RootState } from "@store";
import { getKeyFromIndex } from "@utils";

export const StressBuster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [isEnding, setIsEnding] = useState<boolean>(true);

  useSelector((state: RootState) => state.user.user);

  const chatId = location.state?.chatId;

  const endMessages = [
    {
      text: t("stressBuster.messages.gaveBest"),
      highlight: t("stressBuster.messages.gaveBestHighlight"),
    },
    {
      text: t("stressBuster.messages.momentForYourself"),
      highlight: t("stressBuster.messages.momentHighlight"),
    },
  ];

  useEffect(() => {
    (async () => {
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
      <span className="text-white text-5xl font-secondary">
        {words.map((word, wordIndex) => (
          <span key={getKeyFromIndex(wordIndex, "word")}>
            {word === highlight ? (
              <span className="bg-primary-500 capitalize px-6 py-2 rounded-full italic">
                {word}
              </span>
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
      navigate(`/summary/${chatId}?section=2`);
    }
  };

  if (isEnding) {
    return (
      <div className="w-screen h-dvh bg-[#17181A] flex justify-center items-center">
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
