import { useEffect } from "react";

import { toast } from "sonner";

/**
 * Pulls something readable out of whatever RTK Query hands back — a
 * FetchBaseQueryError (`{ status, data }`) or a SerializedError
 * (`{ error: string }`) — falling back to a generic line when the shape is
 * neither.
 */
export const getLogsFetchErrorMessage = (error: unknown): string => {
  const fallback = "Failed to fetch call logs. Please try again.";
  if (typeof error !== "object" || error === null) return fallback;

  if (
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof (error.data as { message: unknown }).message === "string"
  ) {
    return (error.data as { message: string }).message;
  }

  if ("error" in error && typeof (error as { error: unknown }).error === "string") {
    return (error as { error: string }).error;
  }

  return fallback;
};

/**
 * Tells the counsellor a log fetch failed, without taking the table away.
 *
 * Every logs table keeps the rows it already has when a background refetch is
 * rejected, so the toast is the *only* signal that what they are looking at
 * may be stale — which is exactly why all three tables need it and not just
 * the admin one. Shared rather than copied so they cannot drift apart again.
 */
export const useLogsFetchErrorToast = (error: unknown, isLoading: boolean): void => {
  useEffect(() => {
    if (!error || isLoading) return;
    toast.error(
      `${getLogsFetchErrorMessage(error)}. It can be issue with applied filters. Please try again.`,
    );
  }, [error, isLoading]);
};
