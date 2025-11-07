import { FC } from "react";

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
import { ButtonVariant } from "@components/types";
import {
  addCredit,
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
    filters,
    handleApplyFilters,
    users,
    loadUsers,
    isUsersFetching,
    filterChips,
    getField,
    addUsermodalOpen,
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
    handleAddUserClose,
    handleUserAddClick,
    handleAddCredit,
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
            onClose={handleDropdownClose}
            title={en.userManagement.changeRole}
            fields={getField(changeUserRoles)}
            details={selectedUser}
            buttonName={en.userManagement.confirm}
            formMethods={userMethods}
            handleClick={handleChangeRole}
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
          className="inline-flex font-tertiary items-center disabled:opacity-50 text-sm text-typography-600 font-medium py-1 px-1 hover:text-typography-700"
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
                onClick: handleUserAddClick,
              }}
            />

            <UserModal
              isOpen={addUsermodalOpen}
              onClose={handleAddUserClose}
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
              onApplyFilters={handleApplyFilters}
              anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
              currentFilters={filters}
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
              action={{ label: en.userManagement.addOrganization, onClick: handleNewgroupClick }}
            />
            <UserModal
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
    <div className="space-y-6 font-primary h-[100vh] overflow-y-hidden">
      <h1 className="text-2xl font-normal text-typography-900">
        {en.userManagement.userManagement}
      </h1>
      <Tabs items={TABS} activeId={activeTab} onChange={id => handleTabChange(id as TabType)} />
      {renderBody()}
    </div>
  );
};
