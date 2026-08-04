import { useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useAddUserMutation,
  useBulkAddUsersMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useEditUserMutation,
  useUpdateUserStatusMutation,
  useChangeRoleMutation,
  useGetRoleQuery,
  useAddSimulationCreditLimitMutation,
  useGetUserImpersonatedTokenMutation,
} from "@api";
import { FilterValues } from "@components/types";
import {
  SORT_BY,
  SORT_ORDER,
  en,
  fieldId,
  fieldType,
  FilterDropdownOptions,
  userStatus,
  UserRole,
  isTierManagedRole,
  INCLUDE_PLATFORM_ADMINS,
  platformRoleFilterItems,
} from "@constants";
import {
  AddUserFormData,
  BulkAddUserFormData,
  FieldProps,
  Tenant,
  UserListUser,
  UserRoles,
} from "@types";
import { getChipValue, parseEmailList } from "@utils";

export const USERS_PAGE_SIZE = 20;
const IMPERSONATION_APP_URL = import.meta.env.VITE_IMPERSONATION_APP_URL;

/**
 * Drop the opt-in and any platform role selected under it. Leaving
 * `roles: ["SUPER_ADMIN"]` behind once those accounts are excluded again would
 * ask the backend for rows it will never return — an empty list with no visible
 * cause.
 */
const withoutPlatformAdmins = (current: FilterValues): FilterValues => ({
  ...current,
  platformAccounts: [],
  roles: current.roles.filter(role => !platformRoleFilterItems.includes(role)),
});

/**
 * @param canListPlatformAdmins whether the viewer may list accounts holding a
 * platform role (super duper admins only). Gates both the filter section and
 * the query param, so nobody else can trip the backend's 403.
 */
