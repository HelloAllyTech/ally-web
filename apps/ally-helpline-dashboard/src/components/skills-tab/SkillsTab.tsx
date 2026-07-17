import { FC, useMemo } from "react";

import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useGetSimulationSkillsQuery, useGetSimulationSummaryQuery } from "@api";
import { OverallScoreMeter } from "@src/components";
import { SKILL_COLORS } from "@src/components/skills-tab/constants";
import { SimulationSummary } from "@src/types";

import type { TFunction } from "i18next";

interface SkillCoverage {
  label: string;
  icon: string;
  percentage: number;
  color: string;
}

interface EmotionalDataPoint {
  time: string;
  level: number;
  seconds?: number;
  isOriginal?: boolean;
}

interface SkillsTabProps {
  sessionId?: string;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: EmotionalDataPoint;
}

const CHART_HEIGHT = 350;
const CHART_MARGIN = { top: 20, right: 20, left: 0, bottom: 20 };
const Y_AXIS_TICKS = [-5, -3, -1, 1, 3, 5];

// Skill categories come from the backend as canonical English names (also used
// as identifiers/colors), so we translate only the DISPLAY label via a fixed
// i18n map, falling back to the raw category when it isn't a known skill.
const SKILL_LABEL_I18N: Record<string, string> = {
  "Listening Engagement": "postSim.skills.categories.listeningEngagement",
  "Emotional Attunement": "postSim.skills.categories.emotionalAttunement",
  "Supportive Engagement": "postSim.skills.categories.supportiveEngagement",
};

const getSkillLabel = (t: TFunction, category: string): string => {
  const key = SKILL_LABEL_I18N[category];
  return key ? t(key, { defaultValue: category }) : category;
};

// Utility Functions
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const calculateTimeTicks = (data: EmotionalDataPoint[]): string[] | undefined => {
  if (!data.length) return undefined;

  const NUM_TICKS = 5;
  const lastTime = data[data.length - 1].time;

  // Parse last time to get total seconds
  const [lastMinutes, lastSeconds] = lastTime.split(":").map(Number);
  const totalSeconds = lastMinutes * 60 + lastSeconds;

  // Calculate interval between ticks
  const interval = totalSeconds / (NUM_TICKS - 1);

  const ticks: string[] = [];

  for (let i = 0; i < NUM_TICKS; i++) {
    const seconds = Math.round(i * interval);
    ticks.push(formatTime(seconds));
  }

  return ticks;
};

// Components
const CustomDot: FC<CustomDotProps> = ({ cx, cy, payload }) => {
  // Only show dot for original data points, not interpolated ones
  if (cx === undefined || cy === undefined || !payload?.isOriginal) return null;
  return <circle cx={cx} cy={cy} r={3} fill="#FFF" stroke="#7FBA7A" strokeWidth={2} />;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: EmotionalDataPoint }>;
  label?: number;
}

const ChartTooltip: FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-[#B39DDB] rounded-md text-typography-900 font-medium shadow-lg px-3 py-2 text-sm font-primary">
      <div>Time: {point.time}</div>
      <div>Level: {point.level}</div>
    </div>
  );
};

const LoadingState: FC = () => (
  <div className="w-full flex flex-col p-4 border border-gray-200 rounded-lg animate-pulse">
    <div className="h-7 bg-gray-200 rounded w-64 mb-2"></div>
    <hr className="mb-5 mt-2 border-gray-200" />

    <div className="bg-white border border-[#B39DDB] rounded-md mb-5">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#B39DDB]">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-6 py-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-200 rounded w-20"></div>
              <div className="h-5 bg-gray-200 rounded w-10"></div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white border border-[#B39DDB] rounded-md">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
      </div>
      <div className="px-6 py-6">
        <div className="w-full h-[350px] bg-gray-100 rounded-md flex items-center justify-center">
          <div className="space-y-4 w-full px-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-1 bg-gray-200 rounded-full flex-1"></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ErrorState: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center p-12">
      <div className="text-typography-700 font-primary text-lg">{t("postSim.skills.failed")}</div>
    </div>
  );
};

const EmptyState: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center p-12 text-typography-700 font-primary text-lg">
      {t("postSim.skills.empty")}
    </div>
  );
};

const getSkillOverallPercentage = (skills: SkillCoverage[]): number => {
  return skills.reduce((acc, skill) => acc + skill.percentage, 0) / skills.length;
};

