import React from "react";

import { en } from "@constants";

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  className?: string;
  handleGoBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = en.accessDenied.title,
  message = en.accessDenied.message,
  showBackButton = false,
  handleGoBack = () => {},
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col font-['IBM_Plex_Sans'] items-center justify-center h-full min-h-[500px] px-4 ${className}`}
    >
      <h1 className="text-2xl font-medium text-gray-800 mb-3 text-center">{title}</h1>
      <p className="text-gray-600 text-center max-w-md mb-8 leading-relaxed">{message}</p>

      {/* Action Buttons */}
      {showBackButton && (
        <div className="flex gap-3">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center bg-[#1557D0] hover:bg-[#1557D0]/90 text-white text-[14px] font-medium px-6 py-3 rounded-lg shadow-sm transition-colors"
          >
            {en.common.goBack}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccessDenied;
