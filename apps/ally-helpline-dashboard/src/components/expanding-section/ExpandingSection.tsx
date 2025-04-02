import { FC, useState, useEffect } from "react";
import { Skeleton } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

import { ExpandingSectionProps } from "./types";

const ExpandingSection: FC<ExpandingSectionProps> = ({
  children,
  loading = false,
  className = "",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!loading) {
      // Add a small delay to make the animation more noticeable
      timer = setTimeout(() => {
        setIsLoaded(true);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className={`w-full ${className}`}>
      <AnimatePresence mode="sync">
        {!isLoaded ? (
          <motion.div
            key="loading"
            initial={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4 p-[12px]">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: "20px" }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpandingSection; 