/**
 * Mirror of CustomFieldType enum in ally-be.
 * Source of truth: src/custom-fields/entity/custom-field-definition.entity.ts
 * Keep values in sync when adding new types to the backend enum.
 */
export enum CustomFieldType {
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  DATE = "DATE",
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
}

/**
 * Mirror of CustomFieldEditPermission enum in ally-be.
 * Source of truth: src/custom-fields/entity/custom-field-definition.entity.ts
 */
export enum CustomFieldEditPermission {
  ADMIN_ONLY = "ADMIN_ONLY",
  COUNSELLOR_ONLY = "COUNSELLOR_ONLY",
  BOTH = "BOTH",
}

/**
 * Mirror of CustomFieldFillMode enum in ally-be.
 * Source of truth: src/custom-fields/entity/custom-field-definition.entity.ts
 */
export enum CustomFieldFillMode {
  MANUAL = "MANUAL",
  AI = "AI",
}

/**
 * Mirror of CustomFieldScope enum in ally-be.
 * Source of truth: src/custom-fields/entity/custom-field-definition.entity.ts
 *
 * SUPER_ADMIN definitions are managed only from scribe settings; the in-app
 * "Manage custom fields" dialog filters them out.
 */
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
  sectionLabel?: string;
  editPermission: CustomFieldEditPermission;
  fillMode: CustomFieldFillMode;
  scope: CustomFieldScope;
  displayOrder: number;
  showInTable: boolean;
  /** Whether this field can be used to filter the session-logs table. */
  filterable: boolean;
  isActive: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  fieldDefinitionId: string;
  name: string;
  fieldType: CustomFieldType;
  options?: SingleSelectOption[];
  sectionKey: string;
  sectionLabel: string;
  editPermission: CustomFieldEditPermission;
  fillMode: CustomFieldFillMode;
  displayOrder: number;
  value: string | null;
}

export interface CreateCustomFieldDefinitionInput {
  name: string;
  fieldType: CustomFieldType;
  options?: SingleSelectOption[];
  sectionKey: string;
  editPermission: CustomFieldEditPermission;
  displayOrder?: number;
  showInTable?: boolean;
  filterable?: boolean;
}

export interface UpdateCustomFieldDefinitionInput {
  name?: string;
  options?: SingleSelectOption[];
  sectionKey?: string;
  editPermission?: CustomFieldEditPermission;
  displayOrder?: number;
  showInTable?: boolean;
  filterable?: boolean;
  isActive?: boolean;
}

export interface UpsertCustomFieldValuesInput {
  values: { fieldDefinitionId: string; value?: string }[];
}
