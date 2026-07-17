import { FC } from "react";

import { Loading } from "@ally-ui-mono/ui-shared";
import { Plus } from "@assets";
import { UserRole } from "@src/constants";
import { TranscriptMessage } from "@types";

interface TranscriptSectionProps {
  transcripts?: TranscriptMessage[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const TranscriptSection: FC<TranscriptSectionProps> = ({
  transcripts,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  const list = Array.isArray(transcripts) ? transcripts : [];

  const userRoleLabel = (role: string) => {
    switch (role) {
      case UserRole.COUNSELLOR:
        return "Counsellor";
      case UserRole.CLIENT:
        return "Client";
      default:
        return role;
    }
  };

  const formatTimeToMinutesAndSeconds = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes?.toString()?.padStart(2, "0")}:${seconds?.toFixed(0)?.padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-gray-500">Loading transcript...</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-gray-500">No transcript available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-6">
      {list.map((message, index) => {
        return (
          <div key={message.id ?? `msg-${index}`} className="flex gap-3 flex-row">
            <span className="text-base text-typography-800">
              {formatTimeToMinutesAndSeconds(message.startSeconds ?? 0)}
            </span>
            <div className="flex flex-col gap-0">
              <span
                className={`text-base font-medium ${message.role === UserRole.COUNSELLOR ? "text-primary-500" : "text-typography-900"} shrink-0 w-16`}
              >
                {userRoleLabel(message.role)}
              </span>
              <span className="text-base text-typography-900 font-normal">{message.content}</span>
            </div>
          </div>
        );
      })}
      {hasMore && typeof onLoadMore === "function" && (
        <div className="flex justify-center mt-4 pb-[20px]">
          <button
            type="button"
            onClick={() => {
              if (!isLoadingMore) onLoadMore();
            }}
            disabled={isLoadingMore}
            className="flex cursor-pointer text-center items-center hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed border-0 bg-transparent p-0 font-inherit text-inherit"
          >
            <Plus className="w-4 h-4" />
            <span className="font-primary text-base ml-[5px]">Load More</span>
            {isLoadingMore && (
              <Loading small withOverlay={false} description="Loading more" className="mx-2" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TranscriptSection;
