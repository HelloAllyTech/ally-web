import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useGetTenantsQuery,
  usePostLogoUrlMutation,
  useDeleteLogoMutation,
  useGetDashboardSettingsAllQuery,
} from "@api";
import { SORT_BY, SORT_ORDER, en } from "@constants";
import { Tenant } from "@types";

export const TENANTS_PAGE_SIZE = 100;

export function useOrganizationManagement() {
  const [orgSearch, setOrgSearch] = useState<string>("");
  const [addOrganizationModalOpen, setAddOrganizationModalOpen] = useState<boolean>(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsCount, setTenantsCount] = useState<number>(0);
  const [tenantsOffset, setTenantsOffset] = useState<number>(0);

  // Form default values (match field ids used in modal configuration)

  const defaultTenantValues: {
    orgname: string;
    orgcode: string;
    description: string;
    logoUrl?: string;
    enabledDashboardIds: string[];
    enableMicrophoneMode: boolean;
    enableAudioUpload: boolean;
    hideRankInCommunity: boolean;
    isTestOrganization: boolean;
  } = {
    logoUrl: "",
    orgname: "",
    orgcode: "",
    description: "",
    enabledDashboardIds: [],
    enableMicrophoneMode: false,
    enableAudioUpload: false,
    hideRankInCommunity: false,
    isTestOrganization: false,
  };

  // Form methods
  const tenantMethods = useForm({
    defaultValues: defaultTenantValues,
    mode: "onChange",
  });

  // Mutations
  const [createTenant] = useCreateTenantMutation();
  const [updateTenant] = useUpdateTenantMutation();
  const [logoUpload] = usePostLogoUrlMutation();
  const [deleteLogo] = useDeleteLogoMutation();
  const { data: dashboardSettingsAll } = useGetDashboardSettingsAllQuery(undefined);

  const tenantParams = {
    limit: TENANTS_PAGE_SIZE,
    offset: tenantsOffset,
    sortBy: SORT_BY.CREATED_AT,
    sortOrder: SORT_ORDER.DESC,
    search: orgSearch || undefined,
  };

  const { data: tenantsResponse, isFetching: isTenantsFetching } = useGetTenantsQuery(tenantParams);

  useEffect(() => {
    setTenantsOffset(0);
  }, [orgSearch]);

  useEffect(() => {
    if (!tenantsResponse) return;
    const nextData = tenantsResponse?.data || [];
    if (tenantsOffset === 0) {
      setTenants(nextData);
    } else {
      setTenants(prev => {
        const existingIds = new Set(prev.map(tenant => tenant.id));
        const newItems = nextData.filter((tenant: any) => !existingIds.has(tenant.id));
        return [...prev, ...newItems];
      });
    }
    const count = tenantsResponse?.count || 0;
    setTenantsCount(count);
  }, [tenantsResponse, tenantsOffset]);

  const loadTenants = async (append = false) => {
    setTenantsOffset(prev => (append ? prev + TENANTS_PAGE_SIZE : 0));
  };

  const handleNewgroupClick = () => {
    setSelectedTenant(null);
    tenantMethods.reset(defaultTenantValues);
    setAddOrganizationModalOpen(true);
  };

  const handleCreateTenant = async (data: {
    logoUrl?: string;
    orgname: string;
    orgcode: string;
    description?: string;
    enabledDashboardIds: string[];
    enableMicrophoneMode: boolean;
    enableAudioUpload: boolean;
    hideRankInCommunity: boolean;
    isTestOrganization: boolean;
  }) => {
    try {
      const payload: {
        name: string;
        code: string;
        description: string;
        logoUrl?: string;
        enabledDashboardIds: string[];
        enableMicrophoneMode: boolean;
        enableAudioUpload: boolean;
        hideRankInCommunity: boolean;
        isTestOrganization: boolean;
      } = {
        name: data.orgname,
        code: data.orgcode,
        description: data.description ?? "",
        enabledDashboardIds: data.enabledDashboardIds ?? [],
        enableMicrophoneMode: data.enableMicrophoneMode ?? false,
        enableAudioUpload: data.enableAudioUpload ?? false,
        hideRankInCommunity: data.hideRankInCommunity ?? false,
        isTestOrganization: data.isTestOrganization ?? false,
      };
      // T
      payload.logoUrl = data.logoUrl;
      await createTenant(payload).unwrap();
      setAddOrganizationModalOpen(false);
      tenantMethods.reset(defaultTenantValues);
      toast.success(en.userManagement.organizationCreated);
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedCreateOrganization);
    }
  };

  const onEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    tenantMethods.reset({
      logoUrl: tenant.logoUrl ?? "",
      orgname: tenant.name ?? "",
      orgcode: tenant.code ?? "",
      description: tenant.description ?? "",
      enabledDashboardIds: tenant.enabledDashboardIds ?? [],
      enableMicrophoneMode: tenant.enableMicrophoneMode ?? false,
      enableAudioUpload: tenant.enableAudioUpload ?? false,
      hideRankInCommunity: tenant.hideRankInCommunity ?? false,
      isTestOrganization: tenant.isTestOrganization ?? false,
    });
    setAddOrganizationModalOpen(true);
  };

  const handleEditTenant = async (data: {
    logoUrl?: string;
    orgname: string;
    orgcode: string;
    description?: string;
    enabledDashboardIds: string[];
    enableMicrophoneMode: boolean;
    enableAudioUpload: boolean;
    hideRankInCommunity: boolean;
    isTestOrganization: boolean;
  }) => {
    if (!selectedTenant) return;
    try {
      const payload: {
        name: string;
        code: string;
        description: string;
        logoUrl?: string;
        enabledDashboardIds: string[];
        enableMicrophoneMode: boolean;
        enableAudioUpload: boolean;
        hideRankInCommunity: boolean;
        isTestOrganization: boolean;
      } = {
        name: data.orgname,
        code: data.orgcode,
        description: data.description || "",
        enabledDashboardIds: data.enabledDashboardIds ?? [],
        enableMicrophoneMode: data.enableMicrophoneMode ?? false,
        enableAudioUpload: data.enableAudioUpload ?? false,
        hideRankInCommunity: data.hideRankInCommunity ?? false,
        isTestOrganization: data.isTestOrganization ?? false,
      };

      payload.logoUrl = data.logoUrl;
      await updateTenant({ id: selectedTenant.id, data: payload }).unwrap();
      setAddOrganizationModalOpen(false);
      setSelectedTenant(null);
      tenantMethods.reset(defaultTenantValues);
      toast.success(en.userManagement.organizationUpdated);
    } catch (error: any) {
      toast.error(error?.data?.message || en.userManagement.failedUpdateOrganization);
    }
  };

  const handleTenantFormSubmit = async (data: {
    orgname: string;
    orgcode: string;
    description: string;
    logoUrl?: string;
    enabledDashboardIds: string[];
    enableMicrophoneMode: boolean;
    enableAudioUpload: boolean;
    hideRankInCommunity: boolean;
    isTestOrganization: boolean;
  }) => {
    const payload = {
      orgname: data.orgname,
      orgcode: data.orgcode,
      description: data.description,
      logoUrl: data.logoUrl,
      enabledDashboardIds: data.enabledDashboardIds ?? [],
      enableMicrophoneMode: data.enableMicrophoneMode ?? false,
      enableAudioUpload: data.enableAudioUpload ?? false,
      hideRankInCommunity: data.hideRankInCommunity ?? false,
      isTestOrganization: data.isTestOrganization ?? false,
    };

    if (selectedTenant && selectedTenant.logoUrl) deleteLogo({ logoUrl: selectedTenant.logoUrl });

    if (selectedTenant) {
      await handleEditTenant(payload);
    } else {
      await handleCreateTenant(payload);
    }
  };

  const onCloseOrganizationEditModal = () => {
    setAddOrganizationModalOpen(false);
    setSelectedTenant(null);
    tenantMethods.reset(defaultTenantValues);
  };

  return {
    // state
    orgSearch,
    setOrgSearch,
    addOrganizationModalOpen,
    setAddOrganizationModalOpen,
    selectedTenant,
    setSelectedTenant,

    // data
    tenants,
    tenantsCount,
    tenantsOffset,
    loadTenants,
    isTenantsFetching,

    // form methods
    tenantMethods,

    // handlers
    handleNewgroupClick,
    handleCreateTenant,
    onEditTenant,
    handleEditTenant,
    handleTenantFormSubmit,
    onCloseOrganizationEditModal,

    // mutations
    createTenant,
    updateTenant,
    logoUpload,

    // analytics
    dashboardSettingsAll,
  };
}
