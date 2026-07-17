import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { ArrowLeft, ArrowRight } from "@assets";

interface PlayerBottomNavProps {
  hasPrev: boolean;
  hasNext: boolean;
  /** Whether the current item's completion gate is satisfied. */
  canAdvance: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** True on the very last item — the Next button becomes "Finish". */
  isLastItem: boolean;
}

/**
 * Bottom navigation for the player: Prev on the left, Next on the right.
 * Next is disabled until the item reports completion, then pulses to draw
 * the eye.
 */
export const PlayerBottomNav: FC<PlayerBottomNavProps> = ({
  hasPrev,
  hasNext,
  canAdvance,
  onPrev,
  onNext,
  isLastItem,
}) => {
  const { t } = useTranslation();
  const nextDisabled = !canAdvance || (!hasNext && !isLastItem);
  const nextLabel = isLastItem ? t("tracks2.player.finish") : t("tracks2.player.next");

  return (
    <footer className="flex-shrink-0 border-t border-border-light bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-sm font-medium text-typography-800 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("tracks2.player.prev")}
        </button>

        <motion.button
          key={canAdvance ? "enabled" : "disabled"}
          onClick={onNext}
          disabled={nextDisabled}
          animate={
            canAdvance
              ? { scale: [1, 1.06, 1], transition: { duration: 0.4, ease: "easeOut" } }
              : { scale: 1 }
          }
          className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </footer>
  );
};
