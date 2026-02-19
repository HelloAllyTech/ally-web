import { FC, useMemo } from "react";

import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

import { useGetSimulationSkillsQuery } from "@api";

interface SkillCoverage {
  label: string;
  percentage: number;
  color: string;
}

interface EmotionalDataPoint {
  time: string;
  level: number;
}

interface SkillsTabProps {
  sessionId?: string;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
}

// Constants
const SKILL_COLORS: Record<string, string> = {
  Learning: "#5B8DEF",
  Support: "#7FBA7A",
  Standards: "#F5A962",
};

const CHART_HEIGHT = 350;
const CHART_MARGIN = { top: 20, right: 20, left: 0, bottom: 20 };
const Y_AXIS_TICKS = [0, 3, 6, 10];

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
const CustomDot: FC<CustomDotProps> = ({ cx, cy }) => {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={3} fill="#FFF" stroke="#7FBA7A" strokeWidth={2} />;
};

const LoadingState: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center p-12">
      <div className="text-gray-500">{t("postSim.skills.loading")}</div>
    </div>
  );
};

const ErrorState: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center p-12">
      <div className="text-red-500">{t("postSim.skills.failed")}</div>
    </div>
  );
};

const EmptyState: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center p-12 text-gray-500">
      {t("postSim.skills.empty")}
    </div>
  );
};

const SkillCoverageCard: FC<{ skills: SkillCoverage[] }> = ({ skills }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#B39DDB] rounded-md mb-5">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-medium text-typography-900">
          {t("postSim.skills.coverage")}
        </h3>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#B39DDB]">
        {skills.map(skill => (
          <div key={skill.label} className="px-6 py-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-normal font-primary text-typography-700">
                {skill.label}
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
        ))}
      </div>
    </div>
  );
};

const EmotionalMovementChart: FC<{
  data: EmotionalDataPoint[];
  timeTicks: string[] | undefined;
}> = ({ data, timeTicks }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#B39DDB] rounded-md">
      <div className="px-4 py-3 border-b border-b-[#B39DDB] bg-[#EDE7F680]">
        <h3 className="text-base font-medium font-primary text-typography-900">
          {t("postSim.skills.emotionalMovement")}
        </h3>
      </div>
      <div className="px-6 py-6">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E5E5"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="time"
              axisLine={{ stroke: "#666666", strokeWidth: 1 }}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              {...(timeTicks && timeTicks.length > 0
                ? { ticks: timeTicks }
                : { interval: "preserveStartEnd" })}
              label={{
                value: t("postSim.skills.timeline"),
                position: "bottom",
                offset: 10,
                style: { fill: "#6B7280", fontSize: 12 },
              }}
            />
            <YAxis
              domain={[0, 10]}
              ticks={Y_AXIS_TICKS}
              axisLine={{ stroke: "#000000", strokeWidth: 1 }}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              label={{
                value: t("postSim.skills.level"),
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6B7280", fontSize: 12, textAnchor: "middle" },
              }}
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

// Main Component
export const SkillsTab: FC<SkillsTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetSimulationSkillsQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId },
  );

  const skillCoverages = useMemo<SkillCoverage[]>(() => {
    if (!data?.skillCoverage) return [];
    return data.skillCoverage.map(skill => ({
      label: skill.category,
      percentage: Math.round(skill.percentage),
      color: SKILL_COLORS[skill.category] || "#6B7280",
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

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const hasSkillData = skillCoverages.length > 0;
  const hasEmotionalData = emotionalData.length > 0;
  const hasNoData = !hasSkillData && !hasEmotionalData;

  return (
    <div className="w-full flex flex-col p-4 border border-gray-200 rounded-lg">
      <h2 className="text-lg font-medium font-primary text-typography-900">
        {t("postSim.skills.shownInSession")}
      </h2>
      <hr className="mb-5 mt-2 border-gray-200" />

      {hasSkillData && <SkillCoverageCard skills={skillCoverages} />}
      {hasEmotionalData && <EmotionalMovementChart data={emotionalData} timeTicks={timeTicks} />}
      {hasNoData && <EmptyState />}
    </div>
  );
};
