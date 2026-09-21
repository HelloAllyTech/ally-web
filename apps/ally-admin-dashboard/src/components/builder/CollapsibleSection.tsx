import React, { useState } from "react";

interface CollapsibleSectionProps {
  /** The uppercase label the section already showed. */
  heading: string;
  /**
   * A count or status shown beside the heading, so a collapsed section still
   * says whether it is worth opening. A section that collapses to a bare label
   * makes you open it to find out there was nothing in it.
   */
  meta?: React.ReactNode;
  /**
   * Open on first render. Chosen per section rather than globally: the pull
   * requests are the payoff and should be visible, while a checklist nobody
   * updated is worth a line rather than a panel.
   */
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * One foldable block of the build view.
 *
 * The session screen shows a checklist, a run rail, a transcript of every tool
 * call, the pull requests and a PRD panel, all at full weight at once — which
 * is how a page with real signal in it becomes one nobody reads. Folding is the
 * cheapest fix: nothing is removed, and the parts you are not looking at stop
 * competing with the parts you are.
 *
 * A native `<details>` rather than a hand-rolled toggle: it is keyboard
 * accessible and screen-reader correct without any of the ARIA a div-and-state
 * version would need, and it keeps working if the JavaScript that would have
 * managed the state never runs.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  heading,
  meta,
  defaultOpen = true,
  className = "",
  children,
}) => {
  // Uncontrolled after first render — `open` on <details> is the initial state
  // and the element owns it from there, so a re-render cannot snap a section
  // shut under someone mid-read.
  const [initiallyOpen] = useState(defaultOpen);

  return (
    <details
      open={initiallyOpen}
      className={`group border-t border-neutral-200 ${className}`.trim()}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-neutral-50">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block text-typography-400 transition-transform group-open:rotate-90"
          >
            ›
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-typography-500">
            {heading}
          </span>
        </span>
        {meta ? <span className="text-xs text-typography-500">{meta}</span> : null}
      </summary>
      <div className="px-4 pb-3">{children}</div>
    </details>
  );
};
