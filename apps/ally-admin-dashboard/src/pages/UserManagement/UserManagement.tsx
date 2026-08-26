import { FC, useCallback, useMemo } from "react";

import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useListPlatformAdminsQuery } from "@api";
import {
  ListToolbar,
  FilterDropdown,
  UserList,
  OrganizationList,
  EmptyState,
  UserListLoader,
  OrganizationListLoader,
  UserModal,
  ActionConfirmationPopup,
  StatusBadge,
  AssignedOrganizations,
} from "@components";
import { ButtonVariant, FilterValues } from "@components/types";
import {
  addCredit,
  addNewOrganizationModal,
  addUser,
  bulkAddUser,
  changeUserRoles,
  en,
  userEditModal,
  UserMenuOptions,
  ROUTES,
  userRoleItems,
  platformRoleFilterItems,
  PLATFORM_MANAGED_ROLES,
  userStatusItems,
  FilterDropdownOptions,
  userStatus,
  USER_MANAGEMENT_TABS,
  USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_1,
  USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_2,
  UserRole,
  Permissions,
  FeatureToggleKey,
} from "@constants";
import { RootState } from "@store";
import { TabType } from "@types";
import { formatCapitalizedEnum, hasFeature } from "@utils";

import { useOrganizationManagement } from "./useOrganizationManagement";
import { useUserManagement } from "./useUserManagement";
import { SuperAdmins } from "../SuperAdmins/SuperAdmins";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

