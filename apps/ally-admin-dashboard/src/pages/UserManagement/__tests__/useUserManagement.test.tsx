import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { INCLUDE_PLATFORM_ADMINS, UserRole } from "@constants";

import { useUserManagement } from "../useUserManagement";

const changeRole = vi.fn();
const getUsersQuery = vi.fn();
const USERS_RESULT = { data: { data: [], count: 0 }, isFetching: false };

// Every role the backend knows about, in the shape GET /authorization/roles
// returns — including the two the picker must never offer.
const allRoles = [
  { id: 1, name: UserRole.COUNSELLOR },
  { id: 2, name: UserRole.ADMIN },
  { id: 3, name: UserRole.LEARNER },
  { id: 4, name: UserRole.CLIENT },
  { id: 5, name: UserRole.INTERNAL },
  { id: 6, name: UserRole.SUPER_ADMIN },
  { id: 7, name: UserRole.SUPER_DUPER_ADMIN },
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
    it("offers INTERNAL but not the tier roles or CLIENT", async () => {
      const { result } = renderHook(() => useUserManagement([]));

      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      const offered = result.current.roles.map(role => role.name);
      expect(offered).toContain(UserRole.INTERNAL);
      expect(offered).toContain(UserRole.LEARNER);
      expect(offered).not.toContain(UserRole.SUPER_ADMIN);
      expect(offered).not.toContain(UserRole.SUPER_DUPER_ADMIN);
      expect(offered).not.toContain(UserRole.CLIENT);
    });
  });

  describe("handleChangeRole", () => {
    // The regression this guards: "Change role" replaces the whole role set, so
    // granting LEARNER to a super duper admin must not demote them.
    it("keeps the tier role the picker never showed", async () => {
      const { result } = renderHook(() => useUserManagement([]));
      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      act(() => result.current.handleOptionSelect("Change role", staffAccount));
      await act(async () => {
        await result.current.handleChangeRole({ id: 42, roles: [UserRole.LEARNER] });
      });

      expect(changeRole).toHaveBeenCalledWith({ userId: 42, groupIds: [3, 7] });
    });

    it("keeps it even when every app role is removed", async () => {
      const { result } = renderHook(() => useUserManagement([]));
      await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));

      act(() =>
        result.current.handleOptionSelect("Change role", {
          ...staffAccount,
          roles: [UserRole.SUPER_DUPER_ADMIN, UserRole.LEARNER],
        }),
      );
      await act(async () => {
        await result.current.handleChangeRole({ id: 42, roles: [] });
      });

      expect(changeRole).toHaveBeenCalledWith({ userId: 42, groupIds: [7] });
    });

    it("sends only the picked roles for an ordinary account", async () => {
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

    it("prefills the picker without the tier roles", async () => {
      const { result } = renderHook(() => useUserManagement([]));

      act(() =>
        result.current.handleOptionSelect("Change role", {
          ...staffAccount,
          roles: [UserRole.SUPER_DUPER_ADMIN, UserRole.LEARNER],
        }),
      );

      expect(result.current.userMethods.getValues().roles).toEqual([UserRole.LEARNER]);
      expect(result.current.lockedRoles).toEqual([UserRole.SUPER_DUPER_ADMIN]);
    });
  });

  describe("platform-admin opt-in", () => {
    const applyIncludeFilter = (result: { current: ReturnType<typeof useUserManagement> }) =>
      act(() =>
        result.current.handleApplyFilters({
          organizations: [],
          roles: [],
          statuses: [],
          platformAccounts: [INCLUDE_PLATFORM_ADMINS],
        }),
      );

    it("asks for platform admins once a super duper admin opts in", async () => {
      const { result } = renderHook(() => useUserManagement([], true));

      applyIncludeFilter(result);

      await waitFor(() =>
        expect(getUsersQuery).toHaveBeenLastCalledWith(
          expect.objectContaining({ includePlatformAdmins: true }),
        ),
      );
      expect(result.current.includePlatformAdmins).toBe(true);
    });

    // Anyone else would get a 403, so the param must never leave the client.
    it("never sends it for a viewer who cannot list them", async () => {
      const { result } = renderHook(() => useUserManagement([], false));

      applyIncludeFilter(result);

      await waitFor(() => expect(result.current.includePlatformAdmins).toBe(false));
      expect(getUsersQuery).not.toHaveBeenCalledWith(
        expect.objectContaining({ includePlatformAdmins: true }),
      );
    });

    // Otherwise the list asks for rows the backend has just been told to hide.
    it("drops platform role filters when the opt-in is switched off", async () => {
      const { result } = renderHook(() => useUserManagement([], true));

      act(() =>
        result.current.handleApplyFilters({
          organizations: [],
          roles: [UserRole.SUPER_ADMIN, UserRole.LEARNER],
          statuses: [],
          platformAccounts: [INCLUDE_PLATFORM_ADMINS],
        }),
      );
      await waitFor(() => expect(result.current.filters.roles).toContain(UserRole.SUPER_ADMIN));

      act(() =>
        result.current.handleApplyFilters({
          organizations: [],
          roles: [UserRole.SUPER_ADMIN, UserRole.LEARNER],
          statuses: [],
          platformAccounts: [],
        }),
      );

      await waitFor(() => expect(result.current.filters.roles).toEqual([UserRole.LEARNER]));
      expect(result.current.includePlatformAdmins).toBe(false);
    });

    it("omits the param entirely by default", () => {
      renderHook(() => useUserManagement([], true));

      expect(getUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ includePlatformAdmins: undefined }),
      );
    });
  });
});
