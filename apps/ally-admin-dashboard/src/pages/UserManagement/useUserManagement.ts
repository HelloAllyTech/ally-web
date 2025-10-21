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
import { ROUTES, SORT_BY, SORT_ORDER, en, fieldId, fieldType, userStatus } from "@constants";
import { AddUserFormData, FieldProps, TabType, Tenant, UserListUser, UserRoles } from "@types";

export const USERS_PAGE_SIZE = 20;

export function useUserManagement(tenants: Tenant[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [addUsermodalOpen, setAddUserModalOpen] = useState<boolean>(false);

  const [orgFilters, setOrgFilters] = useState<string[]>([]);
  const [tenantIdFilters, setTenantIdFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

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
    telephonyId: "",
    tenantId: "",
    roles: [],
    credits: 0,
    description: "",
  };

  // Form methods
  const userMethods = useForm({
    defaultValues: defaultUserValues,
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
    roles: roleFilters.length ? roleFilters : undefined,
    statuses: statusFilters.length ? statusFilters : undefined,
    search: search || undefined,
  };

  const { data: usersResponse, isFetching: isUsersFetching } = useGetUsersQuery(userParams);

  useEffect(() => {
    setUsersOffset(0);
  }, [search, orgFilters, roleFilters, statusFilters]);

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
    if (orgFilters.length) {
      const value =
        orgFilters.length > 1 ? `${orgFilters[0]} +${orgFilters.length - 1}` : orgFilters[0];
      chips.push({
        label: en.userManagement.organization,
        value,
        onClear: () => {
          setOrgFilters([]);
          setTenantIdFilters([]);
        },
      });
    }
    if (roleFilters.length) {
      const value =
        roleFilters.length > 1 ? `${roleFilters[0]} +${roleFilters.length - 1}` : roleFilters[0];
      chips.push({ label: "Role", value, onClear: () => setRoleFilters([]) });
    }
    if (statusFilters.length) {
      const value = statusFilters?.join(", ");
      chips.push({ label: "Status", value, onClear: () => setStatusFilters([]) });
    }
    return chips;
  }, [orgFilters, roleFilters, statusFilters]);

  const onApplyOrganizations = (names: string[]) => {
    setOrgFilters(names);
    const ids = names
      .map(name => tenants.find(t => t.name === name)?.id)
      .filter((id): id is string => Boolean(id));
    setTenantIdFilters(ids);
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
    () =>
      orgFilters.length === 0
        ? {
            label: en.userManagement.addFilter,
            onClick: () => setIsFilterOpen(true),
          }
        : undefined,
    [orgFilters.length],
  );

  const handleOptionSelect = (option: string, user: UserListUser) => {
    setSelectedUser(user);
    setSelectedOption(option);
    userMethods.reset({
      name: user.name,
      email: user.email,
      telephonyId: user.telephonyId,
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
      await addUserdata({ ...data, externalId: data.telephonyId }).unwrap();
      setAddUserModalOpen(false);
      userMethods.reset();
      toast.success("User added successfully");
      // no manual reload required; subscribed query refetches due to invalidation
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add user");
    }
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

  const handleEditUser = async (data: any) => {
    try {
      const { telephonyId: externalId, organizations, roles, ...rest } = data;

      const payload = {
        userId: data?.id,
        data: { ...rest, externalId },
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
    orgFilters,
    roleFilters,
    statusFilters,
    setRoleFilters,
    setStatusFilters,
    onApplyOrganizations,
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
