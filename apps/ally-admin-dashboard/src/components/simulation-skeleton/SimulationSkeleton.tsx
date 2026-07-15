import React from "react";

// Placeholder blocks mirror DataList's redesigned card layout (first column +
// metadata grid that flattens to a row at lg) so real data loads in without
// layout shift.
export const SimulationSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-center w-full border-b border-border-light px-4 py-3 gap-3 lg:gap-0">
        {/* Thumbnail + Title/Description */}
        <div className="flex flex-row items-center gap-3 w-full lg:w-[22%] shrink-0">
          <div className="w-[100px] h-[50px] bg-neutral-200 rounded-lg flex-shrink-0"></div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
          </div>
        </div>

        {/* Metadata cells */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row gap-x-4 gap-y-3 lg:gap-0 lg:flex-1 lg:items-center lg:justify-between">
          <div className="lg:w-[10%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          <div className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-20"></div>
          </div>
          <div className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          <div className="lg:w-[9%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
          <div className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-6 bg-neutral-200 rounded w-16"></div>
          </div>
          <div data-testid="skeleton-progress" className="w-[12%] max-lg:w-auto shrink-0 lg:px-4">
            <div className="h-2 bg-neutral-200 rounded-full w-full"></div>
          </div>
          <div data-testid="skeleton-participants" className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-10"></div>
          </div>
          <div className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-12"></div>
          </div>
          <div className="lg:w-[8%] shrink-0 lg:px-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SimulationListSkeleton: React.FC = () => {
  const renderTableHeaderSkeleton = () => {
    return (
      <div className="animate-pulse">
        <div className="hidden lg:flex flex-row items-center w-full border-b border-border-light px-4 py-2">
          <div className="w-[22%] shrink-0">
            <div className="h-4 bg-neutral-200 rounded w-20"></div>
          </div>
          <div className="flex flex-row flex-1 items-center justify-between">
            <div className="w-[10%] shrink-0 px-4"></div>
            <div className="w-[8%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-16"></div>
            </div>
            <div className="w-[8%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-16"></div>
            </div>
            <div className="w-[9%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-16"></div>
            </div>
            <div className="w-[8%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-12"></div>
            </div>
            <div className="w-[12%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-14"></div>
            </div>
            <div className="w-[8%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-16"></div>
            </div>
            <div className="w-[8%] shrink-0 px-4">
              <div className="h-4 bg-neutral-200 rounded w-12"></div>
            </div>
            <div className="w-[8%] shrink-0 px-4"></div>
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
