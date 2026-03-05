import { useTranslation } from "react-i18next";

import ThreadCard from "@src/components/thread-card/ThreadCard";
import { Thread } from "@src/types";

interface ThreadsToShowProps {
  threads: Thread[];
  isOpen: boolean;
  isFeedOwner: boolean;
  onCommentClick: (props: {
    threadId: string;
    messageId: string;
    startIndex: number;
    endIndex: number;
  }) => void;
}
const ThreadsToShow = (props: ThreadsToShowProps) => {
  const { threads, onCommentClick, isOpen, isFeedOwner } = props;
  const { t } = useTranslation();
  return (
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
                transitionDelay: isOpen ? `${index * 50}ms` : `${(threads.length - index) * 30}ms`,
              }}
            >
              <ThreadCard thread={thread} isFeedOwner={isFeedOwner} />
            </div>
          ),
      )}
      {threads?.length === 0 && (
        <div className="w-full h-full flex pt-4 justify-center">
          <div className="text-typography-800 text-center">{t("review.details.noCommentsYet")}</div>
        </div>
      )}
    </div>
  );
};

export default ThreadsToShow;
