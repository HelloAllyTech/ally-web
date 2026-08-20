import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useGetOrgCohortsQuery,
  useCreateOrgCohortMutation,
  useUpdateOrgCohortMutation,
  useDeleteOrgCohortMutation,
  useGetOrgCohortMembersQuery,
  useMoveOrgCohortMembersMutation,
} from "@api";
import { SearchIcon } from "@assets";
import {
  ActionDialog,
  Button,
  ButtonVariant,
  ConfirmationDialog,
  Dropdown,
  Input,
} from "@components";
import { useDebounce } from "@hooks";
import { Cohort, UNASSIGNED_COHORT_ID } from "@types";

const PAGE_SIZE = 25;

/**
 * Groups tab — a tenant admin's own grouping of their people, and the roster
 * that puts people into them.
 *
 * Two decisions worth knowing before changing anything here:
 *
 * 1. **Membership is exclusive.** A person is in exactly one group, or in none.
 *    The roster therefore uses a single-select dropdown per row, never
 *    checkboxes, and the backend replaces rather than appends. Presenting this
 *    as multi-select would imply a union of access rules that the data model
 *    deliberately cannot express.
 *
 * 2. **"Unassigned" is a real group, not an empty state.** It is synthesised by
 *    the backend, always present, cannot be renamed or deleted, and *can* be
 *    targeted by a content restriction. It is what makes the partition total and
 *    visible: an admin who has placed everyone sees "Unassigned 0" rather than
 *    having to work out whether anyone is missing.
 *
 * Named "Groups" in the UI while the code says cohort — "group" is what an org
 * admin calls this, but `groups`/`user_groups` are already RBAC roles in the
 * backend, so the code had to pick a word that could not be confused with them.
 */
