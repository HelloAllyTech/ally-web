import React from "react";

import { en } from "@constants";

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  /**
   * WHY this specific gate didn't pass — a feature toggle, an org toggle, a
   * role, or an allowlist. Every caller used to fall back to the same generic
   * copy regardless of which of those it was, so a trainer blocked by the
   * Roleplay v2 allowlist read the identical text as one blocked by a missing
   * permission. Shown under `message` when a caller has something specific
   * to say; omit it to keep the plain generic default.
   */
  reason?: string;
  /** WHAT TO DO about it — contact an admin, request access, etc. Shown under `reason`/`message`. */
  nextStep?: string;
  showBackButton?: boolean;
  className?: string;
  handleGoBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = en.accessDenied.title,
  message = en.accessDenied.message,
  reason,
  nextStep,
  showBackButton = false,
  handleGoBack = () => {},
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col font-primary items-center justify-center h-full min-h-[500px] px-4 ${className}`}
    >
      <h1 className="text-2xl font-medium text-typography-800 mb-3 text-center">{title}</h1>
      <p className="text-typography-800 text-center max-w-md leading-relaxed">{message}</p>
      {reason && (
        <p className="text-typography-700 text-center max-w-md mt-2 leading-relaxed">{reason}</p>
      )}
      {nextStep && (
        <p className="text-typography-500 text-sm text-center max-w-md mt-2 leading-relaxed">
          {nextStep}
        </p>
      )}
      <div className="mb-8" />

      {/* Action Buttons */}
      {showBackButton && (
        <div className="flex gap-3">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white text-base font-medium px-6 py-3 rounded-lg shadow-sm transition-colors"
          >
            {en.common.goBack}
          </button>
        </div>
      )}
    </div>
  );
};
