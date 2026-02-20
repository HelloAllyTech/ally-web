import { FC } from "react";

import { TranscriptMessage } from "@types";

interface TranscriptSectionProps {
  transcripts?: TranscriptMessage[];
  isLoading?: boolean;
}

const formatTimestamp = (seconds: number): string => {
  return seconds.toFixed(2);
};

const TranscriptSection: FC<TranscriptSectionProps> = ({ transcripts, isLoading = false }) => {
  const transcriptData = transcripts;

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(index => {
            const isHelper = index % 3 === 0; // Every 3rd item is a helper message
            return (
              <div
                key={index}
                className={`flex gap-4 ${isHelper ? "bg-[#FAFAFA] p-4 rounded" : ""}`}
              >
                {/* Timestamp skeleton */}
                <div className="w-12 h-4 bg-gray-200 rounded animate-pulse shrink-0" />
                <div className="flex-1">
                  {isHelper ? (
                    <div className="flex flex-col gap-1">
                      {/* Helper label skeleton */}
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                      {/* Content skeleton */}
                      <div className="space-y-1">
                        <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="w-5/6 h-4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-4/5 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!transcriptData || transcriptData.length === 0) {
    return (
      <div className=" p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">No transcript available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transcriptData.map((message: TranscriptMessage) => {
        const isHelper =
          message.role?.toLowerCase() === "helper" || message.role?.toLowerCase() === "counsellor";

        return (
          <div key={message.id} className={`flex gap-4`}>
            <div className="text-sm text-typography-900 font-normal shrink-0 font-primary">
              {formatTimestamp(message.startSeconds)}
            </div>
            <div className="flex-1">
              {isHelper ? (
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-primary-500 font-primary">Helper</div>
                  <div className="text-sm text-[rgba(0,0,0,0.87)] font-primary">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[rgba(0,0,0,0.87)] font-primary">
                  {message.content}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptSection;
