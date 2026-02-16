export interface UserBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  code: string;
  status: string;
  visibilityType: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface GetUserBadgesResponse {
  data: UserBadge[];
  count: number;
}

export enum BadgeCategory {
  SIMULATION_MINUTES = "Simulation",
  ACTIVE_DAY_STREAK = "Momentum",
  COMMENTS_REACTIONS_GIVEN = "Contribution",
  COMMENTS_REACTIONS_RECEIVED = "Resonance",
}
