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

export interface GetTenantResponse {
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

export interface UserModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  buttonName?: string;
  fields: FieldProps[];
  details?: any;
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
