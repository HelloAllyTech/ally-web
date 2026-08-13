/** One entry of the backend's feature-toggle registry (labels/descriptions live only here). */
export interface FeatureToggleRegistryEntry {
  key: string;
  label: string;
  description: string;
}

/** One platform admin's state for a single toggle. */
export interface UserFeatureToggle extends FeatureToggleRegistryEntry {
  enabled: boolean;
}

export interface SetUserFeatureTogglesBody {
  userId: number;
  toggles: { featureKey: string; enabled: boolean }[];
}

/** A user holding the consolidated PLATFORM_ADMIN role. */
export interface PlatformAdmin {
  id: number;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface GetPlatformAdminsResponse {
  data: PlatformAdmin[];
  count: number;
}

export interface AssignPlatformAdminBody {
  userId: number;
}
