import React, { useState } from "react";

import { Edit } from "@assets";
import { ActionConfirmationPopup } from "@components";
import { en } from "@constants";
import { OrganizationListProps } from "@types";

export const OrganizationList: React.FC<OrganizationListProps> = ({
  organizations,
  formatDate,
  onEditPress,
  renderFooter,
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const renderHeader = () => {
    return (
      <div className="grid grid-cols-12 px-4 py-2 text-[14px] text-gray-500 border-b border-gray-200">
        <div className="col-span-4">{en.userManagement.organization}</div>
        <div className="col-span-4">{en.userManagement.description}</div>
        <div className="col-span-2">{en.userManagement.createdOn}</div>
        <div className="col-span-2">{en.userManagement.noOfUsers}</div>
      </div>
    );
  };

  return (
    <div className="w-full text-[13px] overflow-x-auto">
      <div className="min-w-[900px]">
        {renderHeader()}

        <div className="h-[calc(100vh-270px)] overflow-y-auto">
          {organizations.map(tenant => (
            <div
              key={tenant.id}
              className="grid grid-cols-12 items-center px-4 py-3 text-gray-700 border-b border-gray-200 hover:bg-gray-50"
            >
              <div className="col-span-4">{tenant.name}</div>
              <div className="col-span-4 text-gray-600">{tenant.description}</div>
              <div className="col-span-2 text-gray-600">{formatDate(tenant.createdAt)}</div>
              <div className="col-span-2 flex items-center justify-between text-gray-600">
                <span>{tenant.userCount}</span>
                <button
                  className="text-gray-400 hover:text-gray-600 px-2"
                  title={en.userManagement.edit}
                  onClick={() => onEditPress?.(tenant)}
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
