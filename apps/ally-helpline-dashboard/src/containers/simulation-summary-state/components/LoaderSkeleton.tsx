import { FC } from "react";

export const LoaderSkeleton: FC = () => (
  <div className="w-full h-full bg-white p-6 overflow-hidden">
    {/* Top Section - Header */}
    <div className="mb-8">
      {/* Main header bar */}
      <div className="w-1/2 h-3 bg-gray-200 rounded mb-4 animate-pulse mx-3"></div>

      {/* Two shorter bars on left */}

      <div className="flex items-center gap-5 p-4">
        <div className="w-[150px] h-[77px] bg-gray-200 rounded animate-pulse"></div>
        <div className="flex flex-col gap-1 font-primary">
          <div className="w-56 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-64 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-56 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col p-4 ">
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
        </div>
        <div className="flex flex-col p-4 ">
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="w-full h-5 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);
