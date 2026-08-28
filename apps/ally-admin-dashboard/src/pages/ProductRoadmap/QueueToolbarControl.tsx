import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";

import type { IconProps } from "@icons";
import { BackArrowIcon } from "@icons";

export interface QueueToolbarControlProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Thin-line glyph shown while collapsed. */
  icon: React.ComponentType<IconProps>;
  /** What the control is, e.g. "Sort the queue". Carries the accessible name. */
  label: string;
  /**
   * The control's CURRENT setting in words, e.g. "Top rank first" or "3 of 7 goals".
   *
   * Load-bearing rather than decorative. Collapsed to a glyph, the control shows what it IS but
   * not what it is SET TO, and a filter you cannot read is how a queue ends up looking empty for
   * no visible reason. This is the tooltip and half the accessible name, so the setting is one
   * hover — or one screen-reader stop — away without expanding anything.
   */
  summary: string;
  /**
   * Whether the collapsed trigger flags itself as non-default:
   *   a number — that many options are selected out of more than that (a narrowed facet);
   *   true     — modified, but with no count worth printing (a non-default sort);
   *   null     — at its default, so nothing is drawn.
   *
   * Colour is NOT the signal — the badge is a shape that is either present or absent, and the
   * summary says the same thing in words for anyone who cannot see it.
   */
  indicator: number | true | null;
  /** The expanded control. */
  children: React.ReactNode;
}

/**
 * One slot in the Queue toolbar: a glyph that expands in place into its own control.
 *
 * The toolbar had three controls open at once — a sort disclosure and two 240px Carbon
 * multi-selects — which is most of a row spent on settings that a given visit usually does not
 * change. Collapsed, each is a glyph; expanded, it is the full control with a back arrow to put
 * it away.
 *
 * EXPANDING ONE COLLAPSES THE OTHERS. That is the parent's job (it holds a single `openControl`
 * rather than three booleans), and it is the point: three controls expanded at once is the row
 * this replaced. The trade is that switching from one to another costs a collapse — which is why
 * the trigger carries its setting in a tooltip, so comparing two of them rarely needs opening
 * either.
 *
 * The slot keeps its POSITION in both states: the expanded control renders where its glyph was,
 * so the two neighbours do not shuffle sideways when one opens.
 */
export const QueueToolbarControl: React.FC<QueueToolbarControlProps> = ({
  isOpen,
  onOpen,
  onClose,
  icon: Icon,
  label,
  summary,
  indicator,
  children,
}) => {
  if (isOpen) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Back, not a close X: this returns the control to the glyph it came from rather than
            dismissing an overlay, and nothing is discarded by pressing it. */}
        <Tooltip label={`Collapse ${label.toLowerCase()}`} align="bottom">
          <button
            type="button"
            aria-label={`Collapse ${label.toLowerCase()}`}
            aria-expanded
            onClick={onClose}
            className="text-typography-700 hover:text-typography-900 hover:bg-background-secondary inline-flex shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors"
          >
            <BackArrowIcon size={16} />
          </button>
        </Tooltip>
        {children}
      </div>
    );
  }

  return (
    <Tooltip label={`${label} — ${summary}`} align="bottom">
      <button
        type="button"
        // Both halves in the name: what it opens AND what it is currently set to. An icon-only
        // trigger whose name is just "Sort the queue" tells a screen-reader user nothing about
        // the order they are reading.
        aria-label={`${label} — ${summary}`}
        aria-expanded={false}
        onClick={onOpen}
        className="text-typography-700 hover:text-typography-900 hover:bg-background-secondary relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors"
      >
        <Icon size={20} />
        {indicator !== null && (
          <span
            aria-hidden
            className={
              indicator === true
                ? "bg-primary-500 absolute top-0 right-0 h-1.5 w-1.5 rounded-full"
                : // text-white, NOT text-typography-white. The typography scale in
                  // tailwind.config.js is numeric — 50…900 plus Default — with no `white` key, so
                  // that class emits nothing and the count INHERITS the trigger's
                  // text-typography-700: near-black on a primary-500 disc, which fails contrast
                  // and reads as a rendering fault.
                  "bg-primary-500 absolute -top-0.5 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium text-white tabular-nums"
            }
          >
            {indicator === true ? "" : indicator}
          </span>
        )}
      </button>
    </Tooltip>
  );
};
