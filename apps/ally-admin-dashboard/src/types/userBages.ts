export interface UserBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  status: string;
  visibilityType: "PUBLIC" | "PRIVATE";
  category: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  groupIds: number[];
  achievementParams: {
    count: number;
  };
}

export interface BadgeForTenant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  visibilityType: "PUBLIC" | "PRIVATE";
  achievementParams: {
    count: number;
  };
}

export interface UserBadgeFilters {
  category: string[];
  status: ("ACTIVE" | "DRAFT")[];
}

export interface GetUserBadgesRequest {
  search?: string;
  limit?: number;
  offset?: number;
  category?: string[];
  status?: ("ACTIVE" | "DRAFT")[];
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

export interface UploadBadgeIconRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface DeleteBadgeIconRequest {
  imageUrl: string;
}

export interface DeleteBadgeIconResponse {
  success: boolean;
}

export interface UploadBadgeIconResponse {
  presignedUrl: string;
  imageUrl: string;
}

export interface CreateBadgeRequest {
  name: string;
  description: string;
  imageUrl: string;
  status: string;
  visibilityType: "PUBLIC" | "PRIVATE";
  category: string;
  roles: string[];
  groupIds: number[];
  achievementParams: {
    count: number;
  };
}

export interface CreateBadgeResponse {
  id: string;
}

export interface UpdateBadgeRequest {
  id: string;
  data: Partial<CreateBadgeRequest>;
}

export interface UpdateBadgeResponse {
  id: string;
}

export interface DeleteBadgeRequest {
  id: string;
}

export interface DeleteBadgeResponse {
  success: boolean;
}

export interface GetBadgesTenantVisibilityRequest {
  tenantId: string;
}

export type GetBadgesTenantVisibilityResponse = BadgeForTenant[];

export interface AddBadgesToTenantRequest {
  badgeId: string;
  tenantIds: string[];
}

export interface AddBadgesToTenantResponse {
  message: string;
}

export interface RemoveBadgesFromTenantRequest {
  badgeId: string;
  tenantIds: string[];
}

export interface RemoveBadgesFromTenantResponse {
  message: string;
}
