import { describe, it, expect, vi } from "vitest";

// Mock the store to avoid initialization issues
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock all dependencies
vi.mock("../baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(),
  },
  baseQuery: vi.fn(),
  baseQueryWithReauth: vi.fn(),
}));

vi.mock("../auth", () => ({
  useLoginMutation: vi.fn(),
  useSignupMutation: vi.fn(),
  useGetUserQuery: vi.fn(),
  useLazyGetUserQuery: vi.fn(),
  useGetPermissionsQuery: vi.fn(),
  useLazyGetPermissionsQuery: vi.fn(),
  useGenerateOTPMutation: vi.fn(),
  useVerifyOTPMutation: vi.fn(),
}));

vi.mock("../userManagement", () => ({
  useGetUsersQuery: vi.fn(),
  useGetTenantsQuery: vi.fn(),
  useLazyGetUsersQuery: vi.fn(),
  useLazyGetTenantsQuery: vi.fn(),
  useCreateTenantMutation: vi.fn(),
  useUpdateTenantMutation: vi.fn(),
  useDeleteUserMutation: vi.fn(),
  useUpdateUserStatusMutation: vi.fn(),
  useAddUserMutation: vi.fn(),
  useEditUserMutation: vi.fn(),
  useChangeRoleMutation: vi.fn(),
  useGetRoleQuery: vi.fn(),
  useGetSimulationCreditsQuery: vi.fn(),
  useAddSimulationCreditLimitMutation: vi.fn(),
}));

vi.mock("../simulationStudio", () => ({
  useGetSimulationsQuery: vi.fn(),
  useLazyGetAdminSimulationByIdQuery: vi.fn(),
  useCreateSimulationMutation: vi.fn(),
  useUpdateSimulationByIdMutation: vi.fn(),
  useDeleteSimulationByIdMutation: vi.fn(),
  useGetSessionEventsQuery: vi.fn(),
  useLazyGetSessionEventsQuery: vi.fn(),
  useCreateSessionEventMutation: vi.fn(),
  useCreateSessionEventsMutation: vi.fn(),
  useUpdateSessionEventMutation: vi.fn(),
  useDeleteSessionEventsMutation: vi.fn(),
  useGetCoverImageUrlMutation: vi.fn(),
  useGetScenarioVoicesQuery: vi.fn(),
  useScenarioPreviewMutation: vi.fn(),
  useEndScenarioPreviewMutation: vi.fn(),
  useMapScenarioEventsMutation: vi.fn(),
  useDeleteScenarioEventsMutation: vi.fn(),
  useGetMappedScenarioEventsQuery: vi.fn(),
}));

