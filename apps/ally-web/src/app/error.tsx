"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { logger } from "@ally-ui-mono/ui-shared";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error(`Error in search page: ${error}`);
  }, [error]);

  return (
    <main
      data-testid="error-page"
      role="alert"
      className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center font-['IBM_Plex_Serif']"
    >
      <h2 className="text-xl font-[500] text-[#1E2025]">Something went wrong!</h2>
      <p className="max-w-md text-[15px] leading-6 text-[#525252]">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        data-testid="error-page-retry"
        onClick={reset}
        className="mt-2 rounded-[8px] border border-[#DADCE1] bg-[#1E2025] px-5 py-2 text-[15px] text-white transition-colors hover:bg-[#33363D]"
      >
        Try again
      </button>
    </main>
  );
}
