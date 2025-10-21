import { useEffect, useMemo, useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useAddUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useEditUserMutation,
  useUpdateUserStatusMutation,
  useChangeRoleMutation,
  useGetRoleQuery,
} from "@api";
import { FilterValues } from "@components/types";
import { ROUTES, SORT_BY, SORT_ORDER, en, fieldId, fieldType, userStatus } from "@constants";
import { AddUserFormData, FieldProps, TabType, Tenant, UserListUser, UserRoles } from "@types";

export const USERS_PAGE_SIZE = 20;

export function useUserManagement(tenants: Tenant[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [addUsermodalOpen, setAddUserModalOpen] = useState<boolean>(false);

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
    credits: { consumedCredits: 0, newCredits: 0 },
    description: "",
  };

  // Form methods
  const userMethods = useForm({
    defaultValues: defaultUserValues,
    mode: "onChange",
  });

  // Users are subscribed so invalidation triggers refetch automatically
  const [addUserdata] = useAddUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [editUser] = useEditUserMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [changeRole] = useChangeRoleMutation();
  const { data: userRoles } = useGetRoleQuery();

  const addFilterBtnRef = useRef<HTMLButtonElement>(null);

  const activeTab = useMemo<TabType>(() => {
    const queryParam = (location.search || "").replace("?", "");
    return queryParam === TabType.ORGANIZATIONS ? TabType.ORGANIZATIONS : TabType.USERS;
  }, [location.search]);

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

  // Ensure default query param
  useEffect(() => {
    const queryParam = (location.search || "").replace("?", "");
    if (queryParam !== TabType.USERS && queryParam !== TabType.ORGANIZATIONS) {
      navigate(`${ROUTES.USER_MANAGEMENT}?${TabType.USERS}`, { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!userRoles) return;
    setRoles(userRoles);
  }, [userRoles]);

  const loadUsers = async (append = false) => {
    // Advance/reset offset to drive the subscribed query
    setUsersOffset(prev => (append ? prev + USERS_PAGE_SIZE : 0));
  };

  const filterChips = useMemo(() => {
    const chips: Array<{ label: string; value: string; onClear: () => void }> = [];
    if (filters.organizations.length) {
      const value =
        filters.organizations.length > 1
          ? `${filters.organizations[0]} +${filters.organizations.length - 1}`
          : filters.organizations[0];
      chips.push({
        label: en.userManagement.organization,
        value,
        onClear: () => {
          setFilters(previousFilters => ({ ...previousFilters, organizations: [] }));
          setTenantIdFilters([]);
        },
      });
    }
    if (filters.roles.length) {
      const value =
        filters.roles.length > 1
          ? `${filters.roles[0]} +${filters.roles.length - 1}`
          : filters.roles[0];
      chips.push({
        label: "Role",
        value,
        onClear: () => setFilters(previousFilters => ({ ...previousFilters, roles: [] })),
      });
    }
    if (filters.statuses.length) {
      const value = filters.statuses?.join(", ");
      chips.push({
        label: "Status",
        value,
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

  const handleTabChange = (tab: TabType) => {
    navigate(`${ROUTES.USER_MANAGEMENT}?${tab}`);
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
      externalId: user.telephonyId,
      tenantId: user.tenantId,
      roles: user.roles || [],
    });
  };

  const handleDropdownClose = () => {
    setSelectedOption(null);
    setSelectedUser(null);
    userMethods.reset(defaultUserValues);
  };

  const handleAddUser = async (data: AddUserFormData) => {
    try {
      const payload = {
        name: data?.name,
        email: data?.email,
        roles: data?.roles,
        externalId: data?.externalId,
        tenantId: data?.tenantId,
        credits: data?.credits,
      };
      await addUserdata(payload).unwrap();
      setAddUserModalOpen(false);
      userMethods.reset(defaultUserValues);
      toast.success("User added successfully");
      // no manual reload required; subscribed query refetches due to invalidation
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add user");
    }
  };

  const handleUserAddClick = () => {
    userMethods.reset(defaultUserValues);
    setAddUserModalOpen(true);
  };

  const handleRemoveUser = async (userId: number) => {
    try {
      if (userId) {
        await deleteUser({ userId }).unwrap();
        handleDropdownClose();
        toast.success("User removed successfully");
      } else {
        toast.error("User id not found");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to remove user");
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

  const handleAddUserClose = () => {
    setAddUserModalOpen(false);
    userMethods.reset();
  };

  return {
    // state
    activeTab,
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

    // handlers
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

    // user operations
    getField,
    addUserdata,
    addUsermodalOpen,
    setAddUserModalOpen,
    deleteUser,
    editUser,
    changeRole,

    // routing/tab
    handleTabChange,
  };
}
