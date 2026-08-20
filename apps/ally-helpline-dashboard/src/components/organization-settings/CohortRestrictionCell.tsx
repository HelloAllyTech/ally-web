import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { useSetOrgCohortRestrictionsMutation } from "@api";
import { ActionDialog, Button, ButtonVariant } from "@components";
import { Cohort, CohortContentType, UNASSIGNED_COHORT_ID } from "@types";

interface CohortRestrictionCellProps {
  tenantId: string;
  contentType: CohortContentType;
  /** Stringified content id — integer for scenarios, uuid for courses/cases. */
  contentId: string;
  contentTitle: string;
  /** Every cohort in the tenant, including the synthesised Unassigned bucket. */
  cohorts: Cohort[];
  /**
   * Cohorts this item is currently restricted to. **Empty means unrestricted —
   * visible to everyone in the org** — because a restriction row's absence is
   * the tenant-wide default, not a missing value.
   */
  restrictedTo: string[];
}

/**
 * The per-row "who can see this" control on the content tabs.
 *
 * Reads as **Everyone** when unrestricted, which is the honest description of
 * the default and the state a tenant that never touches cohorts stays in
 * forever. Only once an admin narrows it does the label become a count, so the
 * control never implies work is outstanding.
 *
 * Saving an empty selection is a real, reachable action — it clears the
 * restriction and returns the item to Everyone. That is deliberate: the same
 * control that narrows access has to be the one that widens it again, or
 * restricting something becomes a decision an admin cannot walk back without
 * support.
 */
export const CohortRestrictionCell: FC<CohortRestrictionCellProps> = ({
  tenantId,
  contentType,
  contentId,
  contentTitle,
  cohorts,
  restrictedTo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(restrictedTo);
  const [setRestrictions, { isLoading }] = useSetOrgCohortRestrictionsMutation();

  // Re-seed whenever the dialog opens, so a cancelled edit does not leak into
  // the next one and a change made elsewhere is picked up.
  useEffect(() => {
    if (isOpen) setSelected(restrictedTo);
  }, [isOpen, restrictedTo]);

  const label = useMemo(() => {
    if (restrictedTo.length === 0) return "Everyone";
    if (restrictedTo.length === 1) {
      const only = cohorts.find(cohort => cohort.id === restrictedTo[0]);
      return only ? only.name : "1 group";
    }
    return `${restrictedTo.length} groups`;
  }, [restrictedTo, cohorts]);

  const isRestricted = restrictedTo.length > 0;

  const toggle = (cohortId: string) =>
    setSelected(prev =>
      prev.includes(cohortId) ? prev.filter(id => id !== cohortId) : [...prev, cohortId],
    );

  const handleSave = async () => {
    try {
      await setRestrictions({ tenantId, contentType, contentId, cohortIds: selected }).unwrap();
      toast.success(
        selected.length === 0
          ? `“${contentTitle}” is now visible to everyone`
          : `“${contentTitle}” is now limited to ${selected.length} group(s)`,
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update access");
    }
  };

  // The count of people who would lose sight of this item, shown while editing
  // so a narrowing decision is made against its actual blast radius rather than
  // against a list of group names.
  const reachCount = useMemo(() => {
    if (selected.length === 0) {
      return cohorts.reduce((sum, cohort) => sum + cohort.memberCount, 0);
    }
    return cohorts
      .filter(cohort => selected.includes(cohort.id))
      .reduce((sum, cohort) => sum + cohort.memberCount, 0);
  }, [selected, cohorts]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Change who can see ${contentTitle}`}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          isRestricted
            ? "border-primary-500 bg-primary-50 text-primary-600"
            : "border-border-light text-typography-600 hover:border-border"
        }`}
      >
        {label}
      </button>

      <ActionDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Who can see “${contentTitle}”?`}
        showPrimaryButton={false}
        showSecondaryButton={false}
      >
        <div className="flex flex-col gap-4 font-primary">
          <p className="text-sm text-typography-600">
            Leave every group unchecked to keep this available to everyone in your organization.
          </p>

          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {cohorts.map(cohort => (
              <label
                key={cohort.id}
                className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(cohort.id)}
                  onChange={() => toggle(cohort.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-sm text-typography-900">
                  {cohort.name}
                  {cohort.id === UNASSIGNED_COHORT_ID && (
                    <span className="ml-2 text-xs text-typography-500">
                      (people not in any group)
                    </span>
                  )}
                </span>
                <span className="text-xs text-typography-500">
                  {cohort.memberCount} {cohort.memberCount === 1 ? "person" : "people"}
                </span>
              </label>
            ))}
          </div>

          <p className="text-sm text-typography-700">
            {selected.length === 0
              ? `Visible to everyone — all ${reachCount} people in your organization.`
              : `Visible to ${reachCount} of ${cohorts.reduce(
                  (sum, cohort) => sum + cohort.memberCount,
                  0,
                )} people.`}
          </p>

          {/*
            Anyone already part-way through keeps their access — worth saying
            here rather than only in the docs, because it is the first thing an
            admin worries about when narrowing a course mid-programme.
          */}
          {selected.length > 0 && contentType !== "scenario" && (
            <p className="rounded bg-neutral-50 p-3 text-xs text-typography-600">
              People who have already started this will keep access until they finish. New starts
              are limited to the groups above.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant={ButtonVariant.SECONDARY} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </ActionDialog>
    </>
  );
};

export default CohortRestrictionCell;
