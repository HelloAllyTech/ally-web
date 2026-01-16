import React, { useState } from "react";

import { Edit } from "@assets";
import { ActionConfirmationPopup } from "@components";
import { en } from "@constants";
import { OrganizationListProps, Tenant } from "@types";

export const OrganizationList: React.FC<OrganizationListProps> = ({
  organizations,
  formatDate,
  onEditPress,
  onRowClick,
  renderFooter,
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const renderHeader = (
    <div className="grid grid-cols-12 px-4 py-2 text-base text-typography-800 border-b border-border-light">
      <div className="col-span-3">{en.userManagement.organization}</div>
      <div className="col-span-2">{en.userManagement.code}</div>
      <div className="col-span-3">{en.userManagement.description}</div>
      <div className="col-span-2">{en.userManagement.createdOn}</div>
      <div className="col-span-2">{en.userManagement.noOfUsers}</div>
    </div>
  );

  const handleRowClick = (tenant: Tenant, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on the edit button
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    onRowClick?.(tenant);
  };

  const handleEditPress = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditPress?.(tenant);
  };
  return (
    <div className="w-full text-sm overflow-x-auto custom-scrollbar">
      <div className="min-w-[900px]">
        {renderHeader}

        <div className="h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar">
          {organizations.map(tenant => (
            <div
              key={tenant.id}
              onClick={e => handleRowClick(tenant, e)}
              className="grid grid-cols-12 items-center px-4 py-3 text-typography-900 border-b border-border-light hover:bg-background-secondary cursor-pointer"
            >
              <div className="col-span-3 text-typography-900">
                <span className="flex items-center">
                  {tenant.logoUrl ? (
                    <img
                      src={tenant.logoUrl}
                      alt="org-logo"
                      width={45}
                      height={45}
                      className="rounded-full mr-3"
                    />
                  ) : (
                    <div className="min-w-[40px] min-h-[40px] rounded-full border border-border-light text-typography-800 flex items-center justify-center mr-3 capitalize">
                      {tenant.name[0]}
                    </div>
                  )}
                  {tenant.name}
                </span>
              </div>
              <div className="col-span-2 text-typography-900">{tenant.code}</div>
              <div className="col-span-3 text-typography-900 overflow-hidden whitespace-nowrap truncate w-[200px]">
                {tenant.description}
              </div>
              <div className="col-span-2 text-typography-900">{formatDate(tenant.createdAt)}</div>
              <div className="col-span-2 flex items-center justify-between text-typography-900 pl-1">
                <span>{tenant.userCount}</span>
                <button
                  className="text-typography-600 hover:text-typography-900 px-2"
                  title={en.common.edit}
                  onClick={e => handleEditPress(tenant, e)}
                >
                  <Edit />
                </button>
                <ActionConfirmationPopup
                  isOpen={deleteModalOpen}
                  onClose={() => setDeleteModalOpen(false)}
                  title={en.userManagement.deleteOrganization}
                  description={en.userManagement.deleteOrganizationConfirmation(tenant.name)}
                  primaryButton={{
                    label: en.userManagement.deleteOrganization,
                    onClick: () => setDeleteModalOpen(false),
                    variant: "destructive",
                  }}
                  secondaryButton={{
                    label: en.userManagement.cancel,
                    onClick: () => setDeleteModalOpen(false),
                    variant: "secondary",
                  }}
                />
              </div>
            </div>
          ))}
          {renderFooter?.()}
        </div>
      </div>
    </div>
  );
};

export default OrganizationList;
