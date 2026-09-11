import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { TrackRoleplaySessionFeedback } from "@types";

const PREVIEW_LENGTH = 220;

/**
 * Plain-text preview of a judge's markdown feedback: strips the common
 * markdown markers rather than rendering them, and cuts at a word boundary —
 * a mid-token cut (e.g. an unterminated `**`) would render broken formatting
 * if this were passed to a real markdown renderer, so this is deliberately
 * plain text with a link to the full, properly-rendered feedback instead.
 */
const previewText = (markdown: string): string => {
  const plain = markdown
    .replace(/^#+\s*/gm, "")
    .replace(/^-\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= PREVIEW_LENGTH) return plain;
  const cut = plain.slice(0, PREVIEW_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : PREVIEW_LENGTH)}…`;
};

interface LatestFeedbackPreviewProps {
  session: TrackRoleplaySessionFeedback;
}

/** The most recent evaluated session's feedback, previewed inline with a link out to the full page. */
export const LatestFeedbackPreview: FC<LatestFeedbackPreviewProps> = ({ session }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!session.evaluationMarkdown) return null;

  return (
    <div className="rounded-xl border border-border-light p-4">
      <h3 className="mb-1 text-sm font-semibold text-typography-900">
        {t("tracks2.progressDashboard.latestFeedbackHeading")}
      </h3>
      <p className="mb-2 text-sm text-typography-700">{previewText(session.evaluationMarkdown)}</p>
      <button
        onClick={() => navigate(`/simulation-summary/${session.scenarioSessionId}`)}
        className="text-sm font-medium text-primary-500 hover:text-primary-600"
      >
        {t("tracks2.progressDashboard.readFullFeedback")}
      </button>
    </div>
  );
};
