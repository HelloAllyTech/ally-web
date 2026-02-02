import { useEffect, useState } from "react";

import { Skeleton } from "@mui/material";

import { ThreadCard } from "@components";
import { Thread } from "@types";

interface ReviewCommentsSidepanelProps {
  threads: Thread[] | null;
  isFeedOwner?: boolean;
  totalComments: number;
  className?: string;
  isOpen?: boolean;
  onCommentClick?: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => void;
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
            {threads?.map(
              (thread, index) =>
                thread?.comments[0] && (
                  <div
                    key={thread.id}
                    className="transition-all cursor-pointer duration-300 ease-out"
                    onClick={() =>
                      onCommentClick({
                        threadId: thread.id,
                        messageId: thread.selection.messageId.toString(),
                        startIndex: thread.selection.startIndex,
                        endIndex: thread.selection.endIndex,
                      })
                    }
                    style={{
                      transform: isOpen ? "translateY(0)" : "translateY(-100%)",
                      opacity: isOpen ? 1 : 0,
                      transitionDelay: isOpen
                        ? `${index * 50}ms`
                        : `${(threads.length - index) * 30}ms`,
                    }}
                  >
                    <ThreadCard thread={thread} isFeedOwner={isFeedOwner} />
                  </div>
                ),
            )}
            {threads?.length === 0 && (
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
