import React from "react";

import { en } from "@constants";

type OrganizationListLoaderProps = {
  rows?: number;
};

export const OrganizationListLoader: React.FC<OrganizationListLoaderProps> = ({ rows = 20 }) => {
  const renderHeader = () => (
    <div className="grid grid-cols-12 px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
      <div className="col-span-4">{en.userManagement.organization}</div>
      <div className="col-span-4">{en.userManagement.description}</div>
      <div className="col-span-2">{en.userManagement.createdOn}</div>
      <div className="col-span-2">{en.userManagement.noOfUsers}</div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto text-sm text-gray-600">
      <div className="min-w-[900px]">
        {renderHeader()}

        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center px-4 py-3 border-b border-gray-100 animate-pulse"
          >
            <div className="col-span-4">
              <div className="h-4 bg-gray-200 rounded w-40" />
            </div>
            <div className="col-span-4">
              <div className="h-4 bg-gray-200 rounded w-56" />
            </div>
            <div className="col-span-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-10" />
              <div className="h-4 bg-gray-200 rounded w-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationListLoader;
