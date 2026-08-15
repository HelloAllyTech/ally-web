import React, { useMemo, useState } from "react";

import { toast } from "sonner";

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@ally-ui-mono/ui-shared";
import {
  useAssignPlatformAdminMutation,
  useListEligiblePlatformAdminsQuery,
  useListPlatformAdminsQuery,
  useRemovePlatformAdminMutation,
} from "@api";
import { ActionConfirmationPopup, Button, EmptyState, ListToolbar, StatusBadge } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { PlatformAdmin } from "@types";

import { PlatformAdminDetail } from "./PlatformAdminDetail";

const strings = en.superAdmins;

const formatDate = (value: string) => new Date(value).toLocaleDateString();

/** Which confirmation the user is being asked for, and on whom. */
type PendingAction =
  | { kind: "add"; target: PlatformAdmin }
  | { kind: "remove"; target: PlatformAdmin };

/**
 * Management surface for the consolidated PLATFORM_ADMIN role, rendered as the
 * "Ally admins" tab inside User Management (next to Organizations). Replaces
 * the former promote/demote tier list: there is now a single role, plus a
 * per-admin feature-toggle matrix (see PlatformAdminDetail). From here an
 * `admin_user_management` holder can:
 *  - add a new platform admin (from the eligible-users picker),
 *  - remove one again,
 *  - click through to a platform admin's row to edit their toggles and
 *    tenant allowlist.
 */
