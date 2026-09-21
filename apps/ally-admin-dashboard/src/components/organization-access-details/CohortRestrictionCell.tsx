import { FC, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { useSetCohortRestrictionsMutation } from "@api";
import { Close } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { Cohort, CohortContentType, UNASSIGNED_COHORT_ID } from "@types";

interface CohortRestrictionCellProps {
  tenantId: string;
  contentType: CohortContentType;
  /** Stringified content id — integer for simulations, uuid for courses/cases. */
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
 * The per-row "who can see this" control on the organization content tabs — the
 * same control the tenant's own admin has in the consumer app's Organization
 * Settings, so support can answer "why can't this person see the course?"
 * without impersonating the customer.
 *
 * Deliberately a port of the helpline cell rather than a shared component: the
 * two apps share no component library for this layer, and the copy differs
 * ("your organization" vs "this organization") because the reader is a platform
 * admin looking at someone else's tenant.
 *
 * Reads as **Everyone** when unrestricted, which is the honest description of
 * the default and the state a tenant that never touches groups stays in
 * forever. Only once an admin narrows it does the label become a count, so the
 * control never implies work is outstanding.
 *
 * Saving an empty selection is a real, reachable action — it clears the
 * restriction and returns the item to Everyone. That is deliberate: the same
 * control that narrows access has to be the one that widens it again, or
 * restricting something becomes a decision an admin cannot walk back.
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
  const [setRestrictions, { isLoading }] = useSetCohortRestrictionsMutation();

  // Re-seed whenever the dialog opens, so a cancelled edit does not leak into
  // the next one and a change made elsewhere is picked up.
  useEffect(() => {
    if (isOpen) setSelected(restrictedTo);
  }, [isOpen, restrictedTo]);

  const label = useMemo(() => {
    if (restrictedTo.length === 0) return en.userManagement.cohortRestrictionEveryone;
    if (restrictedTo.length === 1) {
      const only = cohorts.find(cohort => cohort.id === restrictedTo[0]);
      return only ? only.name : en.userManagement.cohortRestrictionOneGroup;
    }
    return en.userManagement.cohortRestrictionCount(restrictedTo.length);
  }, [restrictedTo, cohorts]);

  const isRestricted = restrictedTo.length > 0;

  const totalPeople = useMemo(
    () => cohorts.reduce((sum, cohort) => sum + cohort.memberCount, 0),
    [cohorts],
  );

  // The count of people who would still see this item, shown while editing so a
  // narrowing decision is made against its actual blast radius rather than
  // against a list of group names.
  const reachCount = useMemo(() => {
    if (selected.length === 0) return totalPeople;
    return cohorts
      .filter(cohort => selected.includes(cohort.id))
      .reduce((sum, cohort) => sum + cohort.memberCount, 0);
  }, [selected, cohorts, totalPeople]);

  const toggle = (cohortId: string) =>
    setSelected(prev =>
      prev.includes(cohortId) ? prev.filter(id => id !== cohortId) : [...prev, cohortId],
    );

  const handleSave = async () => {
    try {
      await setRestrictions({ tenantId, contentType, contentId, cohortIds: selected }).unwrap();
      toast.success(
        selected.length === 0
          ? en.userManagement.cohortRestrictionCleared(contentTitle)
          : en.userManagement.cohortRestrictionSaved(contentTitle, selected.length),
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || en.userManagement.cohortRestrictionFailed);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={en.userManagement.cohortRestrictionAria(contentTitle)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          isRestricted
            ? "border-primary-500 bg-primary-50 text-primary-600"
            : "border-border-light text-typography-600 hover:border-border"
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative mx-4 w-full max-w-md bg-white px-[32px] py-[24px] font-primary text-typography-900 shadow-xl">
            <button
              onClick={() => setIsOpen(false)}
              aria-label={en.common.close}
              className="absolute top-[8px] right-[8px] text-typography-600 transition-colors hover:text-typography-800"
            >
              <Close width={24} height={24} />
            </button>

            <h2 className="mb-2 text-lg font-medium">
              {en.userManagement.cohortRestrictionTitle(contentTitle)}
            </h2>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-typography-600">
                {en.userManagement.cohortRestrictionHint}
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
                          {en.userManagement.cohortRestrictionUnassignedHint}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-typography-500">
                      {en.userManagement.peopleCount(cohort.memberCount)}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-sm text-typography-700">
                {selected.length === 0
                  ? en.userManagement.cohortRestrictionReachAll(totalPeople)
                  : en.userManagement.cohortRestrictionReach(reachCount, totalPeople)}
              </p>

              {/*
                Anyone already part-way through keeps their access — worth saying
                here rather than only in the docs, because it is the first thing
                an admin worries about when narrowing a course mid-programme.
                Simulations get no such grace, so the note would be a lie there.
              */}
              {selected.length > 0 && contentType !== "scenario" && (
                <p className="rounded bg-neutral-50 p-3 text-xs text-typography-600">
                  {en.userManagement.cohortRestrictionGraceNote}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant={ButtonVariant.SECONDARY} onClick={() => setIsOpen(false)}>
                  {en.common.cancel}
                </Button>
                <Button variant={ButtonVariant.PRIMARY} onClick={handleSave} disabled={isLoading}>
                  {isLoading ? en.common.saving : en.common.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
