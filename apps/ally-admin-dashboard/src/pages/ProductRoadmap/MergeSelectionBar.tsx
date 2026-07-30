import React from "react";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";

interface MergeSelectionBarProps {
  count: number;
  onClear: () => void;
  onMerge: () => void;
}

/**
 * Fixed bar shown while opportunities are ticked for merging.
 *
 * A bar rather than a toolbar button because the selection spans rows the user has to scroll
 * through — the affordance has to stay reachable while they keep picking duplicates.
 *
 * Merging needs at least two, so the action stays disabled at one and says why.
 *
 * The actions sit on the LEFT, next to the count, rather than in the usual bottom-right corner.
 * `sonner` renders toasts bottom-right, and split/merge both fire one — so a right-aligned primary
 * button spends several seconds hidden underneath the very toast confirming the previous action,
 * exactly when someone is merging duplicates one after another.
 */
export const MergeSelectionBar: React.FC<MergeSelectionBarProps> = ({
  count,
  onClear,
  onMerge,
}) => {
  if (count === 0) return null;

  return (
    <div className="border-border-light bg-white fixed inset-x-0 bottom-0 z-40 border-t px-6 py-3 shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-typography-primary text-sm">
          {count} selected
          {count === 1 && (
            <span className="text-typography-secondary"> — pick at least one more to merge</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button variant={ButtonVariant.PRIMARY} onClick={onMerge} disabled={count < 2}>
            Merge {count} into 1
          </Button>
          <Button variant={ButtonVariant.SECONDARY} onClick={onClear}>
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  );
};
