const TableSkeleton = () => (
  <div className="w-full animate-pulse">
    {/* Table Header */}
    <div className="flex border-b border-gray-200 bg-gray-50 py-3 px-4">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
    {/* Table Rows */}
    {[...Array(10)].map((_, rowIndex) => (
      <div key={rowIndex} className="flex border-b border-gray-100 py-4 px-4">
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-10 w-10 bg-gray-200 rounded" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex-1 px-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>
    ))}
  </div>
);

export default TableSkeleton;
