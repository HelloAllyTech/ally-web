import { useState } from "react";

import { Trash } from "@icons";
import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import {
  useGetAdminTenantsQuery,
  useAssignAdminTenantsMutation,
  useRemoveAdminTenantsMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { Tenant, AdminTenant } from "@types";

interface AssignedOrganizationsProps {
  userId: number;
  canEdit: boolean;
  allTenants: Tenant[];
}

export const AssignedOrganizations: React.FC<AssignedOrganizationsProps> = ({
  userId,
  canEdit,
  allTenants,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: adminTenantsData, isFetching } = useGetAdminTenantsQuery(userId, {
    skip: !userId,
  });

  const [assignAdminTenants, { isLoading: isAssigning }] = useAssignAdminTenantsMutation();
  const [removeAdminTenants, { isLoading: isRemoving }] = useRemoveAdminTenantsMutation();

  const assignedTenants: AdminTenant[] = adminTenantsData?.data ?? [];

  // Tenants that are NOT yet assigned
  const assignedIds = new Set(assignedTenants.map(t => t.id));
  const availableTenants = allTenants.filter(t => !assignedIds.has(t.id));

  const handleRemove = async (tenantId: string) => {
    try {
      await removeAdminTenants({ userId, tenantIds: [tenantId] }).unwrap();
      toast.success(en.userManagement.removeOrganizationSuccess);
    } catch (err: any) {
      toast.error(err?.data?.message || en.userManagement.removeOrganizationError);
    }
  };

  const handleAssign = async () => {
    if (!selectedIds.length) return;
    try {
      await assignAdminTenants({ userId, tenantIds: selectedIds }).unwrap();
      toast.success(en.userManagement.assignOrganizationSuccess);
      setShowAddModal(false);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.data?.message || en.userManagement.assignOrganizationError);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-typography-900 cursor-pointer font-primary">
          {en.userManagement.adminFor}
          {adminTenantsData?.count !== undefined && (
            <span className="ml-2 text-xs font-normal text-typography-600 bg-background-secondary rounded-full px-2 py-0.5">
              {adminTenantsData.count}
            </span>
          )}
        </label>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
          >
            {en.userManagement.addOrganizationLabel}
          </button>
        )}
      </div>

      {/* Current assigned tenants */}
      <div className="flex flex-col gap-2">
        {isFetching ? (
          <div className="text-xs text-typography-600 animate-pulse py-2">{en.common.loading}</div>
        ) : assignedTenants.length === 0 ? (
          <p className="text-xs text-typography-600 py-2 italic">
            {en.userManagement.noAssignedOrganizations}
          </p>
        ) : (
          assignedTenants.map(tenant => (
            <div
              key={tenant.id}
              className="flex items-center justify-between rounded-lg border border-border-light bg-background-secondary px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden">
                  <CustomImage
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="rounded-full object-cover w-7 h-7"
                    fallbackClassName="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-typography-600 text-xs"
                    fallbackText={tenant.name?.slice(0, 1)?.toUpperCase() ?? "O"}
                  />
                </div>
                <span className="text-sm text-typography-900 truncate">{tenant.name}</span>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleRemove(tenant.id)}
                  disabled={isRemoving}
                  title={en.userManagement.remove}
                  className="ml-3 flex-shrink-0 text-destructive-400 hover:text-destructive-600 disabled:opacity-40 transition-colors"
                >
                  <Trash width={15} height={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Organization Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-[1px]"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setSelectedIds([]);
            }
          }}
        >
          <div className="bg-white rounded-[10px] shadow-2xl min-w-[360px] max-w-[90vw] max-h-[80vh] flex flex-col p-5 gap-4 font-primary animate-fadeIn">
            {/* Modal header */}
            <h3 className="text-lg font-semibold text-typography-900">
              {en.userManagement.selectOrganizations}
            </h3>

            {/* Tenant list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 max-h-60 flex flex-col gap-1">
              {availableTenants.length === 0 ? (
                <p className="text-sm text-typography-600 italic py-4 text-center">
                  {en.userManagement.noOrganizationsToAdd}
                </p>
              ) : (
                availableTenants.map(tenant => (
                  <label
                    key={tenant.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tenant.id)}
                      onChange={() => toggleSelect(tenant.id)}
                      className="accent-primary-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden">
                        <CustomImage
                          src={tenant.logoUrl}
                          alt={tenant.name}
                          className="rounded-full object-cover w-6 h-6"
                          fallbackClassName="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-typography-600 text-xs"
                          fallbackText={tenant.name?.slice(0, 1)?.toUpperCase() ?? "O"}
                        />
                      </div>
                      <span className="text-sm text-typography-900 truncate">{tenant.name}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Modal actions */}
            <div className="flex gap-3 flex-shrink-0">
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedIds([]);
                }}
                className="flex-1"
              >
                {en.userManagement.cancel}
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleAssign}
                disabled={!selectedIds.length || isAssigning}
                className="flex-1"
              >
                {isAssigning ? en.common.loading : en.userManagement.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
