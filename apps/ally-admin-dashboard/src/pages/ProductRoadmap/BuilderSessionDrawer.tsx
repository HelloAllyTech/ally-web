import React from "react";

// Relative, not "@pages/Builder": the same treatment BugsTab gives ../BugHunter. The barrel
// pulls every page into this module graph, and RouteLayout's tests mock "@pages" wholesale.
import { BuilderSession } from "../Builder/BuilderSession";

interface BuilderSessionDrawerProps {
  sessionId: string;
  /** The opening brief, for a session created moments ago. Null on a resume. */
  openingMessage: string | null;
  onClose: () => void;
}

/**
 * The Builder agent, hosted on the roadmap screen.
 *
 * ## Why the real component and not a copy
 *
 * This mounts `pages/Builder/BuilderSession` — the same interview feed, PRD panel, readiness
 * ring, build view and question cards a manager sees on the Builder tab — with `sessionId`
 * passed as a prop instead of read from the route. The same argument as BugsTab: a second
 * rendering of a live agent conversation would drift, and then two screens disagree about what
 * the agent said.
 *
 * ## Why a drawer rather than a navigation
 *
 * Deciding what to build is a roadmap activity. Sending someone to another tab to brief the
 * agent loses the board, the vote totals and the row they were reading, and coming back means
 * re-finding all three. The drawer keeps the opportunity behind it.
 *
 * ## Width
 *
 * Wider than the opportunity drawer (`max-w-5xl` against its `w-[38rem]`): BuilderSession is a
 * two-column layout — transcript beside the PRD document — and squeezed into a reading-width
 * drawer the PRD panel becomes unreadable, which is half of what the manager opened this for.
 */
export const BuilderSessionDrawer: React.FC<BuilderSessionDrawerProps> = ({
  sessionId,
  openingMessage,
  onClose,
}) => (
  /*
    z-[60], not z-50: the opportunity drawer is also a z-50 fixed overlay, and this one opens
    FROM it. Relying on JSX order to stack them is how the agent ends up behind the drawer that
    launched it the first time someone reorders the mounts.

    bg-black/30 on the wrapper and bg-white on the panel — the same two classes the opportunity
    drawer uses. `bg-white` matters: BuilderSession draws no background of its own, so a panel
    without one is transparent, and the agent, the drawer behind it and the board all paint into
    the same pixels.
  */
  <div
    className="fixed inset-0 z-[60] flex justify-end bg-black/30"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    {/*
      stopPropagation on the panel: BuilderSession is full of clickable internals and a portaled
      dialog or two, and a click on any of them bubbling to the wrapper would close the agent
      mid-turn. Same trap the opportunity drawer documents.
    */}
    <aside
      className="bg-white relative flex h-full w-full max-w-5xl flex-col overflow-hidden"
      onClick={event => event.stopPropagation()}
      aria-label="Builder agent"
    >
      <BuilderSession
        sessionId={sessionId}
        openingMessage={openingMessage ?? undefined}
        onClose={onClose}
      />
    </aside>
  </div>
);
