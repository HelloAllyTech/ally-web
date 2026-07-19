import React, { useMemo, useState } from "react";

import { useSelector } from "react-redux";
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
  useDemoteSuperDuperAdminMutation,
  useGetSuperAdminCandidatesQuery,
  useGetSuperAdminsQuery,
  useGetSuperDuperAdminsQuery,
  usePromoteSuperAdminMutation,
  usePromoteSuperDuperAdminMutation,
  useRemoveSuperAdminMutation,
} from "@api";
import { ActionConfirmationPopup, Button, EmptyState, ListToolbar, StatusBadge } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { RootState } from "@store";
import { SuperAdminTier, SuperDuperAdmin, TieredSuperAdmin } from "@types";

const strings = en.superAdmins;

const formatDate = (value: string) => new Date(value).toLocaleDateString();

/** Which confirmation the user is being asked for, and on whom. */
type PendingAction =
  | { kind: "add"; target: SuperDuperAdmin }
  | { kind: "promote"; target: TieredSuperAdmin }
  | { kind: "demote"; target: TieredSuperAdmin }
  | { kind: "remove"; target: TieredSuperAdmin };

const TierBadge = ({ tier }: { tier: SuperAdminTier }) =>
  tier === SuperAdminTier.SUPER_DUPER_ADMIN ? (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 whitespace-nowrap">
      {strings.tierSuperDuperAdmin}
    </span>
  ) : (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
      {strings.tierSuperAdmin}
    </span>
  );

/**
 * Management surface for the whole super-admin tier, rendered as the
 * "Super Admins" tab inside User Management (next to Organizations). Only
 * super duper admins see it (UserManagement gates the tab on the role; the
 * backing endpoints are gated by the view/edit:super-duper-admins
 * permissions). From here an SDA can:
 *  - add a new super admin (promote any active user into the tier),
 *  - promote a super admin to super duper admin,
 *  - demote a super duper admin back to super admin,
 *  - remove the super admin role again.
 */
