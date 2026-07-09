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
  isSuperAdminRole,
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

export function useUserManagement(tenants: Tenant[]) {
  const [search, setSearch] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [addUsermodalOpen, setAddUserModalOpen] = useState<boolean>(false);
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterValues>({
    organizations: [],
    roles: [],
    statuses: [],
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
  const userParams = {
    limit: USERS_PAGE_SIZE,
    offset: usersOffset,
    sortBy: SORT_BY.CREATED_AT,
    sortOrder: SORT_ORDER.DESC,
    tenantIds: tenantIdFilters.length ? tenantIdFilters : undefined,
    roles: filters.roles.length ? filters.roles : undefined,
    statuses: filters.statuses.length ? filters.statuses : undefined,
    search: search || undefined,
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

    const filteredRoles = userRoles.filter(
      role => !isSuperAdminRole(role.name) && role.name !== UserRole.CLIENT,
    );
    setRoles(filteredRoles);
  }, [userRoles]);

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
    return chips;
  }, [filters]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
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
    userMethods.reset({
      name: user.name,
      email: user.email,
      externalId: user.externalId,
      tenantId: user.tenantId,
      roles: user.roles?.length ? user.roles : user.role ? [user.role] : [],
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
      const selectedRoleNames = data.roles || [];
      const groupIds = selectedRoleNames.map(name => roles.find(role => role.name === name)?.id);
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
