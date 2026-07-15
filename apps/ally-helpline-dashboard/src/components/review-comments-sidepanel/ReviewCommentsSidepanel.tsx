import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { SkeletonPlaceholder, Tabs } from "@ally-ui-mono/ui-shared";
import { GeneralCommentsToShow, ThreadsToShow } from "@components";
import { CommentItem, Thread } from "@types";

interface ReviewCommentsSidepanelProps {
  threads: Thread[] | null;
  generalComments: CommentItem[] | null;
  isFeedOwner?: boolean;
  className?: string;
  isOpen?: boolean;
  onCommentClick?: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => void;
  setComments: Dispatch<SetStateAction<CommentItem[]>>;
  isGeneralCommentsLoading: boolean;
  handleGeneralCommentsLoadMore: () => void;
  hasMoreGeneralComments: boolean;
  deletedReplyId?: string;
  setDeletedReplyId?: (id: string) => void;
  handleReplyChange?: (reply: CommentItem) => void;
  changedReply?: CommentItem;
  isScribeReview?: boolean;
}

type TabType = "inline" | "general";
const ReviewCommentsSidepanel = ({
  threads,
  isFeedOwner,
  className,
  isOpen = true,
  generalComments,
  setComments,
  isGeneralCommentsLoading,
  handleGeneralCommentsLoadMore,
  hasMoreGeneralComments,
  onCommentClick = () => {},
  deletedReplyId,
  setDeletedReplyId,
  handleReplyChange,
  changedReply,
  isScribeReview,
}: ReviewCommentsSidepanelProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("inline");
  const { t } = useTranslation();
  useEffect(() => {
    if (threads !== null) {
      setIsLoading(false);
    }
  }, [threads]);

  const threadsToShow = useMemo(() => {
    if (activeTab === "inline") {
      return threads;
    }
    return [];
  }, [threads, activeTab]);

  return (
    <div
      className={`h-full font-primary z-20 bg-white border-l-[0.5px] overflow-hidden transition-all duration-300 ${className}`}
    >
      <div
        className="w-full pt-4 px-4 flex items-center justify-between"
        style={{
          borderBottom: "none",
        }}
      >
        <div className="text-typography-900 font-medium text-lg">
          {t("review.details.comments")}
        </div>
      </div>
      <div className="w-full px-4">
        <Tabs
          items={[
            { id: "inline", label: "Inline" },
            { id: "general", label: "General" },
          ]}
          activeId={activeTab}
          showCount={false}
          onChange={id => setActiveTab(id as TabType)}
        />
      </div>
      <div className="w-full h-full px-4">
        {!isLoading && (
          <>
            {activeTab === "inline" && (
              <ThreadsToShow
                threads={threadsToShow}
                isOpen={isOpen}
                isFeedOwner={isFeedOwner}
                isScribeReview={isScribeReview}
                onCommentClick={onCommentClick}
              />
            )}
            <GeneralCommentsToShow
              show={activeTab === "general"}
              generalComments={generalComments}
              handleLoadMore={handleGeneralCommentsLoadMore}
              hasMoreComments={hasMoreGeneralComments}
              isLoading={isGeneralCommentsLoading}
              setComments={setComments}
              deletedReplyId={deletedReplyId}
              setDeletedReplyId={setDeletedReplyId}
              changedReply={changedReply}
              onReplyChange={handleReplyChange}
              isFeedOwner={isFeedOwner}
              isScribeReview={isScribeReview}
            />
          </>
        )}
        {isLoading && (
          <div className="w-full h-full overflow-hidden flex flex-col gap-4 items-center">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                className="w-full h-[140px] border-[0.5px] rounded-lg px-4 py-2 flex flex-col gap-2"
                key={index}
              >
                <SkeletonPlaceholder className="!w-full h-9" />
                <div className="w-full border-b-[0.5px] " />
                <div className="flex gap-2 h-[calc(100%-40px)]">
                  <SkeletonPlaceholder className="!w-8 h-8 rounded-full" />
                  <div className="w-[calc(100%-32px)] flex flex-col gap-2">
                    <SkeletonPlaceholder className="!w-full h-[15px] " />
                    <SkeletonPlaceholder className="!w-full h-[10px] " />
                    <SkeletonPlaceholder className="!w-full h-[10px] " />
                    <SkeletonPlaceholder className="!w-full h-[10px] " />
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