export const UserManagement: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = useSelector((state: RootState) => state.user.permissions);
  const features = useSelector((state: RootState) => state.user.features);
  const canEditMultiTenantAdmins = permissions.includes(Permissions.EDIT_MULTI_TENANT_ADMINS);
  const canEditUser = permissions.includes(Permissions.EDIT_USER);
  const canManagePlatformAdmins = hasFeature(features, FeatureToggleKey.ADMIN_USER_MANAGEMENT);
  // Platform accounts are now always part of the Users list rather than an
  // opt-in filter, so this has to match the backend's own gate exactly: the
  // flag rides on every users request, and a mismatch would 403 the whole list
  // instead of just one filter.
  const canListPlatformAdmins = permissions.includes(Permissions.VIEW_SUPER_DUPER_ADMINS);

  // Platform-admin count for the tab strip. RTK Query shares this cache entry
  // with the SuperAdmins tab itself, so no duplicate request is made.
  const { data: platformAdminsForCount } = useListPlatformAdminsQuery(undefined, {
    skip: !canManagePlatformAdmins,
  });
  const superAdminTierCount = platformAdminsForCount?.count ?? 0;

  const requestedTab = (searchParams.get("tab") as TabType) || TabType.USERS;
  // The Ally admins tab is gated; a deep link to it from anyone else falls
  // back to Users (the backing endpoints would 403 anyway).
  const activeTab =
    requestedTab === TabType.SUPER_ADMINS && !canManagePlatformAdmins
      ? TabType.USERS
      : requestedTab;

  // Organization management hook
  const {
    dashboardSettingsAll,
    tenantsCount,
    orgSearch,
    setOrgSearch,
    addOrganizationModalOpen,
    selectedTenant,
    tenants,
    loadTenants,
    isTenantsFetching,
    tenantMethods,
    handleNewgroupClick,
    onEditTenant,
    handleTenantFormSubmit,
    onCloseOrganizationEditModal,
    logoUpload,
  } = useOrganizationManagement();

  // User management hook (depends on tenants)
  const {
    usersCount,
    search,
    setSearch,
    isFilterOpen,
    setIsFilterOpen,
    addFilterBtnRef,
    filters,
    handleApplyFilters,
    users,
    loadUsers,
    isUsersFetching,
    filterChips,
    getField,
    addUsermodalOpen,
    bulkAddModalOpen,
    selectedUser,
    selectedOption,
    addFilterCtaMemo,
    userMethods,
    bulkUserMethods,
    handleOptionSelect,
    handleDropdownClose,
    handleAddUser,
    handleBulkAddUser,
    handleBulkAddClick,
    handleBulkAddClose,
    handleRemoveUser,
    handleEditUser,
    handleSuspendUser,
    handleChangeRole,
    handleImpersonateUser,
    handleActivateUser,
    handleAddUserClose,
    handleUserAddClick,
    handleAddCredit,
    includePlatformAdmins,
  } = useUserManagement(tenants, canListPlatformAdmins);

  const watchedRoles = userMethods.watch("roles") || [];

  const isMultiTenantAdmin =
    watchedRoles.includes(UserRole.MULTI_TENANT_ADMIN) ||
    selectedUser?.role === UserRole.MULTI_TENANT_ADMIN ||
    selectedUser?.roles?.includes(UserRole.MULTI_TENANT_ADMIN);

  // Platform tiers aren't in the picker (the Ally admins tab owns them), so
  // without this the modal would look as though the account holds only its app
  // roles — and saving would look like it had dropped the rest.
  const heldPlatformRoles = (selectedUser?.roles ?? []).filter(role =>
    PLATFORM_MANAGED_ROLES.includes(role),
  );
  const platformRolesNote = heldPlatformRoles.length ? (
    <div className="text-sm text-typography-600 bg-background-secondary p-3 rounded-lg border border-border-light italic">
      {en.userManagement.platformRolesKept(
        heldPlatformRoles
          .map(role =>
            role === UserRole.PLATFORM_ADMIN
              ? en.userManagement.allyAdminRole
              : formatCapitalizedEnum(role),
          )
          .join(", "),
      )}
    </div>
  ) : null;

  const TABS = [
    { id: TabType.USERS, label: en.userManagement.users, count: usersCount },
    { id: TabType.ORGANIZATIONS, label: en.userManagement.organizations, count: tenantsCount },
    ...(canManagePlatformAdmins
      ? [{ id: TabType.SUPER_ADMINS, label: en.superAdmins.title, count: superAdminTierCount }]
      : []),
  ];

  const logoValue = tenantMethods.watch("logoUrl");
  const enabledDashboardIds = tenantMethods.watch("enabledDashboardIds") ?? [];
  const enableMicrophoneMode = tenantMethods.watch("enableMicrophoneMode");
  const enableAudioUpload = tenantMethods.watch("enableAudioUpload");
  const hideRankInCommunity = tenantMethods.watch("hideRankInCommunity");
  const isTestOrganization = tenantMethods.watch("isTestOrganization");

  const getSettingValue = useCallback(
    (optionId: string): boolean => {
      switch (optionId) {
        case "enableMicrophoneMode":
          return enableMicrophoneMode;
        case "enableAudioUpload":
          return enableAudioUpload;
        case "hideRankInCommunity":
          return hideRankInCommunity;
        case "isTestOrganization":
          return isTestOrganization;
        default:
          return false;
      }
    },
    [enableMicrophoneMode, enableAudioUpload, hideRankInCommunity, isTestOrganization],
  );

  const optionValues = useMemo(
    () => [
      ...USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_1.map(option => {
        const dashboardId =
          dashboardSettingsAll?.find(setting => setting.analyticsType === option.type)?.id ?? "";
        return {
          id: dashboardId,
          value: enabledDashboardIds.includes(dashboardId),
          label: option.label,
          onClick: (enabled: boolean) => {
            const currentEnabledDashboardIds = tenantMethods.getValues("enabledDashboardIds") ?? [];
            if (enabled) {
              // Add the id to enabledDashboardIds if not already present
              if (!currentEnabledDashboardIds.includes(dashboardId)) {
                tenantMethods.setValue(
                  "enabledDashboardIds",
                  [...currentEnabledDashboardIds, dashboardId],
                  { shouldDirty: true },
                );
              }
            } else {
              // Remove the id from enabledDashboardIds
              tenantMethods.setValue(
                "enabledDashboardIds",
                currentEnabledDashboardIds.filter((id: string) => id !== dashboardId),
                { shouldDirty: true },
              );
            }
          },
        };
      }),
      ...USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_2.map(option => ({
        id: option.id,
        value: getSettingValue(option.id),
        label: option.label,
        onClick: (enabled: boolean) => {
          tenantMethods.setValue(
            option.id as
              | "enableMicrophoneMode"
              | "enableAudioUpload"
              | "hideRankInCommunity"
              | "isTestOrganization",
            enabled,
            { shouldDirty: true },
          );
        },
      })),
    ],
    [dashboardSettingsAll, tenantMethods, enabledDashboardIds, getSettingValue],
  );
  const renderEditModal = () => {
    switch (selectedOption) {
      case UserMenuOptions.EDIT_DETAILS:
        return (
          <UserModal
            onClose={handleDropdownClose}
            title={en.userManagement.editDetails}
            fields={getField(userEditModal)}
            details={selectedUser}
            formMethods={userMethods}
            handleClick={handleEditUser}
            extraContent={
              isMultiTenantAdmin ? (
                <AssignedOrganizations
                  userId={selectedUser?.id as number}
                  canEdit={canEditMultiTenantAdmins}
                  allTenants={tenants}
                />
              ) : undefined
            }
          />
        );
      case UserMenuOptions.CHANGE_ROLE:
        return (
          <UserModal
            onClose={handleDropdownClose}
            title={en.userManagement.changeRole}
            fields={getField(changeUserRoles)}
            details={selectedUser}
            buttonName={en.userManagement.confirm}
            formMethods={userMethods}
            handleClick={handleChangeRole}
            extraContent={
              platformRolesNote || isMultiTenantAdmin ? (
                <div className="flex flex-col gap-3">
                  {platformRolesNote}
                  {isMultiTenantAdmin && (
                    <AssignedOrganizations
                      userId={selectedUser?.id as number}
                      canEdit={canEditMultiTenantAdmins}
                      allTenants={tenants}
                    />
                  )}
                </div>
              ) : undefined
            }
          />
        );
      case UserMenuOptions.MANAGE_CREDITS:
        return (
          <UserModal
            onClose={handleDropdownClose}
            title={en.userManagement.manageCredit}
            fields={addCredit}
            formMethods={userMethods}
            buttonName={en.common.update}
            details={selectedUser}
            handleClick={handleAddCredit}
          />
        );
      case UserMenuOptions.SUSPEND_USER:
        return (
          <ActionConfirmationPopup
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.suspendUser}
            description={en.userManagement.suspendUserConfirmation(selectedUser?.name ?? "")}
            secondaryButton={{
              label: en.userManagement.cancel,
              onClick: handleDropdownClose,
              variant: ButtonVariant.SECONDARY,
            }}
            primaryButton={{
              label: en.userManagement.suspendUser,
              onClick: () => handleSuspendUser(),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
          />
        );
      case UserMenuOptions.GRANT_ACCESS:
        return (
          <ActionConfirmationPopup
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.grantAccess}
            description={en.userManagement.grantAccessConfirmation(selectedUser?.name ?? "")}
            secondaryButton={{
              label: en.userManagement.cancel,
              onClick: handleDropdownClose,
              variant: ButtonVariant.SECONDARY,
            }}
            primaryButton={{
              label: en.userManagement.grantAccess,
              onClick: () => handleActivateUser(),
              variant: ButtonVariant.PRIMARY,
            }}
          />
        );
      case UserMenuOptions.REMOVE_USER:
        return (
          <ActionConfirmationPopup
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.removeUser}
            description={en.userManagement.removeUserConfirmation(selectedUser?.name ?? "")}
            secondaryButton={{
              label: en.userManagement.cancel,
              onClick: handleDropdownClose,
              variant: ButtonVariant.SECONDARY,
            }}
            primaryButton={{
              label: en.userManagement.removeUser,
              onClick: () => handleRemoveUser(selectedUser?.id),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
          />
        );
      case UserMenuOptions.IMPERSONATE_USER:
        return (
          <ActionConfirmationPopup
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.impersonateUser}
            description={en.userManagement.impersonateUserConfirmation(selectedUser?.name ?? "")}
            secondaryButton={{
              label: en.userManagement.cancel,
              onClick: handleDropdownClose,
              variant: ButtonVariant.SECONDARY,
            }}
            primaryButton={{
              label: en.userManagement.impersonate,
              onClick: () => {
                handleImpersonateUser(selectedUser);
                handleDropdownClose();
              },
              variant: ButtonVariant.PRIMARY,
            }}
          />
        );

      default:
        return null;
    }
  };

  const renderFooter = (
    onLoadMore: (append: boolean) => void,
    disabled: boolean,
    hasMore: boolean,
  ) => {
    if (!hasMore) return null;
    return (
      <div className="flex justify-start mt-2">
        <button
          onClick={() => onLoadMore(true)}
          disabled={disabled}
          className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
        >
          + {isUsersFetching ? en.common.loading : en.common.loadMore}
        </button>
      </div>
    );
  };

  const renderBody = () => {
    switch (activeTab) {
      case TabType.USERS:
        return (
          <div className="space-y-4">
            <ListToolbar
              searchValue={search}
              onSearchChange={setSearch}
              filterChips={filterChips}
              addFilterCta={addFilterCtaMemo}
              addFilterButtonRef={addFilterBtnRef}
              action={
                canEditUser
                  ? {
                      label: en.userManagement.addUser,
                      onClick: handleUserAddClick,
                    }
                  : undefined
              }
              secondaryAction={
                canEditUser
                  ? {
                      label: en.userManagement.bulkAddUsers,
                      onClick: handleBulkAddClick,
                      variant: ButtonVariant.SECONDARY,
                    }
                  : undefined
              }
            />

            <UserModal
              isOpen={addUsermodalOpen}
              onClose={handleAddUserClose}
              title={en.userManagement.noUsersActionLabel}
              fields={getField(addUser)}
              buttonName={en.userManagement.addUser}
              formMethods={userMethods}
              handleClick={handleAddUser}
              extraContent={
                isMultiTenantAdmin ? (
                  <div className="text-sm text-typography-600 bg-background-secondary p-3 rounded-lg border border-border-light italic">
                    {en.userManagement.noAssignedOrganizations}. Organizations can be assigned after
                    the user is created.
                  </div>
                ) : undefined
              }
            />

            <UserModal
              isOpen={bulkAddModalOpen}
              onClose={handleBulkAddClose}
              title={en.userManagement.bulkAddUsersTitle}
              fields={getField(bulkAddUser)}
              buttonName={en.userManagement.bulkAddUsers}
              formMethods={bulkUserMethods}
              handleClick={handleBulkAddUser}
              extraContent={
                <div className="text-sm text-typography-600 bg-background-secondary p-3 rounded-lg border border-border-light italic">
                  {en.userManagement.bulkAddUsersHint}
                </div>
              }
            />

            <FilterDropdown<FilterValues>
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              currentFilters={filters}
              onApplyFilters={handleApplyFilters}
              anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
              sections={[
                {
                  id: "roles",
                  label: FilterDropdownOptions.ROLE,
                  // The platform roles are only worth offering to a viewer whose
                  // list actually contains those accounts.
                  options: [
                    ...userRoleItems,
                    ...(includePlatformAdmins ? platformRoleFilterItems : []),
                  ].map(role => ({ label: role, value: role })),
                  renderOption: option => formatCapitalizedEnum(option.value),
                },
                {
                  id: "organizations",
                  label: FilterDropdownOptions.ORGANIZATION,
                  options: tenants.map(org => ({ label: org.name, value: org.name })),
                },
                {
                  id: "statuses",
                  label: FilterDropdownOptions.STATUS,
                  options: userStatusItems.map(status => ({ label: status, value: status })),
                  renderOption: option =>
                    option.value === userStatus.SUSPENDED || option.value === userStatus.ACTIVE ? (
                      <StatusBadge status={option.value} />
                    ) : (
                      formatCapitalizedEnum(option.value)
                    ),
                },
              ]}
            />

            {users.length === 0 && isUsersFetching ? (
              <UserListLoader />
            ) : users.length === 0 && !isUsersFetching ? (
              <EmptyState
                title={en.userManagement.noUsers}
                subtitle={en.userManagement.noUsersSubtitle}
              />
            ) : (
              <UserList
                users={users}
                formatDate={formatDate}
                onOptionSelect={handleOptionSelect}
                canEditUser={canEditUser}
                renderFooter={() =>
                  renderFooter(loadUsers, isUsersFetching, usersCount > users.length)
                }
              />
            )}

            {selectedOption && renderEditModal()}
          </div>
        );
      case TabType.ORGANIZATIONS:
        return (
          <div className="space-y-4">
            <ListToolbar
              searchValue={orgSearch}
              onSearchChange={setOrgSearch}
              action={
                canEditUser
                  ? { label: en.userManagement.addOrganization, onClick: handleNewgroupClick }
                  : undefined
              }
            />
            <UserModal
              hasTabs={true}
              optionValues={optionValues}
              tabOptions={USER_MANAGEMENT_TABS}
              isOpen={addOrganizationModalOpen}
              onClose={onCloseOrganizationEditModal}
              title={
                selectedTenant
                  ? en.userManagement.editOrganization
                  : en.userManagement.noOrganizationActionLabel
              }
              buttonName={selectedTenant ? en.common.save : en.userManagement.addOrganization}
              fields={addNewOrganizationModal}
              formMethods={tenantMethods}
              details={selectedTenant}
              handleClick={handleTenantFormSubmit}
              imageUpload
              uploadId="logoUrl"
              uploadButtonName={
                logoValue || selectedTenant?.logoUrl
                  ? en.userManagement.changeLogo
                  : en.userManagement.uploadLogo
              }
              uploadTitle="Logo"
              uploadImageUrl={logoUpload}
            />
            {isTenantsFetching ? (
              <OrganizationListLoader />
            ) : tenants.length === 0 ? (
              <EmptyState
                title={en.userManagement.noOrganization}
                subtitle={en.userManagement.noOrganizationSubtitle}
              />
            ) : (
              <OrganizationList
                organizations={tenants}
                onEditPress={onEditTenant}
                onRowClick={tenant => navigate(ROUTES.ORGANIZATION_DETAIL(tenant.id))}
                formatDate={formatDate}
                renderFooter={() =>
                  renderFooter(loadTenants, isTenantsFetching, tenantsCount > tenants.length)
                }
              />
            )}
          </div>
        );
      case TabType.SUPER_ADMINS:
        return canManagePlatformAdmins ? <SuperAdmins /> : null;
    }
  };

  return (
    <div className="space-y-6 font-primary h-[100vh] overflow-y-hidden">
      <h1 className="text-2xl font-normal text-typography-900 font-secondary">
        {en.userManagement.users}
      </h1>
      <Tabs items={TABS} activeId={activeTab} onChange={id => setSearchParams({ tab: id })} />
      {renderBody()}
    </div>
  );
};
