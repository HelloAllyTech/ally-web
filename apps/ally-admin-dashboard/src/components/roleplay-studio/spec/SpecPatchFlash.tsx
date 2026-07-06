import React, { useMemo } from "react";

import { motion } from "framer-motion";
import { useSelector } from "react-redux";

import { selectRoleplaySpecState } from "@reducer";

/** Only flash patches applied within this window (guards against remounts). */
const FLASH_WINDOW_MS = 6_000;

interface SpecPatchFlashProps {
  /** Top-level spec keys this wrapper watches (e.g. ["persona", "title"]). */
  sections: string[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Highlights its children with a brief background flash whenever a streamed
 * copilot patch touches one of the watched spec sections. Re-keyed on each
 * matching patch so the animation replays.
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

  const shouldFlash = Boolean(lastTouch && Date.now() - lastTouch.appliedAt < FLASH_WINDOW_MS);

  return (
    <motion.div
      key={shouldFlash && lastTouch ? `${lastTouch.patchId}-${lastTouch.appliedAt}` : "static"}
      initial={shouldFlash ? { backgroundColor: "rgba(99, 102, 241, 0.12)" } : false}
      animate={{ backgroundColor: "rgba(99, 102, 241, 0)" }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      className={`rounded-lg ${className}`}
      data-testid="spec-patch-flash"
    >
      {children}
    </motion.div>
  );
};
