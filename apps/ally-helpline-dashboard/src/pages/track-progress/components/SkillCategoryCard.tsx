import { FC } from "react";

import { useTranslation } from "react-i18next";

import { CustomCircularProgress } from "@components";
import { TrackSkillCategoryFeedback } from "@types";

interface SkillCategoryCardProps {
  skill: TrackSkillCategoryFeedback;
}

const BADGE_CLASSES: Record<TrackSkillCategoryFeedback["classification"], string> = {
  demonstrated: "bg-success-50 text-success-800",
  needs_practice: "bg-warning-50 text-warning-700",
  insufficient_data: "bg-neutral-100 text-typography-700",
};

// success/warning are static hex in tailwind.config.ts (unlike primary/neutral,
// which are CSS custom properties for theming) — matched literally here since
// CustomCircularProgress takes a raw color, not a Tailwind class.
const RING_COLOR: Record<TrackSkillCategoryFeedback["classification"], string> = {
  demonstrated: "#4CAF50",
  needs_practice: "#FF9800",
  insufficient_data: "rgb(var(--color-neutral-400))",
};

/** One skill category's rollup: label, ring, and a classification badge. */
export const SkillCategoryCard: FC<SkillCategoryCardProps> = ({ skill }) => {
  const { t } = useTranslation();
  const isInsufficient = skill.classification === "insufficient_data";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-light p-3">
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <div className="absolute inset-0 [&_svg]:!h-full [&_svg]:!w-full">
          <CustomCircularProgress
            value={isInsufficient ? 0 : (skill.averagePercentage ?? 0)}
            color={RING_COLOR[skill.classification]}
          />
        </div>
        {!isInsufficient && (
          <span className="text-[11px] font-semibold text-typography-900">
            {skill.averagePercentage}%
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-typography-900">{skill.category}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[skill.classification]}`}
        >
          {t(`tracks2.progressDashboard.classification.${skill.classification}`)}
        </span>
      </div>
    </div>
  );
};
