import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@mui/material";

import { ThreadCard } from "@components";
import { Thread } from "@types";

interface ReviewCommentsSidepanelProps {
  threads: Thread[] | null;
  isFeedOwner?: boolean;
  totalComments: number;
  className?: string;
  isOpen?: boolean;
  onCommentClick?: (
    props:
      | {
          messageId: string;
          startIndex: number;
          endIndex: number;
          threadId: string;
        }
      | Array<{
          messageId: string;
          startIndex: number;
          endIndex: number;
          threadId: string;
        }>,
  ) => void;
}
const ReviewCommentsSidepanel = ({
  threads,
  totalComments,
  isFeedOwner,
  className,
  isOpen = true,
  onCommentClick = () => {},
}: ReviewCommentsSidepanelProps) => {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (threads !== null) {
      setIsLoading(false);
    }
  }, [threads]);

  const threadsBySelection = useMemo(() => {
    if (!threads?.length) return [];
    const map = new Map<string, Thread[]>();
    for (const thread of threads) {
      if (!thread?.comments[0]) continue;
      const key = `${thread.selection.messageId}-${thread.selection.startIndex}-${thread.selection.endIndex}`;
      const existing = map.get(key) ?? [];
      existing.push(thread);
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [threads]);

  return (
    <div
      className={`h-full z-20 bg-white border-l-[0.5px] overflow-hidden transition-all duration-300 ${className}`}
    >
      <div className="w-full font-primary py-4 px-4 flex items-center justify-between border-b-[0.5px]">
        <div className="text-typography-900 font-medium text-lg">
          {totalComments || 0} {"Comment" + (totalComments !== 1 ? "s" : "")}
        </div>
      </div>
      <div className="w-full h-full px-4">
        {!isLoading && (
          <div className="flex flex-col gap-4 overflow-auto h-[calc(100%-40px)] pb-8 -mr-4 pr-4 py-4 custom-scrollbar">
            {threadsBySelection.map((groupThreads, groupIndex) => (
              <div
                key={groupThreads[0].id}
                className="flex flex-col gap-2 transition-all duration-300 ease-out"
                style={{
                  transform: isOpen ? "translateY(0)" : "translateY(-100%)",
                  opacity: isOpen ? 1 : 0,
                  transitionDelay: isOpen
                    ? `${groupIndex * 50}ms`
                    : `${(threadsBySelection.length - groupIndex) * 30}ms`,
                }}
              >
                {groupThreads.map(thread => (
                  <div
                    key={thread.id}
                    className="transition-all cursor-pointer duration-300 ease-out"
                    onClick={() =>
                      onCommentClick(
                        groupThreads.map(thread => ({
                          threadId: thread.id,
                          messageId: thread.selection.messageId.toString(),
                          startIndex: thread.selection.startIndex,
                          endIndex: thread.selection.endIndex,
                        })),
                      )
                    }
                  >
                    <ThreadCard thread={thread} isFeedOwner={isFeedOwner} />
                  </div>
                ))}
              </div>
            ))}
            {threadsBySelection.length === 0 && (
              <div className="w-full h-full flex pt-4 justify-center">
                <div className="text-typography-800 text-center">No comments yet</div>
              </div>
            )}
          </div>
        )}
        {isLoading && (
          <div className="w-full h-full overflow-hidden flex flex-col gap-4 items-center">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                className="w-full h-[140px] border-[0.5px] rounded-lg px-4 py-2 flex flex-col gap-2"
                key={index}
              >
                <Skeleton variant="rectangular" className="w-full h-9" />
                <div className="w-full border-b-[0.5px] " />
                <div className="flex gap-2 h-[calc(100%-40px)]">
                  <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
                  <div className="w-[calc(100%-32px)] flex flex-col gap-2">
                    <Skeleton variant="rectangular" className="w-full h-[15px] " />
                    <Skeleton variant="rectangular" className="w-full h-[10px] " />
                    <Skeleton variant="rectangular" className="w-full h-[10px] " />
                    <Skeleton variant="rectangular" className="w-full h-[10px] " />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCommentsSidepanel;