export const SuperAdmins: React.FC = () => {
  const currentUser = useSelector((state: RootState) => state.user.user);

  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<SuperDuperAdmin | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");

  const listParams = search ? { search } : undefined;
  const { data: superAdminsData, isLoading: isSuperAdminsLoading } =
    useGetSuperAdminsQuery(listParams);
  const { data: superDuperAdminsData, isLoading: isSuperDuperAdminsLoading } =
    useGetSuperDuperAdminsQuery(listParams);
  const { data: candidatesData, isFetching: isCandidatesFetching } =
    useGetSuperAdminCandidatesQuery(candidateSearch ? { search: candidateSearch } : undefined, {
      skip: !isAddPanelOpen,
    });

  const [promoteSuperAdmin] = usePromoteSuperAdminMutation();
  const [promoteSuperDuperAdmin] = usePromoteSuperDuperAdminMutation();
  const [demoteSuperDuperAdmin] = useDemoteSuperDuperAdminMutation();
  const [removeSuperAdmin] = useRemoveSuperAdminMutation();

  const isLoading = isSuperAdminsLoading || isSuperDuperAdminsLoading;

  // One combined table: super duper admins first, then super admins,
  // newest-first within each tier (both lists arrive newest-first).
  const admins = useMemo<TieredSuperAdmin[]>(
    () => [
      ...(superDuperAdminsData?.data ?? []).map(admin => ({
        ...admin,
        tier: SuperAdminTier.SUPER_DUPER_ADMIN,
      })),
      ...(superAdminsData?.data ?? []).map(admin => ({
        ...admin,
        tier: SuperAdminTier.SUPER_ADMIN,
      })),
    ],
    [superAdminsData, superDuperAdminsData],
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
          await promoteSuperAdmin({ userId: target.id }).unwrap();
          toast.success(strings.addSuccess);
          closeAddPanel();
          break;
        case "promote":
          await promoteSuperDuperAdmin({ userId: target.id }).unwrap();
          toast.success(strings.promoteSuccess);
          break;
        case "demote":
          await demoteSuperDuperAdmin(target.id).unwrap();
          toast.success(strings.demoteSuccess);
          break;
        case "remove":
          await removeSuperAdmin(target.id).unwrap();
          toast.success(strings.removeSuccess);
          break;
      }
    } catch (error: any) {
      const fallback = {
        add: strings.addError,
        promote: strings.promoteError,
        demote: strings.demoteError,
        remove: strings.removeError,
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
          title: strings.addConfirmTitle,
          description: strings.addConfirmDescription(action.target.name),
          label: strings.addSuperAdmin,
          variant: ButtonVariant.PRIMARY,
        };
      case "promote":
        return {
          title: strings.promoteConfirmTitle,
          description: strings.promoteConfirmDescription(action.target.name),
          label: strings.promote,
          variant: ButtonVariant.PRIMARY,
        };
      case "demote":
        return {
          title: strings.demoteConfirmTitle,
          description: strings.demoteConfirmDescription(action.target.name),
          label: strings.demote,
          variant: ButtonVariant.DESTRUCTIVE,
        };
      case "remove":
        return {
          title: strings.removeConfirmTitle,
          description: strings.removeConfirmDescription(action.target.name),
          label: strings.remove,
          variant: ButtonVariant.DESTRUCTIVE,
        };
    }
  };

  const renderRowActions = (admin: TieredSuperAdmin) => {
    const isSelf = admin.id === currentUser?.id;
    // Self-service changes to one's own tier are rejected server-side; don't
    // offer them.
    if (isSelf) return null;

    if (admin.tier === SuperAdminTier.SUPER_DUPER_ADMIN) {
      return (
        <Button
          variant={ButtonVariant.DESTRUCTIVE}
          onClick={() => setPendingAction({ kind: "demote", target: admin })}
          className="px-3 py-1 text-sm"
        >
          {strings.demote}
        </Button>
      );
    }
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => setPendingAction({ kind: "promote", target: admin })}
          className="px-3 py-1 text-sm"
        >
          {strings.promote}
        </Button>
        <Button
          variant={ButtonVariant.DESTRUCTIVE}
          onClick={() => setPendingAction({ kind: "remove", target: admin })}
          className="px-3 py-1 text-sm"
        >
          {strings.remove}
        </Button>
      </div>
    );
  };

  const renderAdminsTable = () => {
    if (isLoading) {
      return <div className="flex justify-center py-16 text-typography-600">{strings.loading}</div>;
    }

    if (admins.length === 0) {
      return (
        <EmptyState
          title={strings.noAdminsFound}
          subtitle={strings.noAdminsSubtitle}
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
            <TableHeader className="py-3 pr-4 font-medium">{strings.tier}</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">{strings.status}</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">{strings.addedOn}</TableHeader>
            <TableHeader className="py-3" />
          </TableRow>
        </TableHead>
        <TableBody>
          {admins.map(admin => {
            const isSelf = admin.id === currentUser?.id;
            return (
              <TableRow
                key={admin.id}
                className="border-b border-border-light"
                data-testid="sa-row"
              >
                <TableCell className="py-3 pr-4">
                  {admin.name || admin.email}
                  {isSelf && (
                    <span className="ml-2 text-xs text-typography-600">({strings.you})</span>
                  )}
                </TableCell>
                <TableCell className="py-3 pr-4">{admin.email}</TableCell>
                <TableCell className="py-3 pr-4">
                  <TierBadge tier={admin.tier} />
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <StatusBadge status={admin.status} />
                </TableCell>
                <TableCell className="py-3 pr-4">{formatDate(admin.createdAt)}</TableCell>
                <TableCell className="py-3 text-right">{renderRowActions(admin)}</TableCell>
              </TableRow>
            );
          })}
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
            {strings.addSuperAdmin}
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
                    name="add-super-admin-target"
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
              {strings.addSuperAdmin}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const pendingCopy = pendingAction ? confirmCopy(pendingAction) : null;

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <p className="text-sm text-typography-600 pb-4">{strings.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={strings.searchPlaceholder}
        action={{
          label: strings.addSuperAdmin,
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
