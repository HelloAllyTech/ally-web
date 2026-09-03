export interface UserBadge {
  id: string;
  badgeId: string;
  userId: string;
  viewStatus: ViewedStatus;
  createdAt: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface GetMyBadgesResponse {
  data: UserBadge[];
}

export interface AchievementItemData {
  id: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  viewedStatus: string;
  lockStatus: string;
  category: string;
}

export interface AchievementItemDataResponse {
  badges: AchievementItemData[];
  category: BadgeCategory;
}

export enum ViewedStatus {
  VIEWED = "VIEWED",
  UNVIEWED = "UNVIEWED",
}

export enum LockedStatus {
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
}

export enum BadgeCategory {
  SIMULATION_MINUTES = "SIMULATION_MINUTES",
  ACTIVE_DAY_STREAK = "ACTIVE_DAY_STREAK",
  COMMENTS_REACTIONS_GIVEN = "COMMENTS_REACTIONS_GIVEN",
  COMMENTS_REACTIONS_RECEIVED = "COMMENTS_REACTIONS_RECEIVED",
  XP_LEVEL = "XP_LEVEL",
}
