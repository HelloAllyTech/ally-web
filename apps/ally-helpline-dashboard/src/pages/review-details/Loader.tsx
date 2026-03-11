const Loader = () => (
  <div className="flex flex-col justify-center gap-2 font-primary animate-pulse">
    <div className="h-6 w-64 bg-gray-200 rounded" />
    <div className="flex gap-2 items-center">
      <div className="w-4 h-4 bg-gray-200 rounded-full" />
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="w-1 h-1 bg-gray-200 rounded-full mx-1" />
      <div className="h-4 w-48 bg-gray-200 rounded" />
      <div className="w-1 h-1 bg-gray-200 rounded-full mx-1" />
      <div className="h-4 w-32 bg-gray-200 rounded" />
    </div>
  </div>
);

export default Loader;
