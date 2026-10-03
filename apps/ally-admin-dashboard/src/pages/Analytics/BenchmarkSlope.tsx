import { CONTEXT, PALETTE } from "./chartScales";
import {
  FoundationalSkillsBenchmarkResponse,
  changeColor,
  level,
} from "./foundationalSkillsProgressChart";

/**
 * One line per learner from their first to their latest session of the SAME
 * benchmark scenario, with the group mean drawn over them — a paired slope
 * chart, the one form that shows both "did the average move" and "did most
 * people move the same way" without a statistic in between.
 *
 * Individual lines are faint context; the mean line carries the colour, and
 * only when the change is detectable (its interval excludes zero).
 */
export const BenchmarkSlope = ({
  data,
  height = 260,
}: {
  data: FoundationalSkillsBenchmarkResponse;
  height?: number;
}) => {
  const [lo, hi] = data.scoreDomain;
  const pad = 28;
  const w = 360;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  const xs = [pad + 40, w - pad - 40];
  const s = data.summary;
  const meanColor = changeColor({ change: s.change, detectable: s.detectable });
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      role="img"
      aria-label={`First vs latest benchmark composite for ${data.learners.length} learners`}
      className="w-full max-w-[520px]"
    >
      {[1, 2, 3, 4].map(t => (
        <g key={t}>
          <line
            x1={pad}
            x2={w - pad}
            y1={y(t)}
            y2={y(t)}
            stroke={CONTEXT.faint}
            strokeWidth={0.5}
          />
          <text x={pad - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill={CONTEXT.strong}>
            {t}
          </text>
        </g>
      ))}
      <text x={xs[0]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        First
      </text>
      <text x={xs[1]} y={height - 6} fontSize={11} textAnchor="middle" fill={CONTEXT.strong}>
        Latest
      </text>
      {data.learners.map(l => (
        <line
          key={l.id}
          x1={xs[0]}
          x2={xs[1]}
          y1={y(l.first.composite)}
          y2={y(l.latest.composite)}
          stroke={CONTEXT.line}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      ))}
      {s.firstAvg !== null && s.latestAvg !== null && (
        <>
          <line
            x1={xs[0]}
            x2={xs[1]}
            y1={y(s.firstAvg)}
            y2={y(s.latestAvg)}
            stroke={s.detectable ? meanColor : PALETTE.blue}
            strokeWidth={3}
          />
          <circle cx={xs[0]} cy={y(s.firstAvg)} r={4} fill={PALETTE.blue} />
          <circle cx={xs[1]} cy={y(s.latestAvg)} r={4} fill={PALETTE.blue} />
          <text
            x={xs[0] - 8}
            y={y(s.firstAvg) + 4}
            fontSize={11}
            textAnchor="end"
            fill={CONTEXT.strong}
          >
            {level(s.firstAvg)}
          </text>
          <text x={xs[1] + 8} y={y(s.latestAvg) + 4} fontSize={11} fill={CONTEXT.strong}>
            {level(s.latestAvg)}
          </text>
        </>
      )}
    </svg>
  );
};
