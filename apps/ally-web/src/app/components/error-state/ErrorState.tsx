"use client";

import { useRouter } from "next/navigation";

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  /** Overrides the default retry behaviour (router.refresh). */
  onRetry?: () => void;
}

/**
 * Full-page error state with a retry affordance, shown when data fails to load.
 */
export default function ErrorState({
  title = "Error loading search results.",
  description = "Something went wrong while fetching resources. Please try again.",
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  const router = useRouter();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    router.refresh();
  };

  return (
    <main
      data-testid="error-state"
      role="alert"
      className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center font-['IBM_Plex_Serif']"
    >
      <h1 className="text-xl font-[500] text-[#1E2025]">{title}</h1>
      <p className="max-w-md text-[15px] leading-6 text-[#525252]">{description}</p>
      <button
        type="button"
        data-testid="error-state-retry"
        onClick={handleRetry}
        className="mt-2 rounded-[8px] border border-[#DADCE1] bg-[#1E2025] px-5 py-2 text-[15px] text-white transition-colors hover:bg-[#33363D]"
      >
        {retryLabel}
      </button>
    </main>
  );
}
