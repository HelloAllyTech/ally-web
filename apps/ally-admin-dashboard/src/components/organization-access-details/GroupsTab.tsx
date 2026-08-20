import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetCohortsQuery,
  useCreateCohortMutation,
  useUpdateCohortMutation,
  useDeleteCohortMutation,
  useGetCohortMembersQuery,
  useMoveCohortMembersMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { Button, DeletePopup, Input, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { Cohort, UNASSIGNED_COHORT_ID } from "@types";

const PAGE_SIZE = 25;

interface GroupsTabProps {
  organizationId?: string;
}

/**
 * Groups tab on an organization's detail page — the same cohort management the
 * tenant's own admin has in the consumer app's Organization Settings.
 *
 * It exists here so support can diagnose and fix "why can't this person see the
 * course?" without impersonating the customer. The backend endpoints are
 * identical; a platform admin simply passes the scope guard unconditionally
 * where a tenant admin is pinned to their own tenant.
 *
 * Two invariants this UI has to keep visible:
 *
 * 1. **Membership is exclusive.** One person, one group, or none. The roster uses
 *    a single-select per row and the backend replaces rather than appends —
 *    multi-select would imply a union of access rules the data model cannot
 *    express.
 * 2. **"Unassigned" is a real group, not an empty state.** Synthesised by the
 *    backend, always present, not renamable or deletable, and targetable by a
 *    content restriction. It is what makes the partition total and auditable.
 */
export const GroupsTab: FC<GroupsTabProps> = ({ organizationId }) => {
  const tenantId = organizationId ?? "";

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data: cohortData, isLoading: cohortsLoading } = useGetCohortsQuery(
    { tenantId },
    { skip: !tenantId },
  );
  const cohorts = cohortData?.data ?? [];
  const realCohorts = cohorts.filter(cohort => !cohort.isUnassignedBucket);

  const { data: memberData, isFetching: membersFetching } = useGetCohortMembersQuery(
    { tenantId, search: search || undefined, limit: PAGE_SIZE, offset },
    { skip: !tenantId },
  );

  const [createCohort] = useCreateCohortMutation();
  const [updateCohort] = useUpdateCohortMutation();
  const [deleteCohort] = useDeleteCohortMutation();
  const [moveMembers] = useMoveCohortMembersMutation();

  const [editing, setEditing] = useState<Cohort | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
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

  const handleSave = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error("Give the group a name");
      return;
    }
    try {
      if (editing) {
        await updateCohort({ tenantId, cohortId: editing.id, name }).unwrap();
        toast.success(`Renamed to “${name}”`);
      } else {
        await createCohort({ tenantId, name }).unwrap();
        toast.success(`Created “${name}”`);
      }
      setEditing(null);
      setIsCreating(false);
      setDraftName("");
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
    setMovingUserId(userId);
    try {
      await moveMembers({ tenantId, userIds: [userId], cohortId }).unwrap();
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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-typography-900">Groups</h3>
              <Tooltip
                label="Groups let this organization give different people different content. A simulation, course or case with no group limit stays visible to everyone in the org — limiting one is always an extra, reversible step."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <p className="text-sm text-typography-600">
              Each person belongs to one group or none. Limit content to groups from the
              Simulations, Courses and Cases tabs.
            </p>
          </div>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={() => {
              setIsCreating(true);
              setEditing(null);
              setDraftName("");
            }}
          >
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
                  </span>
                  {cohort.isUnassignedBucket && (
                    <span className="text-xs text-typography-500">
                      Everyone not placed in a group. Can still be targeted by a content limit.
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <span className="text-sm text-typography-700">
                    {cohort.memberCount} {cohort.memberCount === 1 ? "person" : "people"}
                  </span>
                  {/*
                    No actions on the Unassigned bucket: it is derived from the
                    absence of a membership, so there is nothing to rename or
                    delete. Disabled buttons would imply otherwise.
                  */}
                  {!cohort.isUnassignedBucket && (
                    <>
                      <Button
                        variant={ButtonVariant.TEXT}
                        onClick={() => {
                          setEditing(cohort);
                          setIsCreating(false);
                          setDraftName(cohort.name);
                        }}
                      >
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

            {realCohorts.length === 0 ? (
              <p className="rounded bg-neutral-50 p-4 text-sm text-typography-600">
                This organization has no groups, so everyone in it sees everything it has been
                given. That is the normal state — create a group only when different people need
                different content.
              </p>
            ) : (
              <p className="text-xs text-typography-600">
                {placed} of {totalUsers} people are in a group.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-medium text-typography-900">People</h3>

        <ListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search people"
        />

        {members.length === 0 && !membersFetching ? (
          <p className="rounded bg-neutral-50 p-4 text-sm text-typography-600">
            {search ? "Nobody matches that." : "No people in this organization yet."}
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
                {/*
                  Single-select, because membership is exclusive. A null cohortId
                  maps to the Unassigned sentinel rather than an empty value — an
                  empty control would read as "not set yet" when it is in fact a
                  definite, targetable state.
                */}
                <select
                  value={member.cohortId ?? UNASSIGNED_COHORT_ID}
                  onChange={e => handleMove(member.userId, e.target.value)}
                  disabled={movingUserId === member.userId}
                  aria-label={`Group for ${member.name || member.email}`}
                  className="flex-shrink-0 rounded border border-border-light px-3 py-2 text-sm disabled:opacity-50"
                >
                  {cohortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

      {(isCreating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6">
            <h4 className="mb-4 text-base font-medium text-typography-900">
              {editing ? "Rename group" : "New group"}
            </h4>
            <Input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="e.g. Night shift"
              maxLength={120}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => {
                  setIsCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button variant={ButtonVariant.PRIMARY} onClick={handleSave}>
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*
        Both consequences spelled out. Deleting a group moves its people to
        Unassigned AND widens anything limited to only this group back to
        everyone. The second is the surprising one, and it grants access rather
        than removing it — so it must be stated before the click, not after.
      */}
      {deleting && (
        <DeletePopup
          isOpen
          onClose={() => setDeleting(null)}
          onConfirmDelete={handleDelete}
          title={`Delete “${deleting.name}”?`}
          description={`${deleting.memberCount} ${
            deleting.memberCount === 1 ? "person moves" : "people move"
          } to Unassigned. Anything currently limited to only this group becomes available to everyone in this organization again.`}
          cardData={{ id: deleting.id, title: deleting.name }}
        />
      )}
    </div>
  );
};

export default GroupsTab;
