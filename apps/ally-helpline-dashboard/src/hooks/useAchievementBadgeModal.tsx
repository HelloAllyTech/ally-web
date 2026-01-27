import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useGetMyBadgesQuery, useUpdateBadgeViewStatusMutation } from "@api";
import { AchievementBadgeModal } from "@components";
import { UserBadge, ViewedStatus } from "@src/types";

interface UseAchievementBadgeModalReturn {
  currentBadge: UserBadge | null;
  closeModal: () => void;
  resetModal: () => void;
  BadgeModal: React.ReactNode;
  isLoading: boolean;
}

export const useAchievementBadgeModal = (): UseAchievementBadgeModalReturn => {
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState<number | null>(null);
  const hasInitialized = useRef(false);

  const {
    data: badgesResponse,
    isLoading,
    refetch,
  } = useGetMyBadgesQuery(
    {
      viewedStatus: ViewedStatus.UNVIEWED,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const [updateBadgeViewStatus] = useUpdateBadgeViewStatusMutation();

  const badges = badgesResponse?.data ?? [];

  // Handle invalid index when badges array changes
  useEffect(() => {
    setCurrentBadgeIndex(prevIndex => {
      if (prevIndex !== null && prevIndex >= badges.length) {
        return null;
      }
      return prevIndex;
    });
  }, [badges.length]);

  // Initialize first badge and handle empty state
  useEffect(() => {
    if (badges.length === 0) {
      setCurrentBadgeIndex(null);
      hasInitialized.current = false;
    } else if (!hasInitialized.current) {
      setCurrentBadgeIndex(0);
      hasInitialized.current = true;
    }
  }, [badges.length]);

  const closeModal = useCallback(async () => {
    const currentIndex = currentBadgeIndex;
    if (currentIndex === null) return;

    // Mark the current badge as viewed
    const currentBadge = badges[currentIndex];
    if (currentBadge?.badgeId) {
      try {
        await updateBadgeViewStatus(currentBadge.badgeId).unwrap();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update badge view status");
      }
    }

    // Move to next badge
    const nextIndex = currentIndex + 1;
    // If this was the last badge, close modal and refetch
    if (nextIndex >= badges.length) {
      setCurrentBadgeIndex(null);
      // Refetch only after all badges are closed
      refetch();
    } else {
      // Move to next badge without refetching
      setCurrentBadgeIndex(nextIndex);
    }
  }, [badges, currentBadgeIndex, updateBadgeViewStatus, refetch]);

  const resetModal = useCallback(() => {
    if (badges.length > 0) {
      setCurrentBadgeIndex(0);
    }
  }, [badges.length]);

  const currentBadge = currentBadgeIndex !== null ? badges[currentBadgeIndex] : null;

  const BadgeModal = currentBadge ? (
    <AchievementBadgeModal
      isOpen={true}
      onClose={closeModal}
      title={currentBadge.name}
      description={currentBadge.description}
      badgeImageUrl={currentBadge.imageUrl}
    />
  ) : null;

  return {
    currentBadge,
    closeModal,
    resetModal,
    BadgeModal,
    isLoading,
  };
};
