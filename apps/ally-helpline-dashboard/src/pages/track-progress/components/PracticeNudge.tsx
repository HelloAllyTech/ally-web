import { FC } from "react";

import { useTranslation } from "react-i18next";

import { TrackSkillCategoryFeedback } from "@types";

interface PracticeNudgeProps {
  skillCategories: TrackSkillCategoryFeedback[];
  onContinuePress: () => void;
}

/**
 * Points at the single weakest `needs_practice` category (if any) with a CTA
 * back into the course. There is no per-item mapping from a skill category to
 * "the roleplay that covers it" — categories are aggregated across every
 * roleplay in the course, not tagged per item — so the honest action is
 * "keep practicing this course" via the same next-item flow Track Overview's
 * Start/Continue button already uses, not a claim of surgical targeting.
 */
export const PracticeNudge: FC<PracticeNudgeProps> = ({ skillCategories, onContinuePress }) => {
  const { t } = useTranslation();

  const weakest = skillCategories
    .filter(skill => skill.classification === "needs_practice")
    .sort((a, b) => (a.averagePercentage ?? 0) - (b.averagePercentage ?? 0))[0];

  if (!weakest) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-50 p-4">
      <p className="text-sm text-typography-900">
        {t("tracks2.progressDashboard.practiceNudge", { category: weakest.category })}
      </p>
      <button
        onClick={onContinuePress}
        className="whitespace-nowrap rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
      >
        {t("common.continue")}
      </button>
    </div>
  );
};