export function useUserManagement(tenants: Tenant[], canListPlatformAdmins = false) {
  const [search, setSearch] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [addUsermodalOpen, setAddUserModalOpen] = useState<boolean>(false);
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterValues>({
    organizations: [],
    roles: [],
    statuses: [],
    platformAccounts: [],
  });
  const [tenantIdFilters, setTenantIdFilters] = useState<string[]>([]);

  const [users, setUsers] = useState<UserListUser[]>([]);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [usersOffset, setUsersOffset] = useState<number>(0);

  const [selectedUser, setSelectedUser] = useState<UserListUser | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [roles, setRoles] = useState<UserRoles[]>([]);

  // Form default values
  const defaultUserValues = {
    name: "",
    email: "",
    externalId: "",
    tenantId: "",
    roles: [],
    simulationCreditLimit: 0,
    description: "",
  };

  // Form methods
  const userMethods = useForm({
    defaultValues: defaultUserValues,
    mode: "onChange",
  });

  // Bulk-add uses its own form (emails textarea + shared common settings).
  const defaultBulkValues = {
    emails: "",
    tenantId: "",
    roles: [],
    simulationCreditLimit: 0,
  };
  const bulkUserMethods = useForm({
    defaultValues: defaultBulkValues,
    mode: "onChange",
  });

  // Users are subscribed so invalidation triggers refetch automatically
  const [addUserdata] = useAddUserMutation();
  const [bulkAddUsers] = useBulkAddUsersMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [editUser] = useEditUserMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [changeRole] = useChangeRoleMutation();
  const [addSimulationCreditLimit] = useAddSimulationCreditLimitMutation();
  const [impersonateUser] = useGetUserImpersonatedTokenMutation();
  const { data: userRoles } = useGetRoleQuery();

  const addFilterBtnRef = useRef<HTMLButtonElement>(null);
  const includePlatformAdmins =
    canListPlatformAdmins && filters.platformAccounts.includes(INCLUDE_PLATFORM_ADMINS);
  const userParams = {
    limit: USERS_PAGE_SIZE,
    offset: usersOffset,
    sortBy: SORT_BY.CREATED_AT,
    sortOrder: SORT_ORDER.DESC,
    tenantIds: tenantIdFilters.length ? tenantIdFilters : undefined,
    roles: filters.roles.length ? filters.roles : undefined,
    statuses: filters.statuses.length ? filters.statuses : undefined,
    search: search || undefined,
    // Omitted rather than sent as false, so the request URL (and cache key) is
    // unchanged for every viewer who never touches the filter.
    includePlatformAdmins: includePlatformAdmins || undefined,
  };

  const { data: usersResponse, isFetching: isUsersFetching } = useGetUsersQuery(userParams);

  useEffect(() => {
    setUsersOffset(0);
  }, [search, filters]);

  useEffect(() => {
    if (!usersResponse) return;
    const nextData = usersResponse.data ?? [];
    if (usersOffset === 0) {
      setUsers(nextData);
    } else {
      setUsers(prev => {
        // Prevent duplicates by checking if items already exist
        const existingIds = new Set(prev.map(user => user.id));
        const newItems = nextData.filter(user => !existingIds.has(user.id));
        return [...prev, ...newItems];
      });
    }
    setUsersCount(usersResponse.count || 0);
  }, [usersResponse, usersOffset]);

  useEffect(() => {
    if (!userRoles) return;

    // Everything except the two tier roles the Super Admins tab owns and
    // CLIENT (an anonymous-chat identity, never granted by hand). INTERNAL is
    // offered here on purpose: "Ally staff" is INTERNAL alongside a normal
    // consumer role, and this picker is the only place to say so.
    const filteredRoles = userRoles.filter(
      role => !isTierManagedRole(role.name) && role.name !== UserRole.CLIENT,
    );
    setRoles(filteredRoles);
  }, [userRoles]);

  /**
   * The selected user's tier roles — held but not editable here. Shown to the
   * admin as read-only context and re-added to the change-role payload, since
   * that endpoint replaces the whole set.
   */
  const lockedRoles = useMemo(
    () => (selectedUser?.roles ?? []).filter(isTierManagedRole),
    [selectedUser],
  );

  const loadUsers = async (append = false) => {
    // Advance/reset offset to drive the subscribed query
    setUsersOffset(prev => (append ? prev + USERS_PAGE_SIZE : 0));
  };

  // Filter chips are used to display the filter chips in the list toolbar
  const filterChips = useMemo(() => {
    const chips: Array<{ label: string; value: string; allValue: string[]; onClear: () => void }> =
      [];
    if (filters.organizations.length) {
      chips.push({
        label: FilterDropdownOptions.ORGANIZATION,
        value: getChipValue(filters.organizations),
        allValue: filters.organizations,
        onClear: () => {
          setFilters(previousFilters => ({ ...previousFilters, organizations: [] }));
          setTenantIdFilters([]);
        },
      });
    }
    if (filters.roles.length) {
      chips.push({
        label: FilterDropdownOptions.ROLE,
        value: getChipValue(filters.roles),
        allValue: filters.roles,
        onClear: () => setFilters(previousFilters => ({ ...previousFilters, roles: [] })),
      });
    }
    if (filters.statuses.length) {
      chips.push({
        label: FilterDropdownOptions.STATUS,
        value: getChipValue(filters.statuses),
        allValue: filters.statuses,
        onClear: () => setFilters(previousFilters => ({ ...previousFilters, statuses: [] })),
      });
    }
    // Named rather than shown as a raw value: the chip has to make it obvious
    // why staff accounts suddenly appear in a tenant's user list.
    if (includePlatformAdmins) {
      chips.push({
        label: FilterDropdownOptions.PLATFORM_ACCOUNTS,
        value: en.userManagement.platformAccountsIncluded,
        allValue: [en.userManagement.platformAccountsIncluded],
        onClear: () => setFilters(previousFilters => withoutPlatformAdmins(previousFilters)),
      });
    }
    return chips;
  }, [filters, includePlatformAdmins]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(
      newFilters.platformAccounts.includes(INCLUDE_PLATFORM_ADMINS)
        ? newFilters
        : withoutPlatformAdmins(newFilters),
    );
    const organizationIds = newFilters.organizations
      .map(name => tenants.find(tenant => tenant.name === name)?.id)
      .filter((id): id is string => Boolean(id));
    setTenantIdFilters(organizationIds);
  };

  const getField = (userData: FieldProps[]) => {
    return userData.map(field => {
      const updatedField = { ...field };

      if (field.id === fieldId.TENANTID && field.fieldType === fieldType.DROPDOWN) {
        updatedField.options =
          tenants?.map(tenant => ({
            id: tenant.id,
            value: tenant.name,
          })) ?? [];
      }

      if (field.id === fieldId.ROLES && field.fieldType === fieldType.DROPDOWN_WITH_TAG) {
        updatedField.options =
          roles?.map(role => ({
            id: role.id,
            value: role.name,
          })) ?? [];
      }

      return updatedField;
    });
  };

  const addFilterCtaMemo = useMemo(
    () => ({
      label: en.userManagement.addFilter,
      onClick: () => setIsFilterOpen(true),
    }),
    [],
  );

  const handleOptionSelect = (option: string, user: UserListUser) => {
    setSelectedUser(user);
    setSelectedOption(option);
    const heldRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    userMethods.reset({
      name: user.name,
      email: user.email,
      externalId: user.externalId,
      tenantId: user.tenantId,
      // Tier roles are surfaced separately as read-only: prefilling them would
      // put a tag in the picker that has no matching option, so it could be
      // seen but never removed or re-added.
      roles: heldRoles.filter(role => !isTierManagedRole(role)),
    });
  };

  const handleDropdownClose = () => {
    setSelectedOption(null);
    setSelectedUser(null);
    userMethods.reset(defaultUserValues);
  };

  const handleAddUser = async (data: AddUserFormData) => {
    try {
      const payload: AddUserFormData = {
        name: data?.name,
        email: data?.email,
        roles: data?.roles,
        externalId: data?.externalId,
        tenantId: data?.tenantId,
      };
      if (data?.roles?.includes(UserRole.LEARNER)) {
        payload.simulationCreditLimit = Math.max(Number(data?.simulationCreditLimit || 0), 20);
      }
      await addUserdata(payload).unwrap();
      setAddUserModalOpen(false);
      userMethods.reset(defaultUserValues);
      handleAddUserClose();
      toast.success("User added successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add user");
    }
  };

  const handleUserAddClick = () => {
    userMethods.reset(defaultUserValues);
    setAddUserModalOpen(true);
  };

  const handleBulkAddClick = () => {
    bulkUserMethods.reset(defaultBulkValues);
    setBulkAddModalOpen(true);
  };

  const handleBulkAddClose = () => {
    setBulkAddModalOpen(false);
    bulkUserMethods.reset(defaultBulkValues);
  };

  const handleBulkAddUser = async (data: BulkAddUserFormData) => {
    try {
      // parseEmailList splits the textarea on newlines/commas/semicolons and
      // de-dupes. Backend still validates format + existing accounts and
      // rejects the whole batch all-or-nothing.
      const emails = parseEmailList(data?.emails);
      if (emails.length === 0) {
        toast.error(en.userManagement.bulkAddUsersEmptyError);
        return;
      }
      const payload = {
        emails,
        roles: data?.roles,
        tenantId: data?.tenantId,
        ...(data?.roles?.includes(UserRole.LEARNER)
          ? { simulationCreditLimit: Math.max(Number(data?.simulationCreditLimit || 0), 20) }
          : {}),
      };
      const response = await bulkAddUsers(payload).unwrap();
      handleBulkAddClose();
      toast.success(en.userManagement.bulkAddUsersSuccess(response?.created ?? emails.length));
    } catch (error: any) {
      toast.error(error?.data?.message || en.userManagement.bulkAddUsersFailed);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    try {
      if (userId) {
        await deleteUser({ userId }).unwrap();
        handleDropdownClose();
        toast.success(en.userManagement.userRemoved);
      } else {
        toast.error(en.errors.userIdNotFound);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedToRemoveUser);
    }
  };

  const handleEditUser = async (data: {
    id: number;
    email: string;
    name: string;
    externalId: string;
  }) => {
    try {
      const payload = {
        id: Number(data?.id),
        data: {
          email: data?.email,
          name: data?.name,
          externalId: data?.externalId,
        },
      };

      await editUser(payload).unwrap();
      handleDropdownClose();
      toast.success("User updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update user");
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    try {
      const payload = {
        userId: selectedUser.id,
        status: userStatus.SUSPENDED,
      };

      await updateUserStatus(payload).unwrap();
      handleDropdownClose();
      toast.success("User suspended successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to suspend user");
    }
  };

  const handleActivateUser = async () => {
    if (!selectedUser) return;
    try {
      const payload = {
        userId: selectedUser.id,
        status: userStatus.ACTIVE,
      };
      await updateUserStatus(payload).unwrap();
      handleDropdownClose();
      toast.success("User activated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to activate user");
    }
  };

  const handleChangeRole = async (data: any) => {
    try {
      // Union the picker's selection with the tier roles it never offered, then
      // resolve ids against the *full* role list: `roles` excludes the tier, so
      // resolving there would map SUPER_DUPER_ADMIN to undefined and the
      // backend would reject the payload (or, worse, drop the role).
      const selectedRoleNames: string[] = data.roles || [];
      const roleNames = Array.from(new Set([...selectedRoleNames, ...lockedRoles]));
      const groupIds = roleNames
        .map(name => (userRoles ?? []).find(role => role.name === name)?.id)
        .filter((id): id is number => id != null);

      if (groupIds.length !== roleNames.length) {
        toast.error(en.userManagement.changeRoleUnknownRole);
        return;
      }

      const payload = {
        userId: data.id,
        groupIds,
      };
      await changeRole(payload).unwrap();
      handleDropdownClose();
      toast.success("User role changed successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to change user role");
    }
  };

  const handleImpersonateUser = async (userData: any) => {
    try {
      const payload = {
        email: userData.email,
      };
      const response: any = await impersonateUser(payload).unwrap();
      const params = new URLSearchParams({
        accessToken: response?.data.accessToken,
        refreshToken: response?.data.refreshToken,
        impersonatedByAccessToken: localStorage.getItem("adminAccessToken"),
      });

      window.open(`${IMPERSONATION_APP_URL}/impersonate?${params.toString()}`, "_blank");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to impersonate user");
    }
  };

  const handleAddCredit = async (data: any) => {
    if (!selectedUser) return;
    try {
      const payload = {
        userId: selectedUser.id,
        creditLimit: Number(data.simulationCreditLimit),
      };
      await addSimulationCreditLimit(payload).unwrap();
      handleDropdownClose();
      toast.success("Credit added successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add credit");
    }
  };

  const handleAddUserClose = () => {
    setAddUserModalOpen(false);
    userMethods.reset();
  };

  return {
    // state
    search,
    setSearch,
    isFilterOpen,
    setIsFilterOpen,
    addFilterBtnRef,
    selectedUser,
    setSelectedUser,
    selectedOption,
    setSelectedOption,
    roles,
    setRoles,

    // filters
    filters,
    handleApplyFilters,
    addFilterCtaMemo,
    includePlatformAdmins,

    // roles the selected user holds that this tab shows but cannot change
    lockedRoles,

    // data
    users,
    usersCount,
    usersOffset,
    loadUsers,
    isUsersFetching,

    // chips
    filterChips,

    // form methods
    userMethods,
    bulkUserMethods,

    // handlers
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

    // user operations
    getField,
    addUserdata,
    addUsermodalOpen,
    setAddUserModalOpen,
    bulkAddModalOpen,
    setBulkAddModalOpen,
    deleteUser,
    editUser,
    changeRole,
  };
}
