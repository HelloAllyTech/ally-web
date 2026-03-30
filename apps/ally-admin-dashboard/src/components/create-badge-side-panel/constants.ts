import { Badge } from "@components/create-badge-popup/CreateBadgePopup";
import { UserBadge, UserRoles } from "@types";

import { BadgeFormData } from "./types";

// Badge role mapping based on badge type
export const BADGE_ROLES: Record<Badge, string> = {
  SIMULATION_MINUTES: "LEARNER",
  ACTIVE_DAY_STREAK: "LEARNER",
  COMMENTS_REACTIONS_GIVEN: "SIMULATION_REVIEWER",
  COMMENTS_REACTIONS_RECEIVED: "LEARNER",
};

// Badge criteria configuration based on badge type
export const BADGE_CRITERIA: Record<Badge, { label: string; unit: string }> = {
  SIMULATION_MINUTES: {
    label: "Total simulation minutes",
    unit: "min",
  },
  ACTIVE_DAY_STREAK: {
    label: "Maintain a daily streak of",
    unit: "days",
  },
  COMMENTS_REACTIONS_GIVEN: {
    label: "Comments or reactions given",
    unit: "",
  },
  COMMENTS_REACTIONS_RECEIVED: {
    label: "Comments or reactions received",
    unit: "",
  },
};

// Helper to get groupIds from roles data based on badge category
const getGroupIdsFromRoles = (
  badgeCategory: string | null,
  roles?: UserRoles[] | null,
): number[] => {
  if (!badgeCategory || !roles) return [];

  const badgeRole = BADGE_ROLES[badgeCategory as Badge];
  if (!badgeRole) return [];

  const role = roles.find(r => r.name === badgeRole);
  return role ? [role.id] : [];
};

export const getInitialFormData = (
  badgeType: Badge | null,
  existingBadge?: UserBadge | null,
  roles?: UserRoles[] | null,
): BadgeFormData => {
  if (existingBadge) {
    // Get groupIds from existing badge or derive from roles based on category
    const groupIds =
      existingBadge.groupIds && existingBadge.groupIds.length > 0
        ? existingBadge.groupIds
        : getGroupIdsFromRoles(existingBadge.category || badgeType, roles);

    return {
      id: existingBadge.id,
      name: existingBadge.name || "",
      description: existingBadge.description || "",
      status: existingBadge.status || "DRAFT",
      visibilityType: existingBadge.visibilityType || "PRIVATE",
      imageUrl: existingBadge.imageUrl || "",
      category: existingBadge.category || badgeType || "",
      roles: existingBadge.roles || [],
      groupIds,
      achievementParams: { count: existingBadge.achievementParams?.count || 0 },
    };
  }

  // For new badges, derive groupIds from roles based on badge type
  const groupIds = getGroupIdsFromRoles(badgeType, roles);

  return {
    name: "",
    description: "",
    status: "DRAFT",
    visibilityType: "PRIVATE",
    imageUrl: "",
    category: badgeType || "",
    roles: [],
    groupIds,
    achievementParams: { count: 0 },
  };
};
