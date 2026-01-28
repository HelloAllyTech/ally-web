const ReplySkeleton = () => (
  <div className="flex gap-2.5 w-full animate-pulse">
    <div className="min-w-5 h-5 rounded-full bg-gray-200" />
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 items-center">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-16 bg-gray-200 rounded" />
      </div>
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
    </div>
  </div>
);

export default ReplySkeleton;
