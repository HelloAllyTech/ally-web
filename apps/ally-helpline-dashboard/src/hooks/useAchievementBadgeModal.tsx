import { useCallback, useEffect, useRef, useState } from "react";

import confetti from "canvas-confetti";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { useGetMyBadgesQuery, useUpdateBadgeViewStatusMutation } from "@api";
import { AchievementBadgeModal } from "@components";
import { ROUTES, Permissions } from "@constants";
import { useUser } from "@hooks";
import { UserBadge, ViewedStatus } from "@types";
import { isPathExcluded } from "@utils";

interface UseAchievementBadgeModalReturn {
  currentBadge: UserBadge | null;
  closeModal: () => void;
  resetModal: () => void;
  BadgeModal: React.ReactNode;
  isLoading: boolean;
}

export const useAchievementBadgeModal = (): UseAchievementBadgeModalReturn => {
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState<number | null>(null);
  const { permissions } = useUser();
  const hasInitialized = useRef(false);
  const confettiTriggered = useRef(false);
  const { pathname } = useLocation();

  const isBadgesEnabled = permissions.includes(Permissions.VIEW_BADGES);
  const isSimulationPath = isPathExcluded(pathname, [ROUTES.SIMULATION_SUMMARY_FULL]);

  const {
    data: badgesResponse,
    isLoading,
    refetch,
  } = useGetMyBadgesQuery(
    {
      viewedStatus: ViewedStatus.UNVIEWED,
    },
    {
      skip: !isBadgesEnabled,
      refetchOnFocus: true,
      refetchOnReconnect: true,
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
      confettiTriggered.current = false;
      return undefined;
    }
    if (!hasInitialized.current) {
      setCurrentBadgeIndex(0);
      hasInitialized.current = true;
      if (!confettiTriggered.current && !isSimulationPath) {
        confettiTriggered.current = true;
        // Fire confetti from multiple positions
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 180,
          ticks: 500,
          zIndex: 9999,
          colors: ["#60A5FA", "#FCD34D", "#F472B6", "#86EFAC"],
        };

        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        const interval: NodeJS.Timeout = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 30 * (timeLeft / duration);

          // Fire from left
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });

          // Fire from right
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);
      } else if (!confettiTriggered.current && isSimulationPath) {
        confettiTriggered.current = true;
      }
    }
    return undefined;
  }, [badges.length, isSimulationPath]);

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

  const BadgeModal =
    isBadgesEnabled && currentBadge ? (
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
