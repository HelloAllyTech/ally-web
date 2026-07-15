export interface SuperDuperAdmin {
  id: number;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface GetSuperDuperAdminsResponse {
  data: SuperDuperAdmin[];
  count: number;
}

export interface PromoteSuperDuperAdminBody {
  userId: number;
}

/** Which rung of the super-admin ladder a row in the combined table holds. */
export enum SuperAdminTier {
  SUPER_ADMIN = "SUPER_ADMIN",
  SUPER_DUPER_ADMIN = "SUPER_DUPER_ADMIN",
}

export interface TieredSuperAdmin extends SuperDuperAdmin {
  tier: SuperAdminTier;
}
