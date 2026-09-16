import React, { useState } from "react";

interface CollapsibleAsideProps {
  /** Shown on the collapsed rail, and on the control that collapses it. */
  label: string;
  /**
   * Where the open/closed choice is remembered, so it survives a reload and a
   * navigation between sessions. Per viewer and per browser by design — this
   * is a reading preference, not session state.
   */
  storageKey: string;
  /** Width classes for the open panel; the collapsed rail is always narrow. */
  widthClassName: string;
  children: React.ReactNode;
}

/**
 * A side panel that can be folded down to a rail.
 *
 * Written for the PRD beside a running build. Once a build exists the document
 * is frozen reference — worth having within reach, not worth 38% of the window
 * for the whole time you are reading a transcript. Folding gives that width
 * back to the thing actually changing, without making the document something
 * you have to navigate away to find.
 *
 * Distinct from {@link CollapsibleSection}, which folds a block in a stack and
 * uses a native `<details>`. A `<details>` cannot express this: the collapsed
 * state here is a rail of its own, laid out beside its sibling rather than
 * above it.
 *
 * Read lazily and in a try/catch: storage throws in a private window and
 * returns nothing after a clear, and a preference is never worth a blank page.
 */
export const CollapsibleAside: React.FC<CollapsibleAsideProps> = ({
  label,
  storageKey,
  widthClassName,
  children,
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(storageKey) !== "collapsed";
    } catch {
      return true;
    }
  });

  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(storageKey, next ? "open" : "collapsed");
    } catch {
      // A preference that cannot be saved is still a preference for this view.
    }
  };

  if (!open) {
    return (
      <aside className="hidden w-10 shrink-0 flex-col border-l border-neutral-200 lg:flex">
        <button
          type="button"
          onClick={() => toggle(true)}
          aria-expanded={false}
          title={`Show ${label}`}
          className="flex h-full w-full cursor-pointer flex-col items-center gap-2 py-3 hover:bg-neutral-50"
        >
          <span aria-hidden className="text-typography-400">
            ‹
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-wide text-typography-500"
            style={{ writingMode: "vertical-rl" }}
          >
            {label}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={`hidden flex-col border-l border-neutral-200 lg:flex ${widthClassName}`}>
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-typography-500">
          {label}
        </span>
        <button
          type="button"
          onClick={() => toggle(false)}
          aria-expanded
          title={`Hide ${label}`}
          className="cursor-pointer px-1 text-typography-400 hover:text-typography-700"
        >
          ›
        </button>
      </div>
      {children}
    </aside>
  );
};
