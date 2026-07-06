import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { useDeleteRoleplaySpecMutation, useGetRoleplaySpecsQuery } from "@api";
import { Add, Trash } from "@assets";
import { ActionConfirmationPopup, Button, EmptyState, StatusBadge } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { RoleplaySpecListItem } from "@src/types/roleplayStudio";
import { formatDate } from "@utils";

/**
 * Roleplay Studio v2 landing list. Follows the Simulation Studio list pattern
 * (header + create action + table); rows open the workspace.
 */
export const RoleplayStudioList: React.FC = () => {
  const strings = en.roleplayStudio;
  const navigate = useNavigate();
  const { data, isLoading } = useGetRoleplaySpecsQuery();
  const [deleteSpec] = useDeleteRoleplaySpecMutation();
  const [specToDelete, setSpecToDelete] = useState<RoleplaySpecListItem | null>(null);

  const specs = data?.data ?? [];

  const openSpec = (spec: RoleplaySpecListItem) => navigate(ROUTES.ROLEPLAY_STUDIO_SPEC(spec.id));

  const handleConfirmDelete = async () => {
    if (!specToDelete) return;
    try {
      await deleteSpec(specToDelete.id).unwrap();
    } catch {
      toast.error(strings.deleteFailed);
    } finally {
      setSpecToDelete(null);
    }
  };

  const columns = [
    {
      key: "title",
      header: strings.columns.title,
      render: (value: string) => (
        <span className="text-base text-typography-900 font-medium">
          {value || strings.untitledRoleplay}
        </span>
      ),
    },
    {
      key: "status",
      header: strings.columns.status,
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "updatedAt",
      header: strings.columns.updatedAt,
      render: (value: string) => (
        <span className="text-sm text-typography-700">{value ? formatDate(value) : "—"}</span>
      ),
    },
    {
      key: "actions",
      header: strings.columns.actions,
      render: (_value: unknown, row: Record<string, any>) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={ButtonVariant.SECONDARY}
            className="h-[32px] px-3 text-sm"
            onClick={e => {
              e.stopPropagation();
              openSpec(row as RoleplaySpecListItem);
            }}
          >
            {strings.open}
          </Button>
          <button
            type="button"
            aria-label={strings.delete}
            className="p-1.5 rounded text-typography-600 hover:text-destructive-500 hover:bg-destructive-50 transition-colors"
            onClick={e => {
              e.stopPropagation();
              setSpecToDelete(row as RoleplaySpecListItem);
            }}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl text-typography-900 font-secondary">{strings.title}</h1>
          <p className="text-sm text-typography-700 mt-1">{strings.subtitle}</p>
        </div>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => navigate(ROUTES.ROLEPLAY_STUDIO_NEW)}
          className="transition-colors h-[40px] pr-[20px]"
        >
          <Add />
          {strings.newRoleplay}
        </Button>
      </div>

      <div className="mt-6 flex-1 min-h-0">
        <GenericTable
          columns={columns}
          data={specs}
          isLoading={isLoading}
          onRowClick={row => openSpec(row as RoleplaySpecListItem)}
          fallbackUI={
            <EmptyState
              title={strings.emptyTitle}
              subtitle={strings.emptySubtitle}
              actionLabel={strings.newRoleplay}
              onAction={() => navigate(ROUTES.ROLEPLAY_STUDIO_NEW)}
            />
          }
        />
      </div>

      <ActionConfirmationPopup
        isOpen={Boolean(specToDelete)}
        onClose={() => setSpecToDelete(null)}
        title={strings.deleteTitle}
        titleItalic={strings.deleteTitleItalic}
        description={strings.deleteDescription}
        primaryButton={{
          label: strings.delete,
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setSpecToDelete(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
