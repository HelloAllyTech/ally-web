import React, { FC } from "react";

import { toast } from "sonner";

import {
  Tabs,
  ListToolbar,
  FilterDropdown,
  UserList,
  OrganizationList,
  EmptyState,
  UserListLoader,
  OrganizationListLoader,
  UserModal,
  ActionConfirmationPopup,
} from "@components";
import {
  addNewOrganizationModal,
  addUser,
  changeUserRoles,
  en,
  userEditModal,
  UserMenuOptions,
} from "@constants";
import { TabType } from "@types";

import { useOrganizationManagement } from "./useOrganizationManagement";
import { useUserManagement } from "./useUserManagement";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

export const UserManagement: FC = () => {
  // Organization management hook
  const {
    tenantsCount,
    orgSearch,
    setOrgSearch,
    addOrganizationModalOpen,
    selectedTenant,
    tenants,
    loadTenants,
    isTenantsFetching,
    filteredTenants,
    tenantMethods,
    handleNewgroupClick,
    onEditTenant,
    handleTenantFormSubmit,
    onCloseOrganizationEditModal,
  } = useOrganizationManagement();

  // User management hook (depends on tenants)
  const {
    usersCount,
    activeTab,
    search,
    setSearch,
    isFilterOpen,
    setIsFilterOpen,
    addFilterBtnRef,
    setRoleFilters,
    setStatusFilters,
    onApplyOrganizations,
    users,
    loadUsers,
    isUsersFetching,
    filterChips,
    getField,
    addUsermodalOpen,
    setAddUserModalOpen,
    handleTabChange,
    selectedUser,
    selectedOption,
    addFilterCtaMemo,
    userMethods,
    handleOptionSelect,
    handleDropdownClose,
    handleAddUser,
    handleRemoveUser,
    handleEditUser,
    handleSuspendUser,
    handleChangeRole,
    handleActivateUser,
  } = useUserManagement(tenants);

  const TABS = [
    { id: TabType.USERS, label: en.userManagement.users, count: usersCount },
    { id: TabType.ORGANIZATIONS, label: en.userManagement.organizations, count: tenantsCount },
  ];

  const renderEditModal = () => {
    switch (selectedOption) {
      case UserMenuOptions.EDIT_DETAILS:
        return (
          <UserModal
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.editDetails}
            fields={getField(userEditModal)}
            details={selectedUser}
            formMethods={userMethods}
            handleClick={handleEditUser}
          />
        );
      case UserMenuOptions.CHANGE_ROLE:
        return (
          <UserModal
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.changeRole}
            fields={getField(changeUserRoles)}
            details={selectedUser}
            buttonName={en.userManagement.confirm}
            formMethods={userMethods}
            handleClick={handleChangeRole}
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
              variant: "secondary",
            }}
            primaryButton={{
              label: en.userManagement.suspendUser,
              onClick: () => handleSuspendUser(),
              variant: "destructive",
            }}
          />
        );
      case UserMenuOptions.ACTIVATE_USER:
        return (
          <ActionConfirmationPopup
            isOpen={true}
            onClose={handleDropdownClose}
            title={en.userManagement.activateUser}
            description={en.userManagement.activateUserConfirmation(selectedUser?.name ?? "")}
            secondaryButton={{
              label: en.userManagement.cancel,
              onClick: handleDropdownClose,
              variant: "secondary",
            }}
            primaryButton={{
              label: en.userManagement.activateUser,
              onClick: () => handleActivateUser(),
              variant: "primary",
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
              variant: "secondary",
            }}
            primaryButton={{
              label: en.userManagement.removeUser,
              onClick: () => handleRemoveUser(selectedUser?.id),
              variant: "destructive",
            }}
          />
        );
      case UserMenuOptions.ADD_CREDIT:
        toast.success("This feature is not available yet");
        return null;

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
          className="inline-flex font-['Roboto'] items-center disabled:opacity-50 text-sm text-gray-600 font-medium py-1 px-1"
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
              action={{
                label: en.userManagement.addUser,
                onClick: () => setAddUserModalOpen(true),
              }}
            />

            <UserModal
              isOpen={addUsermodalOpen}
              onClose={() => setAddUserModalOpen(false)}
              title={en.userManagement.noUsersActionLabel}
              fields={getField(addUser)}
              buttonName={en.userManagement.addUser}
              formMethods={userMethods}
              handleClick={handleAddUser}
            />

            <FilterDropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              organizations={tenants.map(org => org.name)}
              onApplyOrganizations={onApplyOrganizations}
              onApplyRoles={names => setRoleFilters(names)}
              onApplyStatuses={names => setStatusFilters(names)}
              anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
            />

            {users.length === 0 && isUsersFetching ? (
              <UserListLoader />
            ) : users.length === 0 && !isUsersFetching ? (
              <EmptyState
                title={en.userManagement.noUsers}
                subtitle={en.userManagement.noUsersSubtitle}
                actionLabel={en.userManagement.noUsersActionLabel}
                hideActionButton={true}
              />
            ) : (
              <UserList
                users={users}
                formatDate={formatDate}
                onOptionSelect={handleOptionSelect}
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
              action={{ label: "New group", onClick: handleNewgroupClick }}
            />
            <UserModal
              isOpen={addOrganizationModalOpen}
              onClose={onCloseOrganizationEditModal}
              title={
                selectedTenant
                  ? en.userManagement.editOrganization
                  : en.userManagement.noOrganizationActionLabel
              }
              buttonName={selectedTenant ? en.common.update : en.userManagement.addOrganization}
              fields={addNewOrganizationModal}
              formMethods={tenantMethods}
              handleClick={handleTenantFormSubmit}
            />
            {tenants.length === 0 && isTenantsFetching ? (
              <OrganizationListLoader />
            ) : tenants.length === 0 && !isTenantsFetching ? (
              <EmptyState
                title={en.userManagement.noOrganization}
                subtitle={en.userManagement.noOrganizationSubtitle}
                actionLabel={en.userManagement.noOrganizationActionLabel}
                hideActionButton={true}
              />
            ) : (
              <OrganizationList
                organizations={filteredTenants}
                onEditPress={onEditTenant}
                formatDate={formatDate}
                renderFooter={() =>
                  renderFooter(loadTenants, isTenantsFetching, tenantsCount > tenants.length)
                }
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 font-['IBM_Plex_Serif'] h-[100vh] overflow-y-hidden">
      <h1 className="text-[24px] font-normal text-gray-800">{en.userManagement.userManagement}</h1>
      <Tabs items={TABS} activeId={activeTab} onChange={id => handleTabChange(id as TabType)} />
      {renderBody()}
    </div>
  );
};
