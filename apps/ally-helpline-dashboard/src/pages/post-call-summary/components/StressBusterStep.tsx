import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Button, BoxBreathing } from "@components";

import { StressBusterProps } from "../types";

const StressBusterStep: FC<StressBusterProps> = ({ onProceed }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <div className="w-full aspect-video mb-4 rounded-3xl overflow-hidden">
        <BoxBreathing showViewSummaryButton onViewSummary={onProceed} />
      </div>
      <Button className="self-center" onClick={onProceed}>
        {t("stressBuster.viewCallSummary")}
      </Button>
    </motion.div>
  );
};

export default StressBusterStep;
