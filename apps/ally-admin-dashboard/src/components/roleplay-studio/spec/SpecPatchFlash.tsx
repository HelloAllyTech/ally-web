import React, { useMemo } from "react";

import { motion } from "framer-motion";
import { useSelector } from "react-redux";

import { selectRoleplaySpecState } from "@reducer";

interface SpecPatchFlashProps {
  /** Top-level spec keys this wrapper watches (e.g. ["persona", "title"]). */
  sections: string[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Highlights its children with a brief background flash whenever a streamed
 * copilot patch touches one of the watched spec sections. The wrapper is
 * re-keyed per matching patch, so each new patch replays the animation
 * (framer-motion runs initial -> animate once per key).
 */
export const SpecPatchFlash: React.FC<SpecPatchFlashProps> = ({
  sections,
  children,
  className = "",
}) => {
  const { patchLog } = useSelector(selectRoleplaySpecState);

  const lastTouch = useMemo(() => {
    for (let i = patchLog.length - 1; i >= 0; i--) {
      const entry = patchLog[i];
      if (entry.failed) continue;
      if (entry.touchedSections.some(section => sections.includes(section))) return entry;
    }
    return null;
  }, [patchLog, sections]);

  return (
    <motion.div
      key={lastTouch ? `${lastTouch.patchId}-${lastTouch.appliedAt}` : "static"}
      initial={lastTouch ? { backgroundColor: "rgba(99, 102, 241, 0.12)" } : false}
      animate={{ backgroundColor: "rgba(99, 102, 241, 0)" }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      className={`rounded-lg ${className}`}
      data-testid="spec-patch-flash"
    >
      {children}
    </motion.div>
  );
};
