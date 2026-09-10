import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ArrowRight } from "@assets";
import { TrackRoleplaySessionFeedback } from "@types";

interface RoleplaySessionRowProps {
  session: TrackRoleplaySessionFeedback;
}

/**
 * One evaluated (or pending) roleplay attempt. Deep-links out to the
 * existing Post-Simulation Summary page rather than re-rendering
 * evaluationMarkdown here.
 */
export const RoleplaySessionRow: FC<RoleplaySessionRowProps> = ({ session }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formattedDate = session.occurredAt
    ? new Date(session.occurredAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <button
      onClick={() => navigate(`/simulation-summary/${session.scenarioSessionId}`)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-light p-3 text-left transition-colors hover:bg-background-secondary"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-typography-900">
          {session.trackItemTitle ?? t("tracks2.progressDashboard.untitledSession")}
        </p>
        <p className="text-xs text-typography-700">
          {session.compositeScore !== null
            ? t("tracks2.progressDashboard.sessionScore", { score: session.compositeScore })
            : t("tracks2.progressDashboard.sessionPending")}
          {formattedDate ? ` · ${formattedDate}` : ""}
        </p>
      </div>
      <ArrowRight />
    </button>
  );
};
