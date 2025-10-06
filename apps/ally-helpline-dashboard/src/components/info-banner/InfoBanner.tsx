import { FC } from "react";

import { motion } from "framer-motion";

import { InfoBannerProps } from "./types";

const InfoBanner: FC<InfoBannerProps> = ({
  icon: Icon,
  message,
  messageClassName = "",
  wrapperClassName = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      data-testid="info-banner-wrapper"
      className={`p-[10px] mb-4 flex items-center gap-2 border-[0.5px] rounded-[8px] ${wrapperClassName}`}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Icon />
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className={`text-sm font-['Roboto'] font-medium ${messageClassName}`}
      >
        {message}
      </motion.span>
    </motion.div>
  );
};

export default InfoBanner;
