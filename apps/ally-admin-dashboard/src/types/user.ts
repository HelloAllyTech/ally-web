import { ReactNode } from "react";

import { userStatus } from "@constants";

export interface UserRowData {
  id: number;
  name: string;
  email: string;
  username: string;
  telephonyId: string;
  status: string;
  role: string;
  metadata: Record<string, unknown>;
  organization: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  maxCredits: number | null;
  usedCredits: number | null;
}

// Tenant/Organization shape from backend
export interface Tenant {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  logoUrl: string;
  metadata: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userCount: string;
  enabledDashboardIds: string[];
  enableMicrophoneMode: boolean;
  enableDictationMode: boolean;
  enableAudioUpload: boolean;
  hideRankInCommunity: boolean;
}

export interface GetTenantResponse {
  data: Tenant[];
  count?: number;
  total?: number;
}

export enum TabType {
  USERS = "users",
  ORGANIZATIONS = "organizations",
  // Super-admin-tier management tab, visible to super duper admins only.
  SUPER_ADMINS = "super-admins",
}

export interface UserListUser {
  id: number;
  name: string;
  email: string;
  username: string;
  externalId: string;
  status: userStatus | string;
  role: string;
  metadata: Record<string, unknown>;
  organization: string | null;
  tenantId: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  roles: string[];
  creditLimit: number | null;
  consumedCredits: number | null;
  secondsAllowedPerCredit: number;
  profileImageUrl: string;
}

export interface UserListProps {
  users: UserListUser[];
  renderFooter?: () => ReactNode;
  formatDate: (iso: string) => string;
  onOptionSelect?: (option: string, user: UserListUser) => void;
  canEditUser?: boolean;
}

export interface OrganizationListProps {
  organizations: Tenant[];
  renderFooter?: () => ReactNode;
  formatDate: (iso: string) => string;
  onEditPress?: (tenant: Tenant) => void;
  onRowClick?: (tenant: Tenant) => void;
}

export interface TenantParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface UsersParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
  tenantIds?: string[];
  roles?: string[];
  statuses?: string[];
  search?: string;
}

export interface TenantResponse {
  data: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTenantBody {
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  enabledDashboardIds?: string[];
  enableMicrophoneMode?: boolean;
  enableDictationMode?: boolean;
  enableAudioUpload?: boolean;
  hideRankInCommunity?: boolean;
}

export interface GetUsersResponse {
  data: UserListUser[];
  count: number;
}

export interface CreateUserBody {
  email: string;
  name: string;
  roles: string[];
  externalId: string;
  tenantId: string;
  simulationCreditLimit?: number;
  status?: "ACTIVE" | "INACTIVE" | string;
}

export type AddUserFormData = {
  name: string;
  email: string;
  externalId: string;
  tenantId: string;
  roles: string[];
  simulationCreditLimit?: number;
};

export interface BulkAddUsersBody {
  emails: string[];
  roles: string[];
  tenantId: string;
  simulationCreditLimit?: number;
}

export interface BulkAddUsersResponse {
  created: number;
  users: { id: number; email: string }[];
}

export type BulkAddUserFormData = {
  emails: string;
  tenantId: string;
  roles: string[];
  simulationCreditLimit?: number;
};

export interface TabOption {
  id: string;
  label: string;
}

export interface UserModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  buttonName?: string;
  fields: FieldProps[];
  details?: any;
  handleClick?: any;
  formMethods?: any;
  imageUpload?: boolean;
  uploadButtonName?: string;
  uploadTitle?: string;
  uploadId?: string;
  uploadImageUrl?: (payload: GetLogoUrlRequest) => Promise<any>;
  hasTabs?: boolean;
  tabOptions?: TabOption[];
  optionValues?: {
    id: string;
    value: boolean;
    label: string;
    onClick: (enabled: boolean) => void;
  }[];
  extraContent?: ReactNode;
}

export type Option = {
  id: string | number;
  value?: string;
  name?: string;
};
export interface FieldProps {
  id: string;
  label: string;
  placeholder?: string;
  fieldType: string;
  inputType: string;
  maxLength?: number;
  required?: boolean;
  options?: Option[] | UserRoles[];
}

export interface dropdownWithTagProps {
  label: string;
  placeholder: string;
  options: UserRoles[] | Option[];
  initialValue: string[];
  onChange?: (selected: string[]) => void;
  required: boolean;
}

export interface EditUserBody {
  id: number;
  data: {
    name: string;
    email: string;
    externalId: string;
  };
}

export interface UserRoles {
  id: number;
  name: string;
  value?: string;
}

export interface CreditFieldProps {
  onChange: (newCreditLimit: number | string) => void;
  userData: UserListUser;
  value: number;
}

export interface GetCreditResponse {
  creditLimit: number;
  consumedCredits: number;
  secondsAllowedPerCredit: number;
}

export interface AddCreditBody {
  userId: number;
  creditLimit: number;
}

export interface disableSuccessResponse {
  success: boolean;
  message: string;
}
export interface GetLogoUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface GetLogoUrlResponse {
  presignedUrl: string;
  logoUrl: string;
}

export interface DeleteLogoRequest {
  logoUrl: string;
}

export interface ScribeSettingsItem {
  id: string;
  label: string;
  visible: boolean;
}

export interface ScribeSettingsList {
  id: string;
  fields: ScribeSettingsItem[];
  label: string;
  enabled: boolean;
  defaultVisibility: boolean;
}

export interface ScribeSettingsListResponse {
  sections: ScribeSettingsList[];
}

export interface UpdateSummarySectionsBody {
  tenantId: string;
  hiddenSections: string[];
}

export interface UpdateSummaryFieldsBody {
  tenantId: string;
  hiddenFields: string[];
}

export interface AdminTenant {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface GetAdminTenantsResponse {
  data: AdminTenant[];
  count: number;
}

export interface AssignAdminTenantsBody {
  userId: number;
  tenantIds: string[];
}

export interface RemoveAdminTenantsBody {
  userId: number;
  tenantIds: string[];
}
