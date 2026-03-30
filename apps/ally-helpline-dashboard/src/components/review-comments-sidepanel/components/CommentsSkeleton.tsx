const CommentSkeleton = () => (
  <div className="flex gap-3 w-full animate-pulse">
    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 bg-neutral-200 rounded" />
        <div className="h-3 w-16 bg-neutral-100 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-neutral-200 rounded" />
        <div className="h-3 w-3/4 bg-neutral-200 rounded" />
      </div>
      <div className="flex gap-4 mt-2">
        <div className="h-3 w-10 bg-neutral-100 rounded" />
        <div className="h-3 w-10 bg-neutral-100 rounded" />
      </div>
    </div>
  </div>
);

export default CommentSkeleton;
