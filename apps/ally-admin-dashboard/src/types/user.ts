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
  metadata: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userCount: string;
}

export interface GetTenantRespose {
  data: Tenant[];
  count?: number;
  total?: number;
}

export enum TabType {
  USERS = "users",
  ORGANIZATIONS = "organizations",
}

export interface UserListUser {
  id: number;
  name: string;
  email: string;
  username: string;
  telephonyId: string;
  status: userStatus | string;
  role: string;
  metadata: Record<string, unknown>;
  organization: string | null;
  tenantId: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  roles: UserRoles[];
  maxCredits: number | null;
  usedCredits: number | null;
}

export interface UserListProps {
  users: UserListUser[];
  renderFooter?: () => ReactNode;
  formatDate: (iso: string) => string;
  onOptionSelect?: (option: string, user: UserListUser) => void;
}

export interface OrganizationListProps {
  organizations: Tenant[];
  renderFooter?: () => ReactNode;
  formatDate: (iso: string) => string;
  onEditPress?: (tenant: Tenant) => void;
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
}

export interface GetUsersRespose {
  data: UserListUser[];
  count: number;
}

export interface CreateUserBody {
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  externalId?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
}

export type AddUserFormData = {
  name: string;
  email: string;
  externalId: string;
  telephonyId: string;
  tenantId: string;
  roles: string[];
  credits: number;
};

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  buttonName?: string;
  fields: FieldProps[];
  details?: UserListUser;
  handleClick?: any;
  formMethods?: any;
}

export type Option = {
  id: string | number;
  value: string;
};
export interface FieldProps {
  id: string;
  label: string;
  placeholder?: string;
  fieldType: string;
  inputType: string;
  options?: Option[] | UserRoles[];
}

export interface dropdownWithTagProps {
  label: string;
  options: UserRoles[] | Option[];
  value: string[];
  onChange?: (selected: string[]) => void;
}

export interface EditUserBody {
  id: number;
  name: string;
  tenantId: string;
  externalId: string;
}

export interface UserRoles {
  id: number;
  name: string;
}
