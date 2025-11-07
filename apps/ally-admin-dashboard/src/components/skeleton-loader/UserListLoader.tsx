import React from "react";

import { en } from "@constants";

type UserListLoaderProps = {
  rows?: number;
};

export const UserListLoader: React.FC<UserListLoaderProps> = ({ rows = 15 }) => {
  const renderHeader = (
    <div className="grid [grid-template-columns:repeat(48,minmax(0,0.8fr))] px-4 py-2 text-sm text-typography-800 border-b border-border-light">
      <div className="col-span-11 pr-1">{en.userManagement.user}</div>
      <div className="col-span-6 pr-1">{en.userManagement.telephonyId}</div>
      <div className="col-span-8 pr-1">{en.userManagement.role}</div>
      <div className="col-span-8 pr-1">{en.userManagement.organization}</div>
      <div className="col-span-4 pr-1">{en.userManagement.credits}</div>
      <div className="col-span-6 pr-1">{en.userManagement.addedOn}</div>
      <div className="col-span-5 pr-1">{en.userManagement.status}</div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto text-sm text-typography-800">
      <div className="min-w-[900px]">
        {renderHeader}

        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="grid [grid-template-columns:repeat(48,minmax(0,1fr))] items-center px-4 py-3 border-b border-neutral-100 animate-pulse"
          >
            {/* User */}
            <div className="col-span-11 flex items-center min-w-0 gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-200" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-neutral-200 rounded w-32 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-40" />
              </div>
            </div>

            {/* Telephony ID */}
            <div className="col-span-6 pr-1">
              <div className="h-4 bg-neutral-200 rounded w-24" />
            </div>

            {/* Roles */}
            <div className="col-span-8 pr-1">
              <div className="h-4 bg-neutral-200 rounded w-28" />
            </div>

            {/* Organization */}
            <div className="col-span-8 pr-1">
              <div className="h-4 bg-neutral-200 rounded w-28" />
            </div>

            {/* Credits */}
            <div className="col-span-4 pr-1">
              <div className="h-4 bg-neutral-200 rounded w-16" />
            </div>

            {/* Added On */}
            <div className="col-span-6 pr-1">
              <div className="h-4 bg-neutral-200 rounded w-24" />
            </div>

            {/* Status + actions */}
            <div className="col-span-5 pr-1 ml-auto flex items-center justify-between gap-3 w-full">
              <div className="h-6 bg-neutral-200 rounded-full w-24" />
              <div className="h-4 bg-neutral-200 rounded w-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserListLoader;
