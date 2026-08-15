import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { UserRole } from "@constants";

import { useUserManagement } from "../useUserManagement";

const changeRole = vi.fn();
const getUsersQuery = vi.fn();
const USERS_RESULT = { data: { data: [], count: 0 }, isFetching: false };

// Every role the backend knows about, in the shape GET /authorization/roles
// returns. The endpoint now filters the platform tiers itself, but they are
// kept here on purpose: the picker has to stay right against a backend that
// hasn't shipped that filter yet.
const allRoles = [
  { id: 1, name: UserRole.COUNSELLOR },
  { id: 2, name: UserRole.ADMIN },
  { id: 3, name: UserRole.LEARNER },
  { id: 4, name: UserRole.CLIENT },
  { id: 5, name: UserRole.MULTI_TENANT_ADMIN },
  { id: 6, name: UserRole.SUPER_ADMIN },
  { id: 7, name: UserRole.SUPER_DUPER_ADMIN },
  { id: 8, name: UserRole.PLATFORM_ADMIN },
];

// Keep the rest of @api real: @store (pulled in transitively) needs baseAPI.
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAddUserMutation: () => [vi.fn()],
  useBulkAddUsersMutation: () => [vi.fn()],
  useDeleteUserMutation: () => [vi.fn()],
  useEditUserMutation: () => [vi.fn()],
  useUpdateUserStatusMutation: () => [vi.fn()],
  useChangeRoleMutation: () => [changeRole],
  useAddSimulationCreditLimitMutation: () => [vi.fn()],
  useGetUserImpersonatedTokenMutation: () => [vi.fn()],
  useGetRoleQuery: () => ({ data: allRoles }),
  // Stable references, like RTK Query's own cache entries: a fresh object per
  // render would retrigger the hook's sync effect forever.
  useGetUsersQuery: (params: unknown) => {
    getUsersQuery(params);
    return USERS_RESULT;
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const staffAccount = {
  id: 42,
  name: "Ally Staffer",
  email: "staff@helloally.ai",
  role: UserRole.SUPER_DUPER_ADMIN,
  roles: [UserRole.SUPER_DUPER_ADMIN],
  tenantId: "tenant-1",
} as any;

describe("useUserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeRole.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
  });

  describe("role picker", () => {
    it("offers the assignable app roles but not CLIENT", async () => {
      const { result } = renderHook(() => useUserManagement([]));

      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      const offered = result.current.roles.map(role => role.name);
      expect(offered).toContain(UserRole.LEARNER);
      expect(offered).toContain(UserRole.COUNSELLOR);
      expect(offered).not.toContain(UserRole.CLIENT);
    });

    // PLATFORM_ADMIN is granted on the Ally admins tab alongside the feature
    // toggles that decide what the admin can reach; granting it here would
    // leave those unset. The three retired tiers still carry live permissions,
    // so offering one would mint an admin that tab cannot see.
    it("never offers a platform tier", async () => {
      const { result } = renderHook(() => useUserManagement([]));

      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      const offered = result.current.roles.map(role => role.name);
      expect(offered).not.toContain(UserRole.PLATFORM_ADMIN);
      expect(offered).not.toContain(UserRole.SUPER_ADMIN);
      expect(offered).not.toContain(UserRole.SUPER_DUPER_ADMIN);
      expect(offered).not.toContain(UserRole.MULTI_TENANT_ADMIN);
    });
  });

  describe("handleChangeRole", () => {
    it("resolves the picked roles to group ids and sends only those", async () => {
      const { result } = renderHook(() => useUserManagement([]));
      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      act(() =>
        result.current.handleOptionSelect("Change role", {
          ...staffAccount,
          role: UserRole.LEARNER,
          roles: [UserRole.LEARNER],
        }),
      );
      await act(async () => {
        await result.current.handleChangeRole({
          id: 42,
          roles: [UserRole.LEARNER, UserRole.COUNSELLOR],
        });
      });

      expect(changeRole).toHaveBeenCalledWith({ userId: 42, groupIds: [3, 1] });
    });

    it("rejects the save when a picked role name doesn't resolve to a known group", async () => {
      const { result } = renderHook(() => useUserManagement([]));
      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      act(() => result.current.handleOptionSelect("Change role", staffAccount));
      await act(async () => {
        await result.current.handleChangeRole({ id: 42, roles: ["NOT_A_REAL_ROLE"] });
      });

      expect(changeRole).not.toHaveBeenCalled();
    });

    it("prefills the picker with every role the account holds", async () => {
      const { result } = renderHook(() => useUserManagement([]));

      act(() =>
        result.current.handleOptionSelect("Change role", {
          ...staffAccount,
          roles: [UserRole.SUPER_DUPER_ADMIN, UserRole.LEARNER],
        }),
      );

      expect(result.current.userMethods.getValues().roles).toEqual([
        UserRole.SUPER_DUPER_ADMIN,
        UserRole.LEARNER,
      ]);
    });
  });

  describe("platform accounts in the list", () => {
    // No opt-in any more: the list a permitted viewer gets is the whole list.
    it("asks for platform admins straight away for a viewer who may see them", () => {
      const { result } = renderHook(() => useUserManagement([], true));

      expect(getUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ includePlatformAdmins: true }),
      );
      expect(result.current.includePlatformAdmins).toBe(true);
    });

    // Anyone else would get a 403, so the param must never leave the client.
    it("never sends it for a viewer who cannot list them", () => {
      const { result } = renderHook(() => useUserManagement([], false));

      expect(getUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ includePlatformAdmins: undefined }),
      );
      expect(result.current.includePlatformAdmins).toBe(false);
    });

    // The role filter is the only platform-account control left, so a selected
    // platform role has to survive an apply untouched.
    it("keeps a selected platform role filter", async () => {
      const { result } = renderHook(() => useUserManagement([], true));

      act(() =>
        result.current.handleApplyFilters({
          organizations: [],
          roles: [UserRole.SUPER_ADMIN, UserRole.LEARNER],
          statuses: [],
        }),
      );

      await waitFor(() =>
        expect(result.current.filters.roles).toEqual([UserRole.SUPER_ADMIN, UserRole.LEARNER]),
      );
      expect(result.current.includePlatformAdmins).toBe(true);
    });
  });
});
