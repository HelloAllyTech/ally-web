import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Button, ButtonVariant } from "@components";
import { SocketDisconnectionReasons } from "@constants";

import { getContentByDisconnectionReason } from "./utils";

const ErrorScreen = ({
  socketDisconnectionReason,
}: {
  socketDisconnectionReason: SocketDisconnectionReasons;
}) => {
  const { t } = useTranslation();
  if (!socketDisconnectionReason) return null;

  const {
    icon: Icon,
    titleKey,
    descriptionKey,
  } = getContentByDisconnectionReason(socketDisconnectionReason);

  return (
    <motion.div
      key={socketDisconnectionReason}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      }}
      className="flex flex-col justify-center items-center gap-4 w-80"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Icon stroke="#fff" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-white text-2xl text-center mt-1 font-secondary"
      >
        {t(titleKey)}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-white text-sm text-center mt-1 font-primary"
      >
        {t(descriptionKey)}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full text-center flex justify-center items-center gap-4 mt-1"
      >
        <Button
          variant={ButtonVariant.SECONDARY}
          className="text-white"
          fullWidth
          onClick={() => window.history.back()}
        >
          {t("audioCall.error.goBack")}
        </Button>
        <Button fullWidth onClick={() => window.location.reload()}>
          {t("audioCall.error.tryAgain")}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ErrorScreen;
