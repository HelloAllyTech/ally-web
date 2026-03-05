const FeedCardSkeleton = () => {
  return (
    <div className="w-full bg-white font-primary rounded-[12px] sm:rounded-[16px] border-[0.5px] border-border flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 shadow-[2.13px_2.84px_7.81px_0px_rgba(160,158,158,0.1),8.52px_11.36px_14.2px_0px_rgba(160,158,158,0.09)] animate-pulse">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200" />
        <div className="flex flex-col gap-1">
          <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded" />
          <div className="h-2.5 sm:h-3 w-14 sm:w-16 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="w-full h-[0.5px] bg-gray-200" />
      <div className="flex flex-col gap-2">
        <div className="h-3 sm:h-4 w-36 sm:w-48 bg-gray-200 rounded" />
        <div className="h-2.5 sm:h-3 w-48 sm:w-64 bg-gray-200 rounded" />
        <div className="border rounded-[8px] sm:rounded-[12px] overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="flex-shrink-0 w-full sm:w-[200px] h-[100px] sm:h-[100px] rounded-[4px] bg-gray-200" />
            <div className="flex flex-col justify-start gap-1 sm:gap-2 flex-1">
              <div className="h-3 sm:h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-2.5 sm:h-3 w-full bg-gray-200 rounded" />
              <div className="h-2.5 sm:h-3 w-2/3 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 py-1.5 sm:py-2 px-2 sm:px-3">
        <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-gray-200 rounded" />
        <div className="h-3 sm:h-4 w-24 sm:w-28 bg-gray-200 rounded" />
      </div>
      <div className="w-full h-[0.5px] bg-gray-200" />
      <div className="flex items-center justify-between">
        <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded" />
        <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
};

export default FeedCardSkeleton;
