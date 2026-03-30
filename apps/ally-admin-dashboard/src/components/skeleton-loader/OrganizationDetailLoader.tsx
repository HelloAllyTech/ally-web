import React from "react";

type OrganizationDetailLoaderProps = {
  rows?: number;
};

export const OrganizationDetailLoader: React.FC<OrganizationDetailLoaderProps> = ({
  rows = 10,
}) => {
  return (
    <div className="flex flex-col font-primary h-[100vh] overflow-hidden animate-pulse">
      <div className="space-y-6 flex-shrink-0">
        {/* Breadcrumbs Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="h-4 bg-neutral-200 rounded w-24" />
            <div className="h-4 bg-neutral-200 rounded w-2" />
            <div className="h-4 bg-neutral-200 rounded w-32" />
          </div>
        </div>

        {/* Organization Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 bg-neutral-200 rounded w-48" />
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 bg-neutral-200 rounded w-20" />
              <div className="h-4 bg-neutral-200 rounded w-1" />
              <div className="h-4 bg-neutral-200 rounded w-24" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-border-light">
          <div className="flex space-x-8">
            <div className="py-3">
              <div className="h-6 bg-neutral-200 rounded w-24" />
            </div>
            <div className="py-3">
              <div className="h-6 bg-neutral-200 rounded w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content Skeleton */}
      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        <div className="flex flex-col h-full">
          {/* Search Bar Skeleton */}
          <div className="sticky top-0 z-10 bg-white pb-2">
            <div className="h-10 bg-neutral-200 rounded w-full" />
          </div>

          {/* Table Header Skeleton */}
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-10 bg-white">
            <div className="col-span-11">
              <div className="h-4 bg-neutral-200 rounded w-24" />
            </div>
            <div className="col-span-1 pr-8">
              <div className="h-4 bg-neutral-200 rounded w-16" />
            </div>
          </div>

          {/* Simulation Cards Skeleton */}
          <div className="flex-1">
            {Array.from({ length: rows }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 py-4 pr-4 border-b border-border-light h-[80px]"
              >
                {/* Image Skeleton */}
                <div className="w-[18%] md:w-[10%] lg:w-[7%] h-[56px] rounded-lg bg-neutral-200 flex-shrink-0" />

                {/* Title and Description Skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-neutral-200 rounded w-full mb-1" />
                  <div className="h-3 bg-neutral-200 rounded w-5/6" />
                </div>

                {/* Toggle and Status Skeleton */}
                <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end">
                  <div className="h-6 bg-neutral-200 rounded-full w-12" />
                  <div className="h-4 bg-neutral-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailLoader;
