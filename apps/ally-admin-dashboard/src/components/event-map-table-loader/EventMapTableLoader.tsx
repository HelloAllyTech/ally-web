import React from "react";

export const EventMapTableLoader: React.FC = () => {
  return (
    <div className="w-full animate-pulse">
      {/* Table Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="w-[180px] h-4 bg-gray-200 rounded" />
        <div className="w-[120px] h-4 bg-gray-200 rounded" />
        <div className="w-[120px] h-4 bg-gray-200 rounded" />
        <div className="w-[180px] h-4 bg-gray-200 rounded" />
        <div className="w-[120px] h-4 bg-gray-200 rounded" />
        <div className="w-[120px] h-4 bg-gray-200 rounded" />
        <div className="w-[180px] h-4 bg-gray-200 rounded" />
      </div>

      {/* Table Rows */}
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex gap-4 px-4 py-4 border-b border-gray-100">
          <div className="w-[180px] h-8 bg-gray-200 rounded" />
          <div className="w-[120px] h-8 bg-gray-200 rounded" />
          <div className="w-[120px] h-8 bg-gray-200 rounded" />
          <div className="w-[180px] h-8 bg-gray-200 rounded" />
          <div className="w-[120px] h-8 bg-gray-200 rounded" />
          <div className="w-[120px] h-8 bg-gray-200 rounded" />
          <div className="w-[180px] h-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
};

export default EventMapTableLoader;