const SkillCoverageCard: FC<{ skills: SkillCoverage[] }> = ({ skills }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#B39DDB] rounded-sm mb-5">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-primary font-medium text-typography-900">
          {t("postSim.skills.coverage")}
        </h3>
      </div>
      <div className="flex p-6 gap-6">
        <div className="w-1/3 flex items-center justify-center">
          <OverallScoreMeter percentage={getSkillOverallPercentage(skills)} />
        </div>
        <div className="flex flex-col gap-3 w-2/3">
          {skills.map(skill => (
            <div key={skill.label} className="px-6 border rounded-sm py-5 flex w-full gap-2.5">
              <div className="min-w-10 w-10 h-10 rounded-sm border flex items-center justify-center">
                <img
                  src={skill.icon}
                  alt={getSkillLabel(t, skill.label)}
                  className="w-1/2 h-1/2 object-contain"
                />
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-normal font-primary text-typography-700">
                    {getSkillLabel(t, skill.label)}
                  </span>
                  <span className="text-sm font-semibold font-primary text-typography-900">
                    {skill.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${skill.percentage}%`,
                      backgroundColor: skill.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper to parse time string to seconds
const parseTimeToSeconds = (time: string): number => {
  const [minutes, seconds] = time.split(":").map(Number);
  return minutes * 60 + seconds;
};

const EmotionalMovementChart: FC<{
  data: EmotionalDataPoint[];
  timeTicks: string[] | undefined;
}> = ({ data, timeTicks }) => {
  const { t } = useTranslation();
  // Create chart data with numeric time values for equal spacing
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return [];
    }

    // Convert all data points to include numeric seconds value
    return data.map(point => ({
      ...point,
      seconds: parseTimeToSeconds(point.time),
      isOriginal: true,
    }));
  }, [data]);

  // Convert timeTicks to numeric seconds for X-axis
  const numericTimeTicks = useMemo(() => {
    if (!timeTicks || timeTicks.length === 0) return undefined;
    return timeTicks.map(parseTimeToSeconds);
  }, [timeTicks]);

  return (
    <div className="bg-white border border-[#B39DDB] rounded-md mb-5">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-medium font-primary text-typography-900">
          {t("postSim.skills.distressAlleviation")}
        </h3>
      </div>
      <div className="px-6 py-6">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E5E5"
              vertical={true}
              horizontal={true}
              syncWithTicks={true}
            />
            <XAxis
              dataKey="seconds"
              type="number"
              axisLine={{ stroke: "#666666", strokeWidth: 1 }}
              tickLine={{ stroke: "#666666", strokeWidth: 1 }}
              ticks={numericTimeTicks}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              tickFormatter={(seconds: number) => formatTime(seconds)}
              domain={
                numericTimeTicks && numericTimeTicks.length > 0
                  ? [numericTimeTicks[0], numericTimeTicks[numericTimeTicks.length - 1]]
                  : ["dataMin", "dataMax"]
              }
              label={{
                value: t("postSim.skills.timeline"),
                position: "bottom",
                offset: 10,
                style: { fill: "#6B7280", fontSize: 12, fontFamily: "IBM_Plex_Serif" },
              }}
            />
            <YAxis
              domain={[-5, 5]}
              ticks={Y_AXIS_TICKS}
              axisLine={{ stroke: "#000000", strokeWidth: 1 }}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              label={{
                value: t("postSim.skills.level"),
                angle: -90,
                position: "insideLeft",
                style: {
                  fill: "#6B7280",
                  fontSize: 12,
                  textAnchor: "middle",
                  fontFamily: "IBM_Plex_Serif",
                },
              }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ strokeWidth: 0 }}
              isAnimationActive={false}
              animationDuration={0}
            />
            <Line
              type="monotone"
              dataKey="level"
              stroke="#7FBA7A"
              strokeWidth={2.5}
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StrengthAndSkills = ({ summary }: { summary: SimulationSummary }) => {
  const { t } = useTranslation();
  const strengths = summary?.details?.summary?.feedback?.positives || [];

  return (
    <div className="bg-white border border-[#B39DDB] rounded-md mb-5">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-medium font-primary text-typography-900">
          {t("postSim.skills.strengths")}
        </h3>
      </div>
      <div className="px-6 py-6">
        {strengths.length === 0 ? (
          <p className="text-typography-700 font-primary text-center animate-pulse">
            {t("postSim.feedback.generating", "Generating your feedback…")}
          </p>
        ) : (
          strengths.map((strength, index) => (
            <li key={index} className="flex items-start">
              <span className="text-typography-900 mr-2">•</span>
              <span className="text-typography-900 font-primary text-base">{strength}</span>
            </li>
          ))
        )}
      </div>
    </div>
  );
};

const AreasForGrowth = ({ summary }: { summary: SimulationSummary }) => {
  const { t } = useTranslation();
  const feedback = summary?.details?.summary?.feedback;
  const hasValidAreasOfGrowth =
    Array.isArray(feedback?.areasOfGrowth) &&
    feedback.areasOfGrowth.length > 0 &&
    feedback.areasOfGrowth.some(
      (item: { improvement?: string; recommendation?: string }) =>
        (item.improvement ?? "").trim() !== "" || (item.recommendation ?? "").trim() !== "",
    );
  const areasForGrowth =
    (hasValidAreasOfGrowth ? feedback?.areasOfGrowth : feedback?.improvements) || [];

  return (
    <div className="bg-white border border-[#B39DDB] rounded-md">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-medium font-primary text-typography-900">
          {t("postSim.skills.areasForGrowth")}
        </h3>
      </div>
      {areasForGrowth.length === 0 ? (
        <div className="px-6 py-6">
          <p className="text-typography-700 font-primary text-center animate-pulse">
            {t("postSim.feedback.generating", "Generating your feedback…")}
          </p>
        </div>
      ) : (
        <ul className="px-6 py-6 space-y-6 list-none">
          {areasForGrowth?.map((area, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-typography-900 mr-2">•</span>
              <div className="flex flex-col gap-2 w-full">
                <span className="text-typography-900 font-primary text-base">
                  {area.improvement || area}
                </span>
                {area.recommendation && (
                  <div className="text-typography-900 bg-[#FFF3E080] border-l-[1px] border-l-[#FFA726] flex flex-col gap-1 pl-2 py-2">
                    <span className="text-[#E65100] tracking-[2px] text-xs font-medium font-tertiary">
                      {t("postSim.skills.recommended")}
                    </span>
                    <span className="text-typography-900 text-base font-primary">
                      {area.recommendation}
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Main Component
export const SkillsTab: FC<SkillsTabProps> = ({ sessionId }) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useGetSimulationSkillsQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId },
  );

  const { data: summary } = useGetSimulationSummaryQuery(
    { sessionId: sessionId || "", languageCode: i18n.language },
    { skip: !sessionId },
  );

  const skillCoverages = useMemo<SkillCoverage[]>(() => {
    if (!data?.skillCoverage) return [];
    return data.skillCoverage.map((skill, index) => ({
      label: skill.category,
      percentage: Math.round(skill.percentage),
      icon: skill.iconUrl,
      color: SKILL_COLORS[index] || "#6B7280",
    }));
  }, [data?.skillCoverage]);

  const emotionalData = useMemo<EmotionalDataPoint[]>(() => {
    if (!data?.emotionalMovement) return [];
    return data.emotionalMovement.map(item => ({
      time: formatTime(item.startTime),
      level: item.level,
    }));
  }, [data?.emotionalMovement]);

  const timeTicks = useMemo(() => calculateTimeTicks(emotionalData), [emotionalData]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
        <LoadingState />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-y-auto">
        <ErrorState />
      </div>
    );
  }

  const hasSkillData = skillCoverages.length > 0;
  const hasEmotionalData = emotionalData.length > 0;
  const hasNoData = !hasSkillData && !hasEmotionalData;
  const simulationMode = summary?.scenario?.metadata?.experienceMode;
  const isChecklistMode = simulationMode === "CHECKLIST";

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-lg border border-gray-200 p-4 custom-scrollbar">
      <h2 className="text-base font-medium font-primary text-typography-900">
        {t("postSim.tabs.skillsDemonstrated")}
      </h2>
      <hr className="mb-5 mt-2 border-gray-200" />

      {summary && isChecklistMode && (
        <>
          <StrengthAndSkills summary={summary} />
          <AreasForGrowth summary={summary} />
        </>
      )}
      {hasSkillData && <SkillCoverageCard skills={skillCoverages} />}
      {hasEmotionalData && <EmotionalMovementChart data={emotionalData} timeTicks={timeTicks} />}
      {hasNoData && <EmptyState />}
    </div>
  );
};
