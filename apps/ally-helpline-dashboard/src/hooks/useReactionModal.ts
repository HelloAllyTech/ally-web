import { useState, useCallback, useMemo, useEffect } from "react";

import { useLazyGetReviewReactionsQuery, useGetReviewReactionsCountQuery } from "@api";
import { ReviewReaction } from "@types";

const PAGE_SIZE = 20;

export interface UseReactionModalProps {
  reviewId: string;
  isOpen: boolean;
}

export const useReactionModal = ({ reviewId, isOpen }: UseReactionModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showMoreEmojis, setShowMoreEmojis] = useState(false);
  const [offset, setOffset] = useState(0);
  const [accumulatedReactions, setAccumulatedReactions] = useState<ReviewReaction[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const [getReviewReactions, { isFetching }] = useLazyGetReviewReactionsQuery();

  const { data: reactionsData, isLoading: isReactionsCountLoading } =
    useGetReviewReactionsCountQuery(
      { reviewId },
      {
        skip: !isOpen || !reviewId,
        refetchOnMountOrArgChange: true,
      },
    );

  // Reactions data from API
  const reactions = reactionsData ?? {};
  const reactionParam = activeTab === "all" ? undefined : activeTab;

  // Initial fetch when modal opens or tab changes
  useEffect(() => {
    if (!isOpen || !reviewId) return;

    // Reset state for new tab
    setOffset(0);
    setAccumulatedReactions([]);
    setHasMore(true);

    const fetchInitialReactions = async () => {
      try {
        const result = await getReviewReactions({
          reviewId,
          reaction: reactionParam,
          limit: PAGE_SIZE,
          offset: 0,
        }).unwrap();

        const newReactions = result.data ?? [];
        setAccumulatedReactions(newReactions);
        setHasMore(newReactions.length < result.count);
      } catch {
        setHasMore(false);
      }
    };

    fetchInitialReactions();
  }, [isOpen, reviewId, activeTab, reactionParam, getReviewReactions]);

  const fetchMoreReactions = useCallback(async () => {
    if (isFetching || !hasMore || !isOpen || !reviewId) return;

    const newOffset = offset + PAGE_SIZE;

    try {
      const result = await getReviewReactions({
        reviewId,
        reaction: reactionParam,
        limit: PAGE_SIZE,
        offset: newOffset,
      }).unwrap();

      const newReactions = result.data ?? [];
      setAccumulatedReactions(prev => [...prev, ...newReactions]);
      setOffset(newOffset);
      setHasMore(newOffset + newReactions.length < result.count);
    } catch {
      setHasMore(false);
    }
  }, [getReviewReactions, isFetching, hasMore, isOpen, reviewId, reactionParam, offset]);

  const loadMore = useCallback(() => {
    fetchMoreReactions();
  }, [fetchMoreReactions]);

  const reactionEntries = useMemo(() => Object.entries(reactions), [reactions]);

  const totalCount = useMemo(() => {
    return reactionEntries.reduce((sum, [, count]) => sum + count, 0);
  }, [reactionEntries]);

  const visibleReactions = useMemo(
    () => (reactionEntries.length > 3 ? reactionEntries.slice(0, 3) : reactionEntries),
    [reactionEntries],
  );

  const hiddenReactions = useMemo(
    () => (reactionEntries.length > 3 ? reactionEntries.slice(3) : []),
    [reactionEntries],
  );

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleToggleMoreEmojis = useCallback(() => {
    setShowMoreEmojis(prev => !prev);
  }, []);

  const handleSelectHiddenReaction = useCallback((code: string) => {
    setActiveTab(code);
    setShowMoreEmojis(false);
  }, []);

  const resetState = useCallback(() => {
    setActiveTab("all");
    setShowMoreEmojis(false);
    setOffset(0);
    setAccumulatedReactions([]);
    setHasMore(true);
  }, []);

  return {
    // State
    activeTab,
    showMoreEmojis,

    // Derived data
    reactionEntries,
    totalCount,
    visibleReactions,
    hiddenReactions,
    userReactions: accumulatedReactions,

    // Loading states
    isLoading: isFetching || isReactionsCountLoading,

    // Pagination
    loadMore,
    hasMore,

    // Actions
    handleTabChange,
    handleToggleMoreEmojis,
    handleSelectHiddenReaction,
    resetState,
  };
};