describe("API Index Exports", () => {
  it("should export baseAPI module", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("baseAPI");
  }, 10000); // Increase timeout to 10 seconds

  it("should export baseQuery", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("baseQuery");
  });

  it("should export baseQueryWithReauth", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("baseQueryWithReauth");
  });

  it("should export auth hooks", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("useLoginMutation");
    expect(module).toHaveProperty("useSignupMutation");
    expect(module).toHaveProperty("useGetUserQuery");
    expect(module).toHaveProperty("useLazyGetUserQuery");
    expect(module).toHaveProperty("useGetPermissionsQuery");
    expect(module).toHaveProperty("useLazyGetPermissionsQuery");
    expect(module).toHaveProperty("useGenerateOTPMutation");
    expect(module).toHaveProperty("useVerifyOTPMutation");
  });

  it("should export user management hooks", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("useGetUsersQuery");
    expect(module).toHaveProperty("useGetTenantsQuery");
    expect(module).toHaveProperty("useLazyGetUsersQuery");
    expect(module).toHaveProperty("useLazyGetTenantsQuery");
    expect(module).toHaveProperty("useCreateTenantMutation");
    expect(module).toHaveProperty("useUpdateTenantMutation");
    expect(module).toHaveProperty("useDeleteUserMutation");
    expect(module).toHaveProperty("useUpdateUserStatusMutation");
    expect(module).toHaveProperty("useAddUserMutation");
    expect(module).toHaveProperty("useEditUserMutation");
    expect(module).toHaveProperty("useChangeRoleMutation");
    expect(module).toHaveProperty("useGetRoleQuery");
    expect(module).toHaveProperty("useGetSimulationCreditsQuery");
    expect(module).toHaveProperty("useAddSimulationCreditLimitMutation");
  });

  it("should export simulation studio hooks", async () => {
    const module = await import("../index");
    expect(module).toHaveProperty("useGetSimulationsQuery");
    expect(module).toHaveProperty("useLazyGetAdminSimulationByIdQuery");
    expect(module).toHaveProperty("useCreateSimulationMutation");
    expect(module).toHaveProperty("useUpdateSimulationByIdMutation");
    expect(module).toHaveProperty("useDeleteSimulationByIdMutation");
    expect(module).toHaveProperty("useGetSessionEventsQuery");
    expect(module).toHaveProperty("useLazyGetSessionEventsQuery");
    expect(module).toHaveProperty("useCreateSessionEventMutation");
    expect(module).toHaveProperty("useCreateSessionEventsMutation");
    expect(module).toHaveProperty("useUpdateSessionEventMutation");
    expect(module).toHaveProperty("useDeleteSessionEventsMutation");
    expect(module).toHaveProperty("useGetCoverImageUrlMutation");
    expect(module).toHaveProperty("useGetScenarioVoicesQuery");
    expect(module).toHaveProperty("useScenarioPreviewMutation");
    expect(module).toHaveProperty("useEndScenarioPreviewMutation");
    expect(module).toHaveProperty("useMapScenarioEventsMutation");
    expect(module).toHaveProperty("useDeleteScenarioEventsMutation");
    expect(module).toHaveProperty("useGetMappedScenarioEventsQuery");
  });

  it("should have all exports as functions or objects", async () => {
    const module = await import("../index");

    // Check baseAPI
    expect(typeof module.baseAPI).toBe("object");
    expect(typeof module.baseQuery).toBe("function");
    expect(typeof module.baseQueryWithReauth).toBe("function");

    // Check hooks are functions
    expect(typeof module.useLoginMutation).toBe("function");
    expect(typeof module.useGetUsersQuery).toBe("function");
    expect(typeof module.useGetSimulationsQuery).toBe("function");
  });

  it("should not have undefined exports", async () => {
    const module = await import("../index");

    const exports = [
      "baseAPI",
      "baseQuery",
      "baseQueryWithReauth",
      "useLoginMutation",
      "useSignupMutation",
      "useGetUserQuery",
      "useGetUsersQuery",
      "useGetSimulationsQuery",
    ];

    exports.forEach(exportName => {
      expect(module[exportName]).toBeDefined();
    });
  });

  it("should export all authentication related hooks", async () => {
    const module = await import("../index");

    const authHooks = [
      "useLoginMutation",
      "useSignupMutation",
      "useGetUserQuery",
      "useLazyGetUserQuery",
      "useGetPermissionsQuery",
      "useLazyGetPermissionsQuery",
      "useGenerateOTPMutation",
      "useVerifyOTPMutation",
    ];

    authHooks.forEach(hook => {
      expect(module).toHaveProperty(hook);
      expect(typeof module[hook]).toBe("function");
    });
  });

  it("should export all user management related hooks", async () => {
    const module = await import("../index");

    const userManagementHooks = [
      "useGetUsersQuery",
      "useGetTenantsQuery",
      "useLazyGetUsersQuery",
      "useLazyGetTenantsQuery",
      "useCreateTenantMutation",
      "useUpdateTenantMutation",
      "useDeleteUserMutation",
      "useUpdateUserStatusMutation",
      "useAddUserMutation",
      "useEditUserMutation",
      "useChangeRoleMutation",
      "useGetRoleQuery",
      "useGetSimulationCreditsQuery",
      "useAddSimulationCreditLimitMutation",
    ];

    userManagementHooks.forEach(hook => {
      expect(module).toHaveProperty(hook);
      expect(typeof module[hook]).toBe("function");
    });
  });

  it("should export all simulation studio related hooks", async () => {
    const module = await import("../index");

    const simulationStudioHooks = [
      "useGetSimulationsQuery",
      "useLazyGetAdminSimulationByIdQuery",
      "useCreateSimulationMutation",
      "useUpdateSimulationByIdMutation",
      "useDeleteSimulationByIdMutation",
      "useGetSessionEventsQuery",
      "useLazyGetSessionEventsQuery",
      "useCreateSessionEventMutation",
      "useCreateSessionEventsMutation",
      "useUpdateSessionEventMutation",
      "useDeleteSessionEventsMutation",
      "useGetCoverImageUrlMutation",
      "useGetScenarioVoicesQuery",
      "useScenarioPreviewMutation",
      "useEndScenarioPreviewMutation",
      "useMapScenarioEventsMutation",
      "useDeleteScenarioEventsMutation",
      "useGetMappedScenarioEventsQuery",
    ];

    simulationStudioHooks.forEach(hook => {
      expect(module).toHaveProperty(hook);
      expect(typeof module[hook]).toBe("function");
    });
  });

  it("should have consistent naming conventions", async () => {
    const module = await import("../index");

    // Query hooks should start with "use" and end with "Query"
    const queryHooks = [
      "useGetUserQuery",
      "useGetUsersQuery",
      "useGetTenantsQuery",
      "useGetSimulationsQuery",
      "useGetSessionEventsQuery",
      "useGetPermissionsQuery",
      "useGetRoleQuery",
      "useGetScenarioVoicesQuery",
      "useGetSimulationCreditsQuery",
      "useGetMappedScenarioEventsQuery",
    ];

    queryHooks.forEach(hook => {
      expect(hook).toMatch(/^use.*Query$/);
      expect(module).toHaveProperty(hook);
    });

    // Mutation hooks should start with "use" and end with "Mutation"
    const mutationHooks = [
      "useLoginMutation",
      "useSignupMutation",
      "useGenerateOTPMutation",
      "useVerifyOTPMutation",
      "useCreateTenantMutation",
      "useUpdateTenantMutation",
      "useDeleteUserMutation",
      "useUpdateUserStatusMutation",
      "useAddUserMutation",
      "useEditUserMutation",
      "useChangeRoleMutation",
      "useCreateSimulationMutation",
      "useUpdateSimulationByIdMutation",
      "useDeleteSimulationByIdMutation",
      "useCreateSessionEventMutation",
      "useCreateSessionEventsMutation",
      "useUpdateSessionEventMutation",
      "useDeleteSessionEventsMutation",
      "useGetCoverImageUrlMutation",
      "useScenarioPreviewMutation",
      "useEndScenarioPreviewMutation",
      "useMapScenarioEventsMutation",
      "useDeleteScenarioEventsMutation",
      "useAddSimulationCreditLimitMutation",
    ];

    mutationHooks.forEach(hook => {
      expect(hook).toMatch(/^use.*Mutation$/);
      expect(module).toHaveProperty(hook);
    });

    // Lazy query hooks should start with "useLazy" and end with "Query"
    const lazyQueryHooks = [
      "useLazyGetUserQuery",
      "useLazyGetUsersQuery",
      "useLazyGetTenantsQuery",
      "useLazyGetPermissionsQuery",
      "useLazyGetSessionEventsQuery",
      "useLazyGetAdminSimulationByIdQuery",
    ];

    lazyQueryHooks.forEach(hook => {
      expect(hook).toMatch(/^useLazy.*Query$/);
      expect(module).toHaveProperty(hook);
    });
  });

  it("should export base API with correct properties", async () => {
    const module = await import("../index");

    expect(module.baseAPI).toBeDefined();
    expect(module.baseAPI).toHaveProperty("reducerPath");
    expect(module.baseAPI).toHaveProperty("reducer");
    expect(module.baseAPI).toHaveProperty("middleware");
    expect(module.baseAPI).toHaveProperty("injectEndpoints");
  });

  it("should have all modules properly integrated", async () => {
    const module = await import("../index");

    // Verify that we have exports from all modules
    const hasAuthExports = module.useLoginMutation !== undefined;
    const hasUserManagementExports = module.useGetUsersQuery !== undefined;
    const hasSimulationStudioExports = module.useGetSimulationsQuery !== undefined;
    const hasBaseApiExports = module.baseAPI !== undefined;

    expect(hasAuthExports).toBe(true);
    expect(hasUserManagementExports).toBe(true);
    expect(hasSimulationStudioExports).toBe(true);
    expect(hasBaseApiExports).toBe(true);
  });
});
