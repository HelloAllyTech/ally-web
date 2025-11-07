import React from "react";

export const SimulationSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="flex flex-row items-center justify-between w-[100%] border-b border-border-light px-4 py-3">
        <div className="w-[10%] rounded-lg overflow-hidden flex-shrink-0">
          <div className="w-full h-16 bg-neutral-200 rounded-lg"></div>
        </div>

        <div className="flex flex-col w-[35%] px-4">
          <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-full mb-1"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
        </div>

        <div className="w-[12%] px-4">
          <div className="h-4 bg-neutral-200 rounded w-20"></div>
        </div>

        <div className="w-[11%] px-4">
          <div className="h-4 bg-neutral-200 rounded w-16"></div>
        </div>

        <div className="w-[10%] px-4">
          <div className="h-6 bg-neutral-200 rounded w-16"></div>
        </div>

        <div className="w-[10%] px-4">
          <div className="h-4 bg-neutral-200 rounded w-12"></div>
        </div>

        <div className="w-[12%] px-4">
          <div className="h-4 bg-neutral-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
};

export const SimulationListSkeleton: React.FC = () => {
  const renderTableHeaderSkeleton = () => {
    return (
      <div className="animate-pulse">
        <div className="flex flex-row items-center justify-between w-[100%] border-b border-border-light px-4 py-2">
          <div className="w-[45%]">
            <div className="h-4 bg-neutral-200 rounded w-20"></div>
          </div>
          <div className="w-[12%] px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          <div className="w-[11%] px-4">
            <div className="h-4 bg-neutral-200 rounded w-20"></div>
          </div>
          <div className="w-[10%] px-4">
            <div className="h-4 bg-neutral-200 rounded w-12"></div>
          </div>
          <div className="w-[10%] px-4">
            <div className="h-4 bg-neutral-200 rounded w-12"></div>
          </div>
          <div className="w-[12%] px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {renderTableHeaderSkeleton()}
      {Array.from({ length: 10 }).map((_, index) => (
        <SimulationSkeleton key={index} />
      ))}
    </div>
  );
};
