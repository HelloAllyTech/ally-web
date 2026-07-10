import { FC, useEffect } from "react";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export type CelebrationKind = "section" | "track";

interface CelebrationOverlayProps {
  kind: CelebrationKind | null;
  /** Completed-item count, shown on the track-complete card. */
  completedCount?: number;
  onContinue: () => void;
  onBackToLearn: () => void;
}

/** Reads a CSS custom property as an rgb() string; falls back to a hex. */
const cssVarColor = (name: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `rgb(${raw})` : fallback;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Celebratory overlay shown when a section (small) or the whole track
 * (bigger, with stats) completes. Fires a single confetti burst unless the
 * user prefers reduced motion.
 */
export const CelebrationOverlay: FC<CelebrationOverlayProps> = ({
  kind,
  completedCount,
  onContinue,
  onBackToLearn,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!kind || prefersReducedMotion()) return;
    const colors = [
      cssVarColor("--color-primary-500", "#6366F1"),
      cssVarColor("--color-primary-300", "#A5B4FC"),
      cssVarColor("--color-success-300", "#81C784"),
    ];
    confetti({
      particleCount: kind === "track" ? 160 : 90,
      spread: kind === "track" ? 100 : 70,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });
  }, [kind]);

  const isTrack = kind === "track";

  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="w-full max-w-sm rounded-[20px] bg-white p-6 text-center shadow-xl"
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3xl">
              {isTrack ? "🎉" : "✨"}
            </div>
            <h2 className="mb-1 text-xl font-bold text-typography-900">
              {isTrack
                ? t("tracks2.celebration.trackCompleteTitle")
                : t("tracks2.celebration.sectionCompleteTitle")}
            </h2>
            <p className="mb-5 text-sm text-typography-700">
              {isTrack
                ? t("tracks2.celebration.trackCompleteBody")
                : t("tracks2.celebration.sectionCompleteBody")}
            </p>

            {isTrack && completedCount !== undefined && (
              <div className="mb-5 rounded-[12px] bg-neutral-50 py-3 text-sm font-medium text-typography-800">
                {t("tracks2.celebration.itemsCompleted", { count: completedCount })}
              </div>
            )}

            {isTrack ? (
              <button
                onClick={onBackToLearn}
                className="w-full rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                {t("tracks2.celebration.backToLearn")}
              </button>
            ) : (
              <button
                onClick={onContinue}
                className="w-full rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                {t("tracks2.celebration.continue")}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
