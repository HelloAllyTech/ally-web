export enum CustomFieldType {
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  DATE = "DATE",
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
}

export enum CustomFieldEditPermission {
  ADMIN_ONLY = "ADMIN_ONLY",
  COUNSELLOR_ONLY = "COUNSELLOR_ONLY",
  BOTH = "BOTH",
}

export enum CustomFieldFillMode {
  MANUAL = "MANUAL",
  AI = "AI",
}

export enum CustomFieldScope {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
}

export interface SingleSelectOption {
  id: string;
  label: string;
  order: number;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  options?: SingleSelectOption[];
  sectionKey: string;
  editPermission: CustomFieldEditPermission;
  fillMode: CustomFieldFillMode;
  scope: CustomFieldScope;
  aiInstruction?: string;
  displayOrder: number;
  showInTable: boolean;
  filterable: boolean;
  isActive: boolean;
}

export interface CreateCustomFieldDefinitionInput {
  name: string;
  fieldType: CustomFieldType;
  sectionKey: string;
  editPermission: CustomFieldEditPermission;
  fillMode?: CustomFieldFillMode;
  aiInstruction?: string;
  options?: SingleSelectOption[];
  showInTable?: boolean;
  filterable?: boolean;
  tenantId: string;
}

export interface UpdateCustomFieldDefinitionInput {
  id: string;
  name?: string;
  sectionKey?: string;
  editPermission?: CustomFieldEditPermission;
  fillMode?: CustomFieldFillMode;
  aiInstruction?: string;
  options?: SingleSelectOption[];
  showInTable?: boolean;
  filterable?: boolean;
  tenantId: string;
}