export const SuperAdmins: React.FC = () => {
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<PlatformAdmin | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<PlatformAdmin | null>(null);

  const listParams = search ? { search } : undefined;
  const { data: platformAdminsData, isLoading: isPlatformAdminsLoading } =
    useListPlatformAdminsQuery(listParams);
  const { data: candidatesData, isFetching: isCandidatesFetching } =
    useListEligiblePlatformAdminsQuery(candidateSearch ? { search: candidateSearch } : undefined, {
      skip: !isAddPanelOpen,
    });

  const [assignPlatformAdmin] = useAssignPlatformAdminMutation();
  const [removePlatformAdmin] = useRemovePlatformAdminMutation();

  const admins = useMemo<PlatformAdmin[]>(
    () => platformAdminsData?.data ?? [],
    [platformAdminsData],
  );
  const candidates = candidatesData?.data ?? [];

  const closeAddPanel = () => {
    setIsAddPanelOpen(false);
    setAddTarget(null);
    setCandidateSearch("");
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    const { kind, target } = pendingAction;
    try {
      switch (kind) {
        case "add":
          await assignPlatformAdmin({ userId: target.id }).unwrap();
          toast.success(strings.addPlatformAdminSuccess);
          closeAddPanel();
          break;
        case "remove":
          await removePlatformAdmin(target.id).unwrap();
          toast.success(strings.removePlatformAdminSuccess);
          break;
      }
    } catch (error: any) {
      const fallback = {
        add: strings.addPlatformAdminError,
        remove: strings.removePlatformAdminError,
      }[kind];
      toast.error(error?.data?.message || fallback);
    } finally {
      setPendingAction(null);
    }
  };

  const confirmCopy = (action: PendingAction) => {
    switch (action.kind) {
      case "add":
        return {
          title: strings.addPlatformAdminConfirmTitle,
          description: strings.addPlatformAdminConfirmDescription(action.target.name),
          label: strings.addPlatformAdmin,
          variant: ButtonVariant.PRIMARY,
        };
      case "remove":
        return {
          title: strings.removePlatformAdminConfirmTitle,
          description: strings.removePlatformAdminConfirmDescription(action.target.name),
          label: strings.remove,
          variant: ButtonVariant.DESTRUCTIVE,
        };
    }
  };

  const renderAdminsTable = () => {
    if (isPlatformAdminsLoading) {
      return <div className="flex justify-center py-16 text-typography-600">{strings.loading}</div>;
    }

    if (admins.length === 0) {
      return (
        <EmptyState
          title={strings.noPlatformAdminsFound}
          subtitle={strings.noPlatformAdminsSubtitle}
          hideActionButton
        />
      );
    }

    return (
      <Table className="w-full text-left text-sm text-typography-900">
        <TableHead>
          <TableRow className="border-b border-border-dark text-typography-600">
            <TableHeader className="py-3 pr-4 font-medium">{strings.name}</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">{strings.email}</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">{strings.status}</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">{strings.addedOn}</TableHeader>
            <TableHeader className="py-3" />
          </TableRow>
        </TableHead>
        <TableBody>
          {admins.map(admin => (
            <TableRow
              key={admin.id}
              className="border-b border-border-light cursor-pointer hover:bg-background-secondary"
              data-testid="sa-row"
              onClick={() => setSelectedAdmin(admin)}
            >
              <TableCell className="py-3 pr-4">{admin.name || admin.email}</TableCell>
              <TableCell className="py-3 pr-4">{admin.email}</TableCell>
              <TableCell className="py-3 pr-4">
                <StatusBadge status={admin.status} />
              </TableCell>
              <TableCell className="py-3 pr-4">{formatDate(admin.createdAt)}</TableCell>
              <TableCell className="py-3 text-right">
                <Button
                  variant={ButtonVariant.DESTRUCTIVE}
                  onClick={event => {
                    event.stopPropagation();
                    setPendingAction({ kind: "remove", target: admin });
                  }}
                  className="px-3 py-1 text-sm"
                >
                  {strings.remove}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAddPanel = () => {
    if (!isAddPanelOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeAddPanel} />
        <div className="relative bg-white shadow-xl max-w-lg w-full p-6 max-h-[80vh] flex flex-col overflow-hidden">
          <h2 className="text-xl text-typography-900 font-secondary mb-4">
            {strings.addPlatformAdmin}
          </h2>
          <input
            type="text"
            value={candidateSearch}
            onChange={event => setCandidateSearch(event.target.value)}
            placeholder={strings.searchPlaceholder}
            className="border border-border-dark px-3 py-2 mb-4 text-sm outline-none shrink-0"
          />
          {/* min-h-0 lets this flex child shrink below its content height —
              without it the list grows past max-h-[80vh] and never scrolls. */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isCandidatesFetching ? (
              <div className="py-8 text-center text-typography-600">{en.common.loading}</div>
            ) : candidates.length === 0 ? (
              <EmptyState
                title={strings.noEligibleUsers}
                subtitle={strings.noEligibleUsersSubtitle}
                hideActionButton
                className="!py-8"
              />
            ) : (
              candidates.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 py-2 px-1 cursor-pointer hover:bg-neutral-50"
                >
                  <input
                    type="radio"
                    name="add-platform-admin-target"
                    checked={addTarget?.id === user.id}
                    onChange={() => setAddTarget(user)}
                  />
                  <span className="flex flex-col">
                    {/* Bulk-created accounts can have a blank name — fall back
                        to the email as the primary line. */}
                    <span className="text-sm text-typography-900">{user.name || user.email}</span>
                    {user.name && <span className="text-xs text-typography-600">{user.email}</span>}
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant={ButtonVariant.SECONDARY} onClick={closeAddPanel}>
              {strings.cancel}
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => addTarget && setPendingAction({ kind: "add", target: addTarget })}
              disabled={!addTarget}
            >
              {strings.addPlatformAdmin}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const pendingCopy = pendingAction ? confirmCopy(pendingAction) : null;

  if (selectedAdmin) {
    return <PlatformAdminDetail admin={selectedAdmin} onBack={() => setSelectedAdmin(null)} />;
  }

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <p className="text-sm text-typography-600 pb-4">{strings.platformAdminsSubtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={strings.searchPlaceholder}
        action={{
          label: strings.addPlatformAdmin,
          onClick: () => setIsAddPanelOpen(true),
          variant: ButtonVariant.PRIMARY,
        }}
      />
      {/* 260px ≈ User Management header + tab strip + this tab's own chrome. */}
      <div className="mt-[20px] overflow-y-auto h-[calc(100vh-260px)]">{renderAdminsTable()}</div>

      {renderAddPanel()}

      {pendingAction && pendingCopy && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setPendingAction(null)}
          title={pendingCopy.title}
          description={pendingCopy.description}
          primaryButton={{
            label: pendingCopy.label,
            onClick: runPendingAction,
            variant: pendingCopy.variant,
          }}
          secondaryButton={{
            label: strings.cancel,
            onClick: () => setPendingAction(null),
          }}
        />
      )}
    </div>
  );
};
