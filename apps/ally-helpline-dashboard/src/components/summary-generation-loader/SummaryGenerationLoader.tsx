import { FC } from "react";

import { SummaryGenerationLoaderProps } from "./types";

const SummaryGenerationLoader: FC<SummaryGenerationLoaderProps> = ({ text }) => {
  return (
    <div className="w-full h-full bg-white p-6 overflow-hidden">
      {/* Top Section - Header */}
      <div className="mb-8">
        {/* Main header bar */}
        <div className="w-full h-3 bg-gray-200 rounded mb-4 animate-pulse"></div>

        {/* Two shorter bars on left */}
        <div className="flex flex-row gap-4 mb-4">
          <div className="flex flex-col gap-2 mb-2 w-1/2">
            <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>

          <div className="flex flex-col gap-2 mb-2 w-1/2">
            <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-8 h-3 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-1/2 h-5 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-8 h-3 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-8 h-3 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-8 h-3 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4 mb-8 ml-2">
          <div className="w-8 h-3 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-2/3 h-5 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mr-4"></div>
          <div className="w-2/3 h-5 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-full h-5 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default SummaryGenerationLoader;
