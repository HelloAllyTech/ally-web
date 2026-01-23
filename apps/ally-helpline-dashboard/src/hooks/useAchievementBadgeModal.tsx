import { useCallback, useEffect, useRef, useState } from "react";

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

  const { data: badgesResponse, isLoading } = useGetMyBadgesQuery({
    viewedStatus: ViewedStatus.UNVIEWED,
  });

  const [updateBadgeViewStatus] = useUpdateBadgeViewStatusMutation();

  const badges = badgesResponse?.data ?? [];

  useEffect(() => {
    if (!hasInitialized.current && badges.length > 0) {
      setCurrentBadgeIndex(0);
      hasInitialized.current = true;
    }
  }, [badges]);

  const closeModal = useCallback(() => {
    setCurrentBadgeIndex(prevIndex => {
      if (prevIndex === null) return null;

      // Mark the current badge as viewed
      const currentBadge = badges[prevIndex];
      if (currentBadge?.badgeId) {
        updateBadgeViewStatus(currentBadge.badgeId);
      }

      const nextIndex = prevIndex + 1;
      return nextIndex < badges.length ? nextIndex : null;
    });
  }, [badges, updateBadgeViewStatus]);

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
