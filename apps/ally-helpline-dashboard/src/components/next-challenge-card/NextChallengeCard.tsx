import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button, ButtonVariant } from "@components";
import { ROUTES } from "@constants";
import { NextChallengeRecommendation } from "@utils";

interface NextChallengeCardProps {
  recommendation: NextChallengeRecommendation;
}

export const NextChallengeCard: FC<NextChallengeCardProps> = ({ recommendation }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { scenario, reason, difficulty } = recommendation;

  if (!scenario?.id) return null;

  const difficultyLabel = t(`postSim.nextChallenge.difficulty.${difficulty}`);

  return (
    <div
      data-testid="next-challenge-card"
      className="flex w-full items-center gap-4 rounded-[8px] border border-border-light bg-background-secondary p-3 font-primary"
    >
      {scenario.coverImageUrl && (
        <img
          src={scenario.coverImageUrl}
          alt={scenario.title}
          className="hidden h-[54px] w-[96px] shrink-0 rounded-[6px] bg-secondary-100 object-cover sm:block"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-typography-800 font-tertiary">
            {t("postSim.nextChallenge.title")}
          </span>
          <span className="rounded-full bg-[#EDE7F6] px-2 py-0.5 text-xs text-typography-800">
            {difficultyLabel}
          </span>
        </div>
        <div className="truncate text-base font-medium text-typography-900">{scenario.title}</div>
        <div className="truncate text-sm font-normal text-typography-700">
          {t(`postSim.nextChallenge.reason.${reason}`, { difficulty: difficultyLabel })}
        </div>
      </div>
      <Button
        variant={ButtonVariant.PRIMARY}
        onClick={() => navigate(ROUTES.SCENARIO.replace(":scenarioId", String(scenario.id)))}
      >
        {t("postSim.nextChallenge.start")}
      </Button>
    </div>
  );
};