export const OrgCohortsAccess: FC = () => {
  const { data: ownTenant } = useGetOwnTenantQuery();
  const tenantId = ownTenant?.id ?? "";

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebounce((value: string) => setSearch(value), 300);

  // Reset paging on any change of the query, or "Load more" would append a page
  // computed against the previous filter.
  useEffect(() => {
    setOffset(0);
  }, [search, cohortFilter]);

  const { data: cohortData, isLoading: cohortsLoading } = useGetOrgCohortsQuery(
    { tenantId },
    { skip: !tenantId },
  );
  const cohorts = cohortData?.data ?? [];
  const realCohorts = cohorts.filter(cohort => !cohort.isUnassignedBucket);

  const { data: memberData, isFetching: membersFetching } = useGetOrgCohortMembersQuery(
    {
      tenantId,
      search: search || undefined,
      cohortId: cohortFilter || undefined,
      limit: PAGE_SIZE,
      offset,
    },
    { skip: !tenantId },
  );

  const [createCohort] = useCreateOrgCohortMutation();
  const [updateCohort] = useUpdateOrgCohortMutation();
  const [deleteCohort] = useDeleteOrgCohortMutation();
  const [moveMembers] = useMoveOrgCohortMembersMutation();

  const [editing, setEditing] = useState<Cohort | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [deleting, setDeleting] = useState<Cohort | null>(null);
  const [movingUserId, setMovingUserId] = useState<number | null>(null);

  const placed = realCohorts.reduce((sum, cohort) => sum + cohort.memberCount, 0);
  const totalUsers = cohortData?.totalUsers ?? 0;

  const cohortOptions = useMemo(
    () => [
      { label: "Not in a group", value: UNASSIGNED_COHORT_ID },
      ...realCohorts.map(cohort => ({ label: cohort.name, value: cohort.id })),
    ],
    [realCohorts],
  );

  const filterOptions = useMemo(
    () => [{ label: "All people", value: "" }, ...cohortOptions],
    [cohortOptions],
  );

  const openCreate = () => {
    setIsCreating(true);
    setEditing(null);
    setDraftName("");
    setDraftDescription("");
  };

  const openEdit = (cohort: Cohort) => {
    setEditing(cohort);
    setIsCreating(false);
    setDraftName(cohort.name);
    setDraftDescription(cohort.description ?? "");
  };

  const closeDialog = () => {
    setIsCreating(false);
    setEditing(null);
  };

  const handleSaveCohort = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error("Give the group a name");
      return;
    }
    try {
      if (editing) {
        await updateCohort({
          tenantId,
          cohortId: editing.id,
          name,
          description: draftDescription,
        }).unwrap();
        toast.success(`Renamed to “${name}”`);
      } else {
        await createCohort({ tenantId, name, description: draftDescription }).unwrap();
        toast.success(`Created “${name}”`);
      }
      closeDialog();
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not save the group");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCohort({ tenantId, cohortId: deleting.id }).unwrap();
      toast.success(`Deleted “${deleting.name}”`);
      setDeleting(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not delete the group");
    }
  };

  const handleMove = async (userId: number, cohortId: string) => {
    // The shared Dropdown declares `disableClearable` but does not implement it,
    // so its clear affordance can still emit "". Treat that as Unassigned rather
    // than passing it through: "no group" is exactly what clearing means here,
    // and "" would reach the backend as a cohort id and 404.
    const destination = cohortId || UNASSIGNED_COHORT_ID;

    setMovingUserId(userId);
    try {
      await moveMembers({ tenantId, userIds: [userId], cohortId: destination }).unwrap();
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not move this person");
    } finally {
      setMovingUserId(null);
    }
  };

  const members = memberData?.data ?? [];
  const memberCount = memberData?.count ?? 0;
  const hasMore = members.length > 0 && offset + members.length < memberCount;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8 font-primary">
      {/* ---- Groups ---- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-lg font-medium text-typography-900">Groups</h2>
            <p className="text-sm text-typography-600">
              Organise your people, then limit individual simulations, courses or cases to the
              groups that need them. Anything you don’t limit stays available to everyone.
            </p>
          </div>
          <Button variant={ButtonVariant.PRIMARY} onClick={openCreate}>
            New group
          </Button>
        </div>

        {cohortsLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map(i => (
              <div key={i} className="h-14 animate-pulse rounded border border-border-light" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cohorts.map(cohort => (
              <div
                key={cohort.id}
                className="flex items-center justify-between gap-4 rounded border border-border-light p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-typography-900">
                    {cohort.name}
                    {cohort.isUnassignedBucket && (
                      <span className="ml-2 text-xs font-normal text-typography-500">
                        People you haven’t put in a group yet
                      </span>
                    )}
                  </span>
                  {cohort.description && (
                    <span className="truncate text-xs text-typography-600">
                      {cohort.description}
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <span className="text-sm text-typography-700">
                    {cohort.memberCount} {cohort.memberCount === 1 ? "person" : "people"}
                  </span>
                  {/*
                    The Unassigned bucket has no actions: it is derived from the
                    absence of a membership, so there is nothing to rename and
                    nothing to delete. Rendering disabled buttons instead would
                    imply the operations exist and are merely blocked.
                  */}
                  {!cohort.isUnassignedBucket && (
                    <>
                      <Button variant={ButtonVariant.TEXT} onClick={() => openEdit(cohort)}>
                        Rename
                      </Button>
                      <Button variant={ButtonVariant.TEXT} onClick={() => setDeleting(cohort)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {realCohorts.length === 0 && (
              <p className="rounded bg-neutral-50 p-4 text-sm text-typography-600">
                You haven’t created any groups yet, so everyone in your organization sees everything
                you’ve enabled. Create a group when you want to give different people different
                content.
              </p>
            )}

            {realCohorts.length > 0 && (
              <p className="text-xs text-typography-600">
                {placed} of {totalUsers} people are in a group.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---- People ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-typography-900">People</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-500">
              <SearchIcon />
            </span>
            <Input
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                debouncedSearch(e.target.value);
              }}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
          <Dropdown
            value={cohortFilter}
            options={filterOptions}
            onChange={setCohortFilter}
            minWidth={180}
            disableClearable
          />
        </div>

        {members.length === 0 && !membersFetching ? (
          <p className="rounded bg-neutral-50 p-4 text-sm text-typography-600">
            {search || cohortFilter
              ? "Nobody matches that."
              : "No people in your organization yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map(member => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-4 rounded border border-border-light p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-typography-900">
                    {member.name || member.email}
                  </span>
                  <span className="truncate text-xs text-typography-600">{member.email}</span>
                </div>
                <div
                  className={`flex-shrink-0 ${
                    movingUserId === member.userId ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {/*
                    Single-select, because membership is exclusive. `cohortId`
                    is null for someone in no group, which maps to the
                    Unassigned sentinel rather than to an empty value — an empty
                    dropdown would read as "not set yet" when it is in fact a
                    definite, targetable state.
                  */}
                  <Dropdown
                    value={member.cohortId ?? UNASSIGNED_COHORT_ID}
                    options={cohortOptions}
                    onChange={value => handleMove(member.userId, value)}
                    minWidth={180}
                    disableClearable
                  />
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
                disabled={membersFetching}
                className="mt-1 self-center text-sm font-medium text-primary-500 disabled:opacity-50"
              >
                {membersFetching ? "Loading..." : "+ Load more"}
              </button>
            )}
          </div>
        )}
      </section>

      <ActionDialog
        open={isCreating || !!editing}
        onClose={closeDialog}
        title={editing ? "Rename group" : "New group"}
        showPrimaryButton={false}
        showSecondaryButton={false}
      >
        <div className="flex flex-col gap-4 font-primary">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-typography-700">Name</span>
            <Input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="e.g. Night shift"
              maxLength={120}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-typography-700">Description (optional)</span>
            <Input
              value={draftDescription}
              onChange={e => setDraftDescription(e.target.value)}
              placeholder="Who belongs in this group"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button variant={ButtonVariant.SECONDARY} onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={handleSaveCohort}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </ActionDialog>

      {/*
        Spell out both consequences. Deleting a group is not just a tidy-up: it
        moves its people to Unassigned AND widens anything that was limited to
        only this group back to everyone. The second effect is the surprising
        one, and it is the direction that grants access rather than removing it.
      */}
      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title={{ normal: "Delete", italic: deleting?.name ?? "" }}
        content={
          deleting
            ? `${deleting.memberCount} ${
                deleting.memberCount === 1 ? "person moves" : "people move"
              } to Unassigned. Anything currently limited to only this group becomes available to everyone in your organization again.`
            : ""
        }
        buttonText="Delete group"
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={handleDelete}
        secondaryButtonText="Cancel"
        secondaryButtonVariant={ButtonVariant.SECONDARY}
        onSecondaryButtonClick={() => setDeleting(null)}
      />
    </div>
  );
};

export default OrgCohortsAccess;
