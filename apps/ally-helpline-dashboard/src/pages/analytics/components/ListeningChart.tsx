import { FC, useEffect, useState } from "react";

interface ListeningChartProps {
  listeningPercentage: number;
  className?: string;
}

const ListeningChart: FC<ListeningChartProps> = ({
  listeningPercentage,
  className = "",
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const animationDuration = 1000; // 1 second
    const steps = 60; // 60 steps for smooth animation
    const increment = listeningPercentage / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      if (currentStep < steps) {
        setAnimatedPercentage((prev) =>
          Math.min(prev + increment, listeningPercentage)
        );
        currentStep++;
      } else {
        clearInterval(timer);
      }
    }, animationDuration / steps);

    return () => clearInterval(timer);
  }, [listeningPercentage]);

  const talkingPercentage = 100 - animatedPercentage;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <h2 className="text-xl font-semibold text-[#081033]">
        Listening : Talking Distribution
      </h2>

      <div className="flex flex-col gap-2 mt-16">
        <div className="w-full h-12 flex rounded-lg overflow-hidden">
          <div
            className="bg-[#BBD6FF] flex items-center justify-start pl-4 transition-all duration-300 ease-out"
            style={{ width: `${animatedPercentage}%` }}
          >
            <span className="text-[#081033] font-medium">
              {Math.round(animatedPercentage)}%
            </span>
          </div>
          <div
            className="bg-[#5B7BAF] flex items-center justify-end pr-4 transition-all duration-300 ease-out"
            style={{ width: `${talkingPercentage}%` }}
          >
            <span className="text-white font-medium">
              {Math.round(talkingPercentage)}%
            </span>
          </div>
        </div>

        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#BBD6FF]" />
            <span className="text-sm text-[#4A4459]">Listening</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#5B7BAF]" />
            <span className="text-sm text-[#4A4459]">Talking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeningChart;
