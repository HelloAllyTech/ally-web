import { FC } from "react";

import { useTranslation } from "react-i18next";

import { TrackRoleplaySessionFeedback } from "@types";

interface ScoreTrendSparklineProps {
  /** Oldest-first, same order the dashboard already returns. */
  sessions: TrackRoleplaySessionFeedback[];
}

const WIDTH = 240;
const HEIGHT = 56;
const PADDING_X = 6;
const PADDING_Y = 10;
const END_DOT_RADIUS = 4;

/**
 * Minimal single-series trend line of compositeScore across evaluated
 * sessions, oldest to latest. Ordinal x-spacing (not time-scaled) — this is a
 * sparkline showing direction, not a calendar chart. Renders nothing below 2
 * points: a single score has no trend to draw, and showing a lone dot as a
 * "trend" would overclaim what one session can say (same reasoning as the
 * skill-category insufficient_data threshold elsewhere on this page).
 */
export const ScoreTrendSparkline: FC<ScoreTrendSparklineProps> = ({ sessions }) => {
  const { t } = useTranslation();
  const scores = sessions
    .map(s => s.compositeScore)
    .filter((score): score is number => score !== null);

  if (scores.length < 2) return null;

  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_Y * 2;
  const points = scores.map((score, index) => {
    const x = PADDING_X + (index / (scores.length - 1)) * plotWidth;
    const y = PADDING_Y + (1 - score / 100) * plotHeight;
    return { x, y, score };
  });

  const linePath = points.map(p => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];
  const first = scores[0];
  const latest = scores[scores.length - 1];

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={t("tracks2.progressDashboard.scoreTrendAlt", {
          first,
          latest,
          count: scores.length,
        })}
        className="text-primary-500"
      >
        <polyline
          points={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, index) => (
          <circle key={index} cx={p.x} cy={p.y} r={1.5} fill="currentColor" opacity={0.35}>
            <title>{t("tracks2.progressDashboard.sessionScore", { score: p.score })}</title>
          </circle>
        ))}
        <circle
          cx={last.x}
          cy={last.y}
          r={END_DOT_RADIUS}
          fill="currentColor"
          stroke="white"
          strokeWidth={2}
        >
          <title>{t("tracks2.progressDashboard.sessionScore", { score: last.score })}</title>
        </circle>
      </svg>
      <span className="whitespace-nowrap text-sm font-medium text-typography-900">
        {t("tracks2.progressDashboard.latestScore", { score: latest })}
      </span>
    </div>
  );
};
