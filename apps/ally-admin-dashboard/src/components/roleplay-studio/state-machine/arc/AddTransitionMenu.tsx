import React, { useEffect, useRef, useState } from "react";

import { IconButton } from "@ally-ui-mono/ui-shared";
import { Add } from "@assets";
import { en } from "@constants";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

/**
 * Small "add a transition from this state" control: an icon trigger that opens
 * an inline popover listing every other state (in arc order) as a target,
 * annotated forward / back / skip. Picking one hands (fromId, targetId) up so
 * the caller can create the transition and open the guard editor. Closes on
 * outside-click / Escape (the task-search popover pattern; no Carbon menu, to
 * dodge portal/z-index fights with the fixed side panels).
 */
export const AddTransitionMenu: React.FC<{
  fromIndex: number;
  targets: Array<{ state: RoleplayStateNode; index: number }>;
  onPick: (toStateId: string) => void;
}> = ({ fromIndex, targets, onPick }) => {
  const strings = en.roleplayStudio.stateMachine;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const annotate = (index: number): string => {
    if (index === fromIndex) return `· ${strings.loopsOn}`;
    if (index < fromIndex) return "· ←";
    if (index > fromIndex + 1) return "· ⇥";
    return "";
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton
        label={strings.addTransitionFrom}
        kind="ghost"
        size="sm"
        align="bottom"
        onClick={() => setOpen(value => !value)}
      >
        <Add />
      </IconButton>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border-light bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-xs font-medium text-typography-500">
            {strings.addTransition}
          </p>
          {targets.map(({ state, index }) => (
            <button
              key={state.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-typography-800 hover:bg-neutral-100"
              onClick={() => {
                onPick(state.id);
                setOpen(false);
              }}
            >
              <span className="truncate">{state.name || state.id}</span>
              <span className="shrink-0 text-xs text-typography-400">{annotate(index)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
