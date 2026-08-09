import { useGetPracticeStreakSummaryQuery } from "@api";
import { Permissions } from "@constants";

import { useUser } from "./useUser";

/**
 * Single entry point for streak state across the app.
 *
 * Every surface (the /learn bar, the nav indicator, the post-session moment)
 * must call this rather than the generated hook, for two reasons:
 *
 * 1. It owns one set of query options, so the surfaces can never drift apart in
 *    how fresh they are.
 * 2. The underlying endpoint takes no argument, so RTK Query gives every
 *    subscriber the same cache entry and a single in-flight request. Mounting
 *    this in five places costs one network call, not five.
 *
 * `refetchOnFocus` matters more here than for most queries: a streak changes at
 * midnight in the business timezone, and a dashboard left open overnight would
 * otherwise render yesterday's state.
 */
export const usePracticeStreakSummary = () => {
  const { user, permissions } = useUser();
  const canViewStreak = !!user && permissions.includes(Permissions.VIEW_USER_RANK);

  const { data, isLoading, isFetching, isError, refetch } = useGetPracticeStreakSummaryQuery(
    undefined,
    {
      skip: !canViewStreak,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  return {
    summary: data,
    canViewStreak,
    isLoading,
    isFetching,
    isError,
    refetchStreak: refetch,
  };
};
