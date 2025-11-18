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
  useGetScenarioPathsQuery: vi.fn(),
  useDeleteScenarioPathByIdMutation: vi.fn(),
}));

vi.mock("../scenarioPath", () => ({
  useGetScenarioPathByIdQuery: vi.fn(),
  useLazyGetScenarioPathByIdQuery: vi.fn(),
  useCreateScenarioPathMutation: vi.fn(),
  useUpdateScenarioPathMutation: vi.fn(),
}));

// Import the module once at the top level to avoid repeated dynamic imports
import * as apiIndex from "../index";

describe("API Index Exports", () => {
  it("should export baseAPI module", () => {
    expect(apiIndex).toHaveProperty("baseAPI");
  });

  it("should export baseQuery", () => {
    expect(apiIndex).toHaveProperty("baseQuery");
  });

  it("should export baseQueryWithReauth", () => {
    expect(apiIndex).toHaveProperty("baseQueryWithReauth");
  });

  it("should export auth hooks", () => {
    expect(apiIndex).toHaveProperty("useLoginMutation");
    expect(apiIndex).toHaveProperty("useSignupMutation");
    expect(apiIndex).toHaveProperty("useGetUserQuery");
    expect(apiIndex).toHaveProperty("useLazyGetUserQuery");
    expect(apiIndex).toHaveProperty("useGetPermissionsQuery");
    expect(apiIndex).toHaveProperty("useLazyGetPermissionsQuery");
    expect(apiIndex).toHaveProperty("useGenerateOTPMutation");
    expect(apiIndex).toHaveProperty("useVerifyOTPMutation");
  });

  it("should export user management hooks", () => {
    expect(apiIndex).toHaveProperty("useGetUsersQuery");
    expect(apiIndex).toHaveProperty("useGetTenantsQuery");
    expect(apiIndex).toHaveProperty("useLazyGetUsersQuery");
    expect(apiIndex).toHaveProperty("useLazyGetTenantsQuery");
    expect(apiIndex).toHaveProperty("useCreateTenantMutation");
    expect(apiIndex).toHaveProperty("useUpdateTenantMutation");
    expect(apiIndex).toHaveProperty("useDeleteUserMutation");
    expect(apiIndex).toHaveProperty("useUpdateUserStatusMutation");
    expect(apiIndex).toHaveProperty("useAddUserMutation");
    expect(apiIndex).toHaveProperty("useEditUserMutation");
    expect(apiIndex).toHaveProperty("useChangeRoleMutation");
    expect(apiIndex).toHaveProperty("useGetRoleQuery");
    expect(apiIndex).toHaveProperty("useGetSimulationCreditsQuery");
    expect(apiIndex).toHaveProperty("useAddSimulationCreditLimitMutation");
  });

  it("should export simulation studio hooks", () => {
    expect(apiIndex).toHaveProperty("useGetSimulationsQuery");
    expect(apiIndex).toHaveProperty("useLazyGetAdminSimulationByIdQuery");
    expect(apiIndex).toHaveProperty("useCreateSimulationMutation");
    expect(apiIndex).toHaveProperty("useUpdateSimulationByIdMutation");
    expect(apiIndex).toHaveProperty("useDeleteSimulationByIdMutation");
    expect(apiIndex).toHaveProperty("useGetSessionEventsQuery");
    expect(apiIndex).toHaveProperty("useLazyGetSessionEventsQuery");
    expect(apiIndex).toHaveProperty("useCreateSessionEventMutation");
    expect(apiIndex).toHaveProperty("useCreateSessionEventsMutation");
    expect(apiIndex).toHaveProperty("useUpdateSessionEventMutation");
    expect(apiIndex).toHaveProperty("useDeleteSessionEventsMutation");
    expect(apiIndex).toHaveProperty("useGetCoverImageUrlMutation");
    expect(apiIndex).toHaveProperty("useGetScenarioVoicesQuery");
    expect(apiIndex).toHaveProperty("useScenarioPreviewMutation");
    expect(apiIndex).toHaveProperty("useEndScenarioPreviewMutation");
    expect(apiIndex).toHaveProperty("useMapScenarioEventsMutation");
    expect(apiIndex).toHaveProperty("useDeleteScenarioEventsMutation");
    expect(apiIndex).toHaveProperty("useGetMappedScenarioEventsQuery");
  });

  it("should have all exports as functions or objects", () => {
    // Check baseAPI
    expect(typeof apiIndex.baseAPI).toBe("object");
    expect(typeof apiIndex.baseQuery).toBe("function");
    expect(typeof apiIndex.baseQueryWithReauth).toBe("function");

    // Check hooks are functions
    expect(typeof apiIndex.useLoginMutation).toBe("function");
    expect(typeof apiIndex.useGetUsersQuery).toBe("function");
    expect(typeof apiIndex.useGetSimulationsQuery).toBe("function");
  });

  it("should not have undefined exports", () => {
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
      expect(apiIndex[exportName]).toBeDefined();
    });
  });

  it("should export all authentication related hooks", () => {
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
      expect(apiIndex).toHaveProperty(hook);
      expect(typeof apiIndex[hook]).toBe("function");
    });
  });

  it("should export all user management related hooks", () => {
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
      expect(apiIndex).toHaveProperty(hook);
      expect(typeof apiIndex[hook]).toBe("function");
    });
  });

  it("should export all simulation studio related hooks", () => {
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
      expect(apiIndex).toHaveProperty(hook);
      expect(typeof apiIndex[hook]).toBe("function");
    });
  });

  it("should have consistent naming conventions", () => {
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
      expect(apiIndex).toHaveProperty(hook);
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
      expect(apiIndex).toHaveProperty(hook);
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
      expect(apiIndex).toHaveProperty(hook);
    });
  });

  it("should export base API with correct properties", () => {
    expect(apiIndex.baseAPI).toBeDefined();
    expect(apiIndex.baseAPI).toHaveProperty("reducerPath");
    expect(apiIndex.baseAPI).toHaveProperty("reducer");
    expect(apiIndex.baseAPI).toHaveProperty("middleware");
    expect(apiIndex.baseAPI).toHaveProperty("injectEndpoints");
  });

  it("should have all modules properly integrated", () => {
    // Verify that we have exports from all modules
    const hasAuthExports = apiIndex.useLoginMutation !== undefined;
    const hasUserManagementExports = apiIndex.useGetUsersQuery !== undefined;
    const hasSimulationStudioExports = apiIndex.useGetSimulationsQuery !== undefined;
    const hasBaseApiExports = apiIndex.baseAPI !== undefined;

    expect(hasAuthExports).toBe(true);
    expect(hasUserManagementExports).toBe(true);
    expect(hasSimulationStudioExports).toBe(true);
    expect(hasBaseApiExports).toBe(true);
  });
});
