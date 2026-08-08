import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { StreakPill } from "@components";
import { usePostSessionStreak } from "@hooks";

export interface StreakMomentProps {
  /** False while the summary is still loading, or for a session too short to count. */
  enabled: boolean;
}

/**
 * "Streak extended to 5 days", shown once the just-finished session has actually
 * been credited.
 *
 * Inline rather than a modal, on purpose:
 *  - NavbarWrapper explicitly excludes this route from the badge modal and even
 *    suppresses its confetti, so a modal here would contradict a decision the
 *    product already made for this screen;
 *  - the page already auto-opens FeedbackDialog on mount, and a second dialog
 *    would stack on or race it.
 *
 * Division of labour with the badge modal: this owns the NUMBER, the modal owns
 * the BADGE. The next-badge line only renders while that badge is still
 * unearned, so when a session crosses a milestone this stays quiet and the
 * global modal celebrates it on the next route. Nothing fires twice.
 */
const StreakMoment: FC<StreakMomentProps> = ({ enabled }) => {
  const { t } = useTranslation();
  const { streak } = usePostSessionStreak(enabled);

  // Null while the async write is still in flight, and after the poll gives up.
  if (!streak) return null;

  const started = streak.streakEventToday === "STARTED";
  const showNextBadge = !!streak.nextMilestone && !streak.nextMilestone.alreadyEarned;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex w-full shrink-0 items-center gap-3 rounded-[8px] border border-border-light bg-primary-50 px-4 py-3"
      aria-live="polite"
    >
      <StreakPill
        days={streak.currentStreak}
        size="md"
        ariaLabel={t("practiceStreak.nav.value", { count: streak.currentStreak })}
      />
      <div className="min-w-0">
        <div className="font-secondary text-[15px] leading-tight text-typography-900">
          {started
            ? t("practiceStreak.postSession.started")
            : t("practiceStreak.postSession.extended", { count: streak.currentStreak })}
        </div>
        {showNextBadge && (
          <div className="mt-0.5 truncate text-[12px] text-typography-600">
            {t("practiceStreak.postSession.nextBadge", {
              count: streak.nextMilestone!.daysRemaining,
              badge: streak.nextMilestone!.badgeName,
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StreakMoment;
