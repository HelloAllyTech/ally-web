import { FC } from "react";

import { UserRole } from "@src/constants";
import { TranscriptMessage } from "@types";

interface TranscriptSectionProps {
  transcripts?: TranscriptMessage[];
  isLoading?: boolean;
}

const TranscriptSection: FC<TranscriptSectionProps> = ({ transcripts, isLoading = false }) => {
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
              {(message.startSeconds ?? 0).toFixed(2)}
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
    </div>
  );
};

export default TranscriptSection;
