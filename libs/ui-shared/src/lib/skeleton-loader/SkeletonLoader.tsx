import { FC } from "react";

import { skeletonLoaderStyles } from "./constants";
import { SkeletonLoaderProps } from "./types";
import { SearchVariant } from "../../types";

/**
 * SkeletonLoader component displays a loading skeleton UI for resource lists and headers.
 * Useful for indicating loading state while fetching data.
 * @component
 */
const SkeletonLoader: FC<SkeletonLoaderProps> = ({ mode = SearchVariant.LIGHT }) => {
  return (
    <main className="w-full min-h-dvh flex justify-center overflow-y-hidden ">
      <div className="w-full mx-auto mt-8">
        {/* Tabs Skeleton */}
        <div className="w-full border-b border-gray-200 mb-6">
          <div className="flex gap-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-16 h-4 rounded animate-pulse ${skeletonLoaderStyles[mode].tab}`}
                ></div>
                <div
                  className={`w-8 h-0.5 rounded animate-pulse ${skeletonLoaderStyles[mode].tab}`}
                ></div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Cards Skeleton */}
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-full border border-[#DADCE1] rounded-lg p-4 ${skeletonLoaderStyles[mode].card}`}
            >
              {/* Tags Row */}
              <div className="flex justify-between gap-2 mb-3">
                <div
                  className={`w-20 h-6 rounded-full animate-pulse ${skeletonLoaderStyles[mode].text}`}
                ></div>
              </div>

              {/* Title */}
              <div
                className={`w-3/4 h-5 rounded mb-2 animate-pulse ${skeletonLoaderStyles[mode].text}`}
              ></div>

              {/* Description */}
              <div className="space-y-2">
                <div
                  className={`w-full h-4 rounded animate-pulse ${skeletonLoaderStyles[mode].text}`}
                ></div>
                <div
                  className={`w-5/6 h-4 rounded animate-pulse ${skeletonLoaderStyles[mode].text}`}
                ></div>
                <div
                  className={`w-4/5 h-4 rounded animate-pulse ${skeletonLoaderStyles[mode].text}`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator at bottom */}
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-gray-500">Loading resources...</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SkeletonLoader;
