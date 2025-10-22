import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useCreateTenantMutation, useUpdateTenantMutation, useGetTenantsQuery } from "@api";
import { SORT_BY, SORT_ORDER } from "@constants";
import { Tenant } from "@types";

export const TENANTS_PAGE_SIZE = 10;

export function useOrganizationManagement() {
  const [orgSearch, setOrgSearch] = useState<string>("");
  const [addOrganizationModalOpen, setAddOrganizationModalOpen] = useState<boolean>(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsCount, setTenantsCount] = useState<number>(0);
  const [tenantsOffset, setTenantsOffset] = useState<number>(0);

  // Form default values (match field ids used in modal configuration)
  const defaultTenantValues: { orgname: string; orgcode: string; description: string } = {
    orgname: "",
    orgcode: "",
    description: "",
  };

  // Form methods
  const tenantMethods = useForm({
    defaultValues: defaultTenantValues,
    mode: "onChange",
  });

  // Mutations
  const [createTenant] = useCreateTenantMutation();
  const [updateTenant] = useUpdateTenantMutation();

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
    // TODO: remove this after backend is updated
    const nextData = tenantsResponse?.data || [];
    if (tenantsOffset === 0) {
      setTenants(nextData);
    } else {
      setTenants(prev => {
        // Prevent duplicates by checking if items already exist
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
    orgname: string;
    orgcode: string;
    description?: string;
  }) => {
    try {
      const payload = {
        name: data.orgname,
        code: data.orgcode,
        description: data.description || "",
      };

      await createTenant(payload).unwrap();
      setAddOrganizationModalOpen(false);
      tenantMethods.reset(defaultTenantValues);
      toast.success("Organization created successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create organization");
    }
  };

  const onEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    tenantMethods.reset({
      orgname: tenant.name ?? "",
      orgcode: tenant.code ?? "",
      description: tenant.description ?? "",
    });
    setAddOrganizationModalOpen(true);
  };

  const handleEditTenant = async (data: {
    orgname: string;
    orgcode: string;
    description?: string;
  }) => {
    if (!selectedTenant) return;
    try {
      const payload = {
        name: data.orgname,
        code: data.orgcode,
        description: data.description || "",
      };

      await updateTenant({ id: selectedTenant.id, data: payload }).unwrap();
      setAddOrganizationModalOpen(false);
      setSelectedTenant(null);
      tenantMethods.reset(defaultTenantValues);
      toast.success("Organization updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update organization");
    }
  };

  const handleTenantFormSubmit = async (data: {
    orgname: string;
    orgcode: string;
    description?: string;
  }) => {
    if (selectedTenant) {
      await handleEditTenant(data);
    } else {
      await handleCreateTenant(data);
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
  };
}
